import { NextResponse } from 'next/server';
import { extractVideoId, getTranscript } from '@/lib/youtube';
import { db } from '@/lib/db';
import { callCustomProvider, resolveCustomProviders, type CustomProvider } from '@/lib/ai';
import { currentUserId, userScope, requireUserId } from '@/lib/user';
export const maxDuration = 120;

/**
 * Tolerant normalizer for the LLM's summary payload. LLMs frequently return
 * single fields in the wrong shape (e.g. biasAnalysis as objects, frameworks
 * missing a field). A strict zod parse would throw and the WHOLE summary would
 * be discarded — this coerces each field to the expected shape and keeps what
 * is valid, so the summary always persists.
 */
function sanitizeSummary(raw: any): any {
  const s = raw || {};
  const asStrings = (v: any): string[] => {
    if (!Array.isArray(v)) return [];
    return v.map(x => (typeof x === 'string' ? x : typeof x?.text === 'string' ? x.text : String(x?.name || x?.content || x || ''))).filter(Boolean);
  };
  return {
    executiveSummary: typeof s.executiveSummary === 'string' ? s.executiveSummary : String(s.executiveSummary ?? ''),
    quotes: asStrings(s.quotes),
    resources: asStrings(s.resources),
    biasAnalysis: asStrings(s.biasAnalysis),
    frameworks: (Array.isArray(s.frameworks) ? s.frameworks : [])
      .map((f: any) => ({ name: String(f?.name ?? ''), description: String(f?.description ?? '') }))
      .filter((f: any) => f.name),
    entities: (Array.isArray(s.entities) ? s.entities : [])
      .map((e: any) => ({ type: String(e?.type ?? 'Entity'), name: String(e?.name ?? '') }))
      .filter((e: any) => e.name),
    mindMap: typeof s.mindMap === 'string' ? s.mindMap : '',
    verdict: typeof s.verdict === 'string' ? s.verdict : String(s.verdict ?? ''),
  };
}

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

function personaDirectives(persona: string): string {
  switch (persona) {
    case 'researcher':
      return `PERSONA: RESEARCH ANALYST (deep-dive mode)
You are producing CITATION-GRADE research material, not casual notes.
- executiveSummary: Write an EXHAUSTIVE, technically dense dossier. Preserve EVERY specific number, statistic, date, price, percentage, named source, methodology, and study. Explicitly flag any claim that would need verification ("[VERIFY: ...]"). Note internal contradictions and unstated assumptions. Depth and precision OVER readability — a researcher should be able to write from your output alone.
- quotes: favor exact, attributable, controversial, or data-carrying statements.
- biasAnalysis: go deeper — 4-6 points, including methodological flaws and what the speaker stands to gain.
- resources: include any named paper, book, dataset, tool, or primary source with as much specificity as given.`;
    case 'student':
      return `PERSONA: STUDY TUTOR (learning mode)
You are turning this into material someone will revise for an exam.
- executiveSummary: Write clear, structured, study-ready notes. Define every key term in simple language right where it appears. Mark exam-relevant material with "KEY POINT:", definitions with "DEFINITION:", and things to memorize with "REMEMBER:". Balance depth with clarity — prioritize understanding and recall over exhaustive detail. End the summary with a short "KEY TAKEAWAYS" list of 3-5 items.
- quotes: favor memorable, quotable explanations that capture a concept simply.
- frameworks: this matters most — extract every framework/step-by-step method clearly; they become flashcards.
- biasAnalysis: keep it fair but shorter (2-3 points), framed as "what to be critical about".
- verdict: state what is worth remembering from this video for study purposes.`;
    case 'creator':
      return `PERSONA: CONTENT RESEARCHER (raw-material mode)
You are prepping material for someone who writes/creates from this.
- executiveSummary: Write a sharp, structured brief that surfaces the strongest angles, most quotable insights, shareable statistics, and useful frameworks — material someone can repurpose. Skip tangential detail; keep what has pull.
- quotes: prioritize the most shareable, provocative, or insightful lines.
- resources: include any tool, book, or reference a creator would link.
- biasAnalysis: 2-3 points useful for framing/balance.
- verdict: state the single most compelling takeaway to lead with.`;
    default:
      return '';
  }
}

