import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

export const maxDuration = 60;

const repurposeSchema = z.object({
  blogPost: z.string(),
  twitterThread: z.string(),
  linkedinPost: z.string(),
});

const buildRepurposePrompt = (language: string = "English") => `You are an elite, world-class digital marketer and copywriter.
Your task is to take a comprehensive AI analysis of a video/podcast and repurpose it into three highly engaging, viral-optimized marketing assets.

IMPORTANT: ALL CONTENT MUST BE WRITTEN IN ${language.toUpperCase()}. DO NOT OUTPUT ENGLISH UNLESS REQUESTED.

RULES:
- Return ONLY valid JSON matching the exact schema. NO MARKDOWN blocks outside the JSON string values.
- The "blogPost" should be a 600-800 word SEO-optimized blog article formatted in standard Markdown (using #, ##, bolding, and bullet points).
- The "twitterThread" should be a 5-8 tweet thread. Separate tweets clearly. Use emojis naturally. Make the hook (first tweet) irresistible.
- The "linkedinPost" should be a single, long-form post with a strong hook, whitespace, and actionable value.

JSON SCHEMA:
{
  "blogPost": "...",
  "twitterThread": "...",
  "linkedinPost": "..."
}`;

function extractJson(raw: string): any {
  const trimmed = raw.trim();
  try { return JSON.parse(trimmed); } catch {}
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) { try { return JSON.parse(codeBlock[1].trim()); } catch {} }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) { try { return JSON.parse(trimmed.slice(start, end + 1)); } catch {} }
  throw new Error("Failed to parse JSON");
}

type CustomKeys = {
  gemini?: string | null;
  groq?: string | null;
  openrouter?: string | null;
};

async function callRepurposeModel(summaryContext: string, keys: CustomKeys, language: string = "English"): Promise<any> {
  const geminiKey = keys.gemini || process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `System Prompt: ${buildRepurposePrompt(language)}\n\nContext to Repurpose:\n\n${summaryContext}` }] }],
          generationConfig: { temperature: 0.7, responseMimeType: "application/json" }
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) return JSON.parse(content);
      }
    } catch (e) {
      console.warn("Gemini repurpose failed");
    }
  }

  const groqKey = keys.groq || process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: buildRepurposePrompt(language) }, { role: "user", content: `Context to Repurpose:\n\n${summaryContext}` }],
          temperature: 0.7, 
          response_format: { type: "json_object" },
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (content) return JSON.parse(content);
      }
    } catch (e) {
       console.warn("Groq repurpose failed");
    }
  }
  
  const openRouterKey = keys.openrouter || process.env.OPENAI_API_KEY;
  if (openRouterKey) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${openRouterKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro:free",
          messages: [{ role: "system", content: buildRepurposePrompt(language) }, { role: "user", content: `Context to Repurpose:\n\n${summaryContext}` }],
          temperature: 0.7, 
          response_format: { type: "json_object" },
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (content) return JSON.parse(content);
      }
    } catch (e) {
       console.warn("OpenRouter repurpose failed");
    }
  }

  throw new Error("All AI models failed to generate repurposed content.");
}

export async function POST(req: Request) {
  try {
    const { videoId, language = "English" } = await req.json();
    if (!videoId) return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });

    const summary = await db.summary.findFirst({ where: { videoId, language } });
    if (!summary) return NextResponse.json({ error: 'Summary not found.' }, { status: 404 });

    if (summary.blogPost && summary.twitterThread && summary.linkedinPost) {
       return NextResponse.json({ blogPost: summary.blogPost, twitterThread: summary.twitterThread, linkedinPost: summary.linkedinPost });
    }

    const summaryContext = JSON.stringify({
       title: summary.title, channel: summary.channel, executiveSummary: summary.executiveSummary,
       keyInsights: summary.keyInsights, quotes: summary.quotes, actionItems: summary.actionItems, verdict: summary.verdict
    });

    const customKeys = {
      gemini: req.headers.get('x-gemini-key'),
      groq: req.headers.get('x-groq-key'),
      openrouter: req.headers.get('x-openrouter-key'),
    };

    const generated = await callRepurposeModel(summaryContext, customKeys);
    const parsed = repurposeSchema.parse(generated);

    await db.summary.update({
      where: { id: summary.id },
      data: { blogPost: parsed.blogPost, twitterThread: parsed.twitterThread, linkedinPost: parsed.linkedinPost }
    });

    return NextResponse.json(parsed);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
