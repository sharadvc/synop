import { NextResponse } from 'next/server';
import { z } from 'zod';
import { extractVideoId, getTranscript } from '@/lib/youtube';
import { db } from '@/lib/db';
export const maxDuration = 120;

const summarySchema = z.object({
  executiveSummary: z.string(),
  quotes: z.array(z.string()),
  resources: z.array(z.string()),
  biasAnalysis: z.array(z.string()).optional(),
  frameworks: z.array(z.object({ name: z.string(), description: z.string() })).optional(),
  entities: z.array(z.object({ type: z.string(), name: z.string() })).optional(),
  mindMap: z.string().optional(),
  verdict: z.string(),
});

/** Read the Phase 2 fields off a stored Summary row (JSON strings -> objects). */
function phase2FromSummary(s: any) {
  const parse = (raw: string | null) => {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  };
  return {
    signalDensity: parse(s.signalDensity),
    topicClusters: parse(s.topicClusters),
    debateMatrix: parse(s.debateMatrix),
    freshness: parse(s.freshness),
    entityGraph: parse(s.entityGraph),
  };
}

const MODELS = [
  "google/gemma-4-26b-a4b-it:free",
  "openai/gpt-oss-20b:free",
  "google/gemma-4-31b-it:free",
];

function buildSummaryPrompt(language: string = 'English', customPrompt?: string) {
  const baseInstructions = `You are a council of specialized AI Data Miners working to generate an EXHAUSTIVE "Mega-Dossier" from a raw transcript. You are strictly forbidden from writing generic, high-level, or superficial summaries. You must extract every single specific statistic, historical anecdote, debate point, logical framework, and nuance mentioned in the text. Leave absolutely nothing behind.`;
  const customInstructions = customPrompt ? `\n\nUSER'S CUSTOM INSTRUCTION:\n${customPrompt}\nYou MUST follow this custom instruction while maintaining the strict JSON schema below.` : '';
  
  return `${baseInstructions}${customInstructions}

CRITICAL LANGUAGE RULE:
- You MUST write ALL output text in ${language}. Every single field value in the JSON MUST be written in ${language}.
- Even if the transcript is in a different language, translate and write all analysis in ${language}.
- The only exception is direct quotes ("quotes" field) — keep them in their original language, but add a ${language} translation in parentheses if the original is not in ${language}.

RULES:
1. NO SURFACE LEVEL FLUFF. DO NOT summarize generally. You must dig into exact methodologies, underlying assumptions, logical fallacies, and deep logic. Mention the specific numbers, names, and examples the speaker uses.
2. EXHAUSTIVE EXTRACTION. If the video is 2 hours long, your output should be incredibly dense and long. 
3. YOU MUST RETURN ONLY VALID JSON MATCHING THE EXACT SCHEMA PROVIDED. NO MARKDOWN. NO CODE BLOCKS.
4. ALL output MUST be in ${language}.

THE PIPELINE:
- [The Synthesizer] -> "executiveSummary": A massive, dense, multi-paragraph overview capturing the entire thesis, sub-theses, and exact context.
- [The Extractor] -> "quotes": 5-8 verbatim, powerful quotes capturing essence, especially controversial or highly profound statements.
- [The Extractor] -> "resources": Any books, tools, websites, scientific papers, or historical events mentioned.
- [The Critique] -> "biasAnalysis": 3-5 points identifying any underlying biases, logical fallacies, or unproven assumptions the speaker relies on. Challenge the speaker.
- [The Extractor] -> "frameworks": Extract ALL mental models, frameworks, or step-by-step systems discussed (provide "name" and "description").
- [The Extractor] -> "entities": Notable people, companies, or scientific concepts (provide "type" e.g., "Person"/"Company", and "name").
- [The Synthesizer] -> "verdict": A brutal, 1-2 sentence final assessment of the core value provided.

JSON SCHEMA:
{
  "executiveSummary": "...",
  "quotes": ["...", "..."],
  "resources": ["...", "..."],
  "biasAnalysis": ["...", "..."],
  "frameworks": [{"name": "...", "description": "..."}],
  "entities": [{"type": "...", "name": "..."}],
  "verdict": "..."
}`;
}

