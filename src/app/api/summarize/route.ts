import { NextResponse } from 'next/server';
import { z } from 'zod';
import { extractVideoId, getTranscript } from '@/lib/youtube';
import { db } from '@/lib/db';
import { summarizeWithProvider, PROVIDERS, PROVIDER_LABELS, type Provider } from '@/lib/ai';

export const maxDuration = 120;

const summarySchema = z.object({
  executiveSummary: z.string(),
  keyInsights: z.array(z.string()),
  actionItems: z.array(z.string()),
  quotes: z.array(z.string()),
  timestamps: z.array(z.object({ time: z.string(), topic: z.string(), details: z.string() })),
  resources: z.array(z.string()),
  verdict: z.string(),
});

const SUMMARY_PROMPT = `You are a world-class executive analyst and expert summarizer. Your task is to process this raw YouTube transcript and generate an immensely powerful, deeply insightful, and comprehensive summary. Do not give surface-level fluff. Dig deep into the core arguments, hidden nuances, and step-by-step logic.

Rules:
- Give EXTREME DETAIL. Make the summary robust, analytical, and highly structured.
- Executive Summary: A multi-paragraph, incredibly dense breakdown of the entire video's thesis, context, and ultimate conclusion.
- Key Insights: 5-8 highly analytical insights. Don't just state facts; explain *why* they matter and the underlying logic.
- Action Items: 4-6 highly specific, actionable takeaways that a professional could implement immediately.
- Quotes: 3-5 verbatim, powerful quotes that capture the essence of the arguments.
- Timestamps: Provide an exhaustive list of logical chapters. For each chapter, provide the estimated MM:SS timestamp, a topic title, and a detailed summary (2-3 sentences) of what was discussed in that specific section.
- Resources: Any books, tools, papers, companies, or concepts mentioned.
- Verdict: A brutal, honest, 1-2 sentence assessment of who should watch this and the absolute core value provided.

Return ONLY valid JSON matching this exact schema. Do not include markdown formatting or backticks.
Schema:
{
  "executiveSummary": "A dense, multi-paragraph overview...",
  "keyInsights": ["Insight 1 with deep analysis...", "Insight 2..."],
  "actionItems": ["Action 1...", "Action 2..."],
  "quotes": ["Quote 1...", "Quote 2..."],
  "timestamps": [{"time": "MM:SS", "topic": "Section Topic", "details": "Detailed breakdown of this section"}],
  "resources": ["Resource 1..."],
  "verdict": "Final assessment..."
}`;

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

// Env keys are used only as a fallback when no key is supplied in the request (BYOK).
const ENV_API_KEYS: Record<Provider, string | undefined> = {
  openrouter: process.env.OPENROUTER_API_KEY,
  groq: process.env.GROQ_API_KEY,
  deepseek: process.env.DEEPSEEK_API_KEY,
  openai: process.env.OPENAI_API_KEY,
};

export async function POST(req: Request) {
  try {
    // Clerk muted for local dev — use a fixed dev user.
    const userId = 'dev-user';
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await req.json();
    const url = body?.url;
    if (!url) return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 });

    // BYOK: provider + key come from the client (Settings page). Env is the fallback.
    const provider: Provider =
      PROVIDERS.includes(body?.provider) ? body.provider : 'openrouter';
    const apiKey = String(body?.apiKey ?? '').trim() || ENV_API_KEYS[provider] || '';

    const videoId = extractVideoId(url);
    if (!videoId) return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });

    // Check Credits
    let user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      user = await db.user.create({ data: { id: userId, credits: 5 } });
    }

    if (user.credits <= 0) {
      return NextResponse.json({ error: 'You are out of credits. Please upgrade to Pro.' }, { status: 403 });
    }

    // Check if summary already exists
    const existingSummary = await db.summary.findFirst({
       where: { userId, videoId }
    });

    if (existingSummary) {
       return NextResponse.json({
         videoId,
         provider,
         meta: { title: existingSummary.title, author_name: existingSummary.channel, thumbnail_url: "" },
         summary: {
            executiveSummary: existingSummary.executiveSummary,
            keyInsights: JSON.parse(existingSummary.keyInsights),
            actionItems: JSON.parse(existingSummary.actionItems),
            quotes: JSON.parse(existingSummary.quotes),
            timestamps: JSON.parse(existingSummary.timestamps),
            resources: JSON.parse(existingSummary.resources),
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
      if (!apiKey) {
        aiError = `No API key configured for ${PROVIDER_LABELS[provider]}. Add your key in Settings → Bring Your Own Key.`;
        console.error(aiError);
      } else {
        try {
          const { content, model } = await summarizeWithProvider({
            provider,
            apiKey,
            system: SUMMARY_PROMPT,
            transcript,
          });
          console.error(`AI summary via ${provider}/${model}`);
          summary = summarySchema.parse(extractJson(content));

          // Deduct credit and save to DB
          await db.$transaction([
            db.user.update({
              where: { id: userId },
              data: { credits: { decrement: 1 } }
            }),
            db.summary.create({
              data: {
                userId,
                videoId,
                title: meta?.title || "Unknown Title",
                channel: meta?.author_name || "Unknown Channel",
                duration: "TBD",
                executiveSummary: summary.executiveSummary,
                keyInsights: JSON.stringify(summary.keyInsights),
                actionItems: JSON.stringify(summary.actionItems),
                quotes: JSON.stringify(summary.quotes),
                timestamps: JSON.stringify(summary.timestamps),
                resources: JSON.stringify(summary.resources),
                verdict: summary.verdict,
              }
            })
          ]);

        } catch (err: any) {
          aiError = err.message;
          console.error("AI generation failed:", err.message);
        }
      }
    }

    return NextResponse.json({
      videoId,
      provider,
      meta,
      transcript: transcript ? transcript.substring(0, 3000) : null,
      summary,
      aiError,
    });

  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to process video' }, { status: 500 });
  }
}