function buildSummaryPrompt(language: string = 'English', customPrompt?: string, persona: string = 'general') {
  const baseInstructions = `You are a council of specialized AI Data Miners working to generate an EXHAUSTIVE "Mega-Dossier" from a raw transcript. You are strictly forbidden from writing generic, high-level, or superficial summaries. You must extract every single specific statistic, historical anecdote, debate point, logical framework, and nuance mentioned in the text. Leave absolutely nothing behind.`;
  const customInstructions = customPrompt ? `\n\nUSER'S CUSTOM INSTRUCTION:\n${customPrompt}\nYou MUST follow this custom instruction while maintaining the strict JSON schema below.` : '';
  const personaInstructions = personaDirectives(persona) ? `\n\n${personaDirectives(persona)}` : '';

  return `${baseInstructions}${customInstructions}${personaInstructions}

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
- [The Extractor] -> "entities": Extract ALL specific, concrete entities — named people (REAL names, never "the speaker"/"the host"), companies, products, organizations, countries/cities, scientific terms, studies, and laws. Aim for 6-15 entities. Provide "type" (e.g. "Person"/"Company"/"Product"/"Organization"/"Concept"/"Place") and "name" (the exact proper noun, in its original spelling even if the transcript is another language).
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
  customProviders?: CustomProvider[];
};

async function callModelWithFallback(transcript: string, keys: CustomKeys, language: string = 'English', customPrompt?: string, persona: string = 'general'): Promise<any> {
  const SUMMARY_PROMPT = buildSummaryPrompt(language, customPrompt, persona);
  let lastErr: Error | null = null;

  // TIER 0: user-configured custom providers (BYOK endpoints)
  if (keys.customProviders && keys.customProviders.length > 0) {
    for (const provider of keys.customProviders) {
      for (const model of provider.models) {
        console.log(`[AI Pipeline] Attempting custom ${provider.name}/${model}...`);
        const content = await callCustomProvider(provider, model, SUMMARY_PROMPT, transcript.substring(0, 30000), 0.2, 8192);
        if (content) {
          try { return extractJson(content); } catch { /* malformed JSON → try next */ }
        }
      }
    }
  }

  // TIER 1: OpenRouter free models (the reliable path — validated working).
  const openRouterKey = keys.openrouter || process.env.OPENAI_API_KEY;
  if (openRouterKey) {
    for (const model of MODELS) {
      try {
        console.log(`[AI Pipeline] Attempting ${model}...`);
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
  }

  // TIER 2: Groq Llama-3 (fallback)
  const groqKey = keys.groq || process.env.GROQ_API_KEY;
  if (groqKey) {
    const groqModels = [
      { id: "openai/gpt-oss-120b", chars: 14000 }, // big model — generous context, keep prompt lean
      { id: "openai/gpt-oss-20b", chars: 30000 },  // fast small model — higher rate limits
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
          if (content) return extractJson(content);
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

  // TIER 3: Gemini (only used when a key with quota is available)
  const geminiKey = keys.gemini || process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      console.log("[AI Pipeline] Attempting Gemini 2.0 Flash...");
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `System Prompt: ${SUMMARY_PROMPT}\n\nUser Request: Parse the following transcript into the exact JSON format requested. Transcript:\n\n${transcript}` }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
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
        console.warn("[AI Pipeline] Gemini failed:", err.substring(0, 150));
      }
    } catch (err: any) {
      console.warn("[AI Pipeline] Gemini error:", err.message);
    }
  }

  throw lastErr || new Error("All summarization models failed. The transcript might be too complex or rate limits were hit.");
}

export async function POST(req: Request) {
  try {
    const __uid = await requireUserId(req); if (!__uid) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    // Auth removed at 04d6622 (master-password auth deleted, cookie never set) — muted for local dev.

    const { url, language = 'English', customPrompt, persona = 'general' } = await req.json();
    if (!url) return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 });

    const videoId = extractVideoId(url);
    if (!videoId) return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });

    // Check if a summary already exists for this video + language + persona.
    const existingSummary = await db.summary.findFirst({
       where: { videoId, language, persona, ...(await userScope()) }
    });

    if (existingSummary) {
      const parseList = (raw: string | null): any[] => {
        if (!raw) return [];
        try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; } catch { return []; }
      };
      const parseObj = (raw: string | null): any => {
        if (!raw) return undefined;
        try { return JSON.parse(raw); } catch { return undefined; }
      };
      return NextResponse.json({
         videoId,
         meta: { title: existingSummary.title, author_name: existingSummary.channel, thumbnail_url: "" },
         transcript: existingSummary.transcript ? existingSummary.transcript.substring(0, 3000) : null,
         notes: existingSummary.notes || null,
         ...phase2FromSummary(existingSummary),
         summary: {
            executiveSummary: existingSummary.executiveSummary,
            quotes: parseList(existingSummary.quotes),
            resources: parseList(existingSummary.resources),
            biasAnalysis: parseList(existingSummary.biasAnalysis),
            frameworks: parseObj(existingSummary.frameworks),
            entities: parseObj(existingSummary.entities),
            verdict: existingSummary.verdict,
         }
       });
    }

    // Reuse a stored transcript from any persona's row (transcript is
    // persona-independent) instead of re-fetching from YouTube each time.
    const storedTranscript = await db.summary.findFirst({
      where: { videoId, transcript: { not: null }, ...(await userScope()) },
      select: { transcript: true },
    });

    const [meta, transcript] = storedTranscript?.transcript
      ? [await getVideoMeta(videoId), storedTranscript.transcript as string]
      : await Promise.all([getVideoMeta(videoId), getTranscript(videoId)]);

    let summary = null;
    let aiError: string | null = null;

    if (transcript) {
      try {
        const customKeys = {
          gemini: req.headers.get('x-gemini-key'),
          groq: req.headers.get('x-groq-key'),
          openrouter: req.headers.get('x-openrouter-key'),
          customProviders: resolveCustomProviders(req.headers),
        };

        summary = await callModelWithFallback(transcript, customKeys, language, customPrompt, persona);
        summary = sanitizeSummary(summary);

        // Save to DB (per persona, so each workflow keeps its own tailored version)
        await db.summary.create({
          data: {
            videoId,
            persona,
            userId: await currentUserId(),
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