function extractJson(raw: string): any {
  const trimmed = raw.trim();
  try { return JSON.parse(trimmed); } catch {}

  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) { try { return JSON.parse(codeBlock[1].trim()); } catch {} }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) { try { return JSON.parse(trimmed.slice(start, end + 1)); } catch {} }

  const fixed = trimmed.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']').replace(/([{,])\s*(\w+)\s*:/g, '$1"$2":');
  try { return JSON.parse(fixed); } catch {}

  throw new Error(`Failed to parse AI response. Raw start: ${trimmed.substring(0, 150)}`);
}

async function getVideoMeta(videoId: string) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    if (!res.ok) return null;
    const data = await res.json() as any;
    return {
      title: data.title,
      author_name: data.author_name,
      thumbnail_url: data.thumbnail_url,
    };
  } catch {
    return null;
  }
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

type CustomKeys = {
  gemini?: string | null;
  groq?: string | null;
  openrouter?: string | null;
};

async function callModelWithFallback(transcript: string, keys: CustomKeys, language: string = 'English', customPrompt?: string): Promise<any> {
  const SUMMARY_PROMPT = buildSummaryPrompt(language, customPrompt);
  let lastErr: Error | null = null;
  
  // TIER 1: Gemini 1.5 Flash (1 Million Context Window)
  const geminiKey = keys.gemini || process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      console.log("[AI Pipeline] Attempting Gemini 1.5 Pro (2M Context)...");
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `System Prompt: ${SUMMARY_PROMPT}\n\nUser Request: Parse the following transcript into the exact JSON format requested. Transcript:\n\n${transcript}` }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192
          }
        }),
      });

      if (res.ok) {
        const json = await res.json();
        let content = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (match) {
          content = match[1];
        }
        content = content.trim();
        if (content) return JSON.parse(content);
      } else {
        const err = await res.text();
        console.warn("[AI Pipeline] Gemini failed, falling back to Groq...", err.substring(0, 150));
      }
    } catch (err: any) {
      console.warn("[AI Pipeline] Gemini error:", err.message);
    }
  }

  // TIER 2: Groq Llama-3 (Fallback)
  const groqKey = keys.groq || process.env.GROQ_API_KEY;
  if (groqKey) {
    const groqModels = [
      { id: "llama-3.3-70b-versatile", chars: 14000 }, // ~3.5k tokens + 1k prompt + 1.5k output = 6k TPM (Free Tier limit)
      { id: "llama-3.1-8b-instant", chars: 30000 },    // ~7.5k tokens + 1k prompt + 1.5k output = 10k (30k TPM limit)
    ];

    for (const groqModel of groqModels) {
      try {
        console.log(`[AI Pipeline] Attempting Groq ${groqModel.id}...`);

        const maxChars = groqModel.chars;
        const truncatedTranscript = transcript.length > maxChars 
          ? transcript.slice(0, maxChars) + "\n\n[TRANSCRIPT TRUNCATED DUE TO GROQ RATE LIMITS]" 
          : transcript;

        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: groqModel.id,
            messages: [
              { role: "system", content: SUMMARY_PROMPT },
              { role: "user", content: `Parse the following transcript into the exact JSON format requested. Transcript:\n\n${truncatedTranscript}` },
            ],
            temperature: 0.2, 
            response_format: { type: "json_object" },
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const content = json.choices?.[0]?.message?.content;
          if (content) return JSON.parse(content);
        } else {
          const err = await res.text();
          console.warn(`[AI Pipeline] Groq ${groqModel.id} failed:`, err.substring(0, 150));
          if (res.status === 429) {
             // Rate limit hit. Fallback to the smaller model immediately.
             continue;
          }
        }
      } catch (err: any) {
        console.warn(`[AI Pipeline] Groq ${groqModel.id} error:`, err.message);
      }
    }
  }

  // FALLBACK ENGINE: OpenRouter free models
  for (const model of MODELS) {
    try {
      console.log(`[AI Pipeline] Attempting ${model}...`);
      const openRouterKey = keys.openrouter || process.env.OPENAI_API_KEY;
      if (!openRouterKey) throw new Error("No API keys available for fallback.");

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://youtube-summary-ai.vercel.app",
          "X-Title": "YouTube Summary AI",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SUMMARY_PROMPT },
            { role: "user", content: `Transcript:\n\n${transcript.substring(0, 30000)}` },
          ],
          temperature: 0.2, 
          response_format: { type: "json_object" },
        }),
      });

      if (res.status === 429) {
        await delay(1000);
        continue;
      }
      if (!res.ok) continue;

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content;
      if (!content) continue;

      return extractJson(content);
    } catch (err: any) {
      lastErr = err;
      await delay(500);
    }
  }

  throw lastErr || new Error("All summarization models failed. The transcript might be too complex or rate limits were hit.");
}

export async function POST(req: Request) {
  try {
    // Auth removed at 04d6622 (master-password auth deleted, cookie never set) — muted for local dev.

    const { url, language = 'English', customPrompt } = await req.json();
    if (!url) return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 });

    const videoId = extractVideoId(url);
    if (!videoId) return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });

    // Check if summary already exists locally
    const existingSummary = await db.summary.findFirst({
       where: { videoId, language }
    });

    if (existingSummary) {
       return NextResponse.json({
         videoId,
         meta: { title: existingSummary.title, author_name: existingSummary.channel, thumbnail_url: "" },
         notes: existingSummary.notes || null,
         ...phase2FromSummary(existingSummary),
         summary: {
            executiveSummary: existingSummary.executiveSummary,
            quotes: JSON.parse(existingSummary.quotes),
            resources: JSON.parse(existingSummary.resources),
            biasAnalysis: existingSummary.biasAnalysis ? JSON.parse(existingSummary.biasAnalysis) : undefined,
            frameworks: existingSummary.frameworks ? JSON.parse(existingSummary.frameworks) : undefined,
            entities: existingSummary.entities ? JSON.parse(existingSummary.entities) : undefined,
            verdict: existingSummary.verdict,
         }
       });
    }

    const [meta, transcript] = await Promise.all([
      getVideoMeta(videoId),
      getTranscript(videoId),
    ]);

    let summary = null;
    let aiError: string | null = null;

    if (transcript) {
      try {
        const customKeys = {
          gemini: req.headers.get('x-gemini-key'),
          groq: req.headers.get('x-groq-key'),
          openrouter: req.headers.get('x-openrouter-key'),
        };

        summary = await callModelWithFallback(transcript, customKeys, language, customPrompt);
        summary = summarySchema.parse(summary);

        // Save to DB
        await db.summary.create({
          data: {
            videoId,
            title: meta?.title || "Unknown Title",
            channel: meta?.author_name || "Unknown Channel",
            duration: "TBD",
            executiveSummary: summary.executiveSummary,
            quotes: JSON.stringify(summary.quotes),
            resources: JSON.stringify(summary.resources || []),
            biasAnalysis: JSON.stringify(summary.biasAnalysis || []),
            frameworks: JSON.stringify(summary.frameworks || []),
            entities: JSON.stringify(summary.entities || []),
            mindMap: summary.mindMap || "",
            verdict: summary.verdict || "No verdict provided.",
            transcript: transcript ? transcript.substring(0, 100000) : null,
          }
        });

      } catch (err: any) {
        aiError = err.message;
        console.error("AI generation failed:", err.message);
      }
    }

    return NextResponse.json({
      videoId,
      meta,
      transcript: transcript ? transcript.substring(0, 3000) : null,
      summary,
      notes: null,
      signalDensity: null,
      topicClusters: null,
      debateMatrix: null,
      freshness: null,
      entityGraph: null,
      aiError,
    });

  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to process video' }, { status: 500 });
  }
}
