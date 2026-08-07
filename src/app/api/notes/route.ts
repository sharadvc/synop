import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const maxDuration = 120;

const buildNotesPrompt = (language: string = "English") => `You are a diligent student who NEVER misses a single detail in a lecture. Write EXHAUSTIVE, MULTI-PAGE handwritten-style notes that cover EVERY SINGLE TOPIC, TIMESTAMP, CONCEPT, EXAMPLE, QUOTE, and INSIGHT from the video.

IMPORTANT: ALL NOTES MUST BE WRITTEN IN ${language.toUpperCase()}. TRANSLATE EVERYTHING INTO ${language.toUpperCase()}.

CRITICAL RULES - violating these is failure:
1. Cover EVERY part of the video without exception. If the video covers 10 topics, your notes cover all 10 in detail. Never skip, collapse, or merge topics.
2. Split notes into MULTIPLE PAGES using the exact page separator shown below. Long videos (1h+) need 5-8 pages. Medium videos (20-60min) need 3-5 pages. Short videos need 2-3 pages.
3. NEVER use asterisks or markdown syntax. Do NOT write **word**, *word*, ##, #, or [ ]. For emphasis, write the word in ALL CAPS.
4. Use plain dashes (-) for bullet points only. No other markdown.
5. Write in student voice: "The instructor explains...", "Key concept:", "IMPORTANT:", "Note to self:", "Example given:"
6. Every bullet must reference something SPECIFIC from the video — exact names, numbers, timestamps, quotes, frameworks, or examples. No generic filler.
7. TOPIC ORDERING: If the provided Video Content includes a "TOPICS" list, organize your note pages around those themes IN THE EXACT ORDER GIVEN. Name each page after the theme it covers and group its related material there. This replaces chronological page order.

EXACT OUTPUT FORMAT — use this precisely:

=== PAGE 1: Introduction & Overview ===

LECTURE: [Video Title Here]
DATE: Today's Lecture
CHANNEL: [Channel Name]

MAIN TOPICS THIS PAGE:
- [Topic A]
- [Topic B]
- [Topic C]

NOTES:
- [Specific point from the video with exact details - 15 to 25 bullets minimum per page]
- [Each bullet references something concrete: a name, a number, an example, a quote]
- [Write naturally as a student would, not as an AI report]

KEY TERMS:
- [TERM]: [Definition exactly as explained in the video]

---

=== PAGE 2: [Title of the next major section from the video] ===

NOTES:
- [Continue exhaustive notes for this section]
- [Every example, every statistic, every quote must appear here]
- [Minimum 15 bullets per page]

KEY TERMS:
- [TERM]: [definition]

---

=== PAGE 3: [Next section title] ===

NOTES:
- [Continue for as many pages as needed to cover the ENTIRE video]
- [Do not stop until every topic has been addressed]

---

=== FINAL PAGE: Summary & Review ===

TOP TAKEAWAYS:
- [Most important lesson from the full video]
- [Second most important]
- [Third most important]
- [Keep going for all major insights]

QUESTIONS TO REVIEW:
- [Something to research further]
- [A concept to think about more deeply]

See you in the next lecture!

ABSOLUTE FINAL RULE: You MUST cover EVERY section of the video. Check every timestamp and topic. Never write generic filler. Every single bullet must reference something specific from the video content provided.`;

type CustomKeys = {
  gemini?: string | null;
  groq?: string | null;
  openrouter?: string | null;
};

async function callGemini(summaryContext: string, key: string, language: string = "English"): Promise<string | null> {
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + key, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildNotesPrompt(language) + '\n\nVideo Content:\n\n' + summaryContext }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
      }),
    });
    if (!res.ok) { const b = await res.text(); console.warn("Gemini notes failed:", res.status, b.slice(0, 300)); return null; }
    const json = await res.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) { console.warn("Gemini notes error:", e); return null; }
}

async function callGroq(summaryContext: string, key: string, language: string = "English"): Promise<string | null> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: buildNotesPrompt(language) }, { role: "user", content: "Video Content:\n\n" + summaryContext }],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });
    if (!res.ok) { const b = await res.text(); console.warn("Groq notes failed:", res.status, b.slice(0, 300)); return null; }
    const json = await res.json();
    return json.choices?.[0]?.message?.content || null;
  } catch (e) { console.warn("Groq notes error:", e); return null; }
}

async function callOpenRouter(summaryContext: string, key: string, language: string = "English"): Promise<string | null> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemma-4-26b-a4b-it:free",
        messages: [{ role: "system", content: buildNotesPrompt(language) }, { role: "user", content: "Video Content:\n\n" + summaryContext }],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });
    if (!res.ok) { const b = await res.text(); console.warn("OpenRouter notes failed:", res.status, b.slice(0, 300)); return null; }
    const json = await res.json();
    return json.choices?.[0]?.message?.content || null;
  } catch (e) { console.warn("OpenRouter notes error:", e); return null; }
}

function generateFallbackNotes(summary: any): string {
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const lines: string[] = [];
  lines.push('=== PAGE 1: Overview ===');
  lines.push('');
  lines.push('LECTURE: ' + (summary.title || 'Lecture Notes'));
  lines.push('DATE: ' + date);
  lines.push('');
  lines.push('MAIN TOPICS THIS PAGE:');
  if (summary.executiveSummary) {
    const sentences = summary.executiveSummary.split(/[.!?]+/).filter((s: string) => s.trim().length > 20).slice(0, 5);
    sentences.forEach((s: string) => lines.push('- ' + s.trim() + '.'));
  }
  lines.push('');
  lines.push('NOTES:');
  const frameworks = (() => { try { return JSON.parse(summary.frameworks || '[]'); } catch { return []; } })();
  if (frameworks.length > 0) {
    frameworks.forEach((f: any) => lines.push('- ' + (f.name || '') + ': ' + (f.description || '')));
    lines.push('');
  }
  const quotes = (() => { try { return JSON.parse(summary.quotes || '[]'); } catch { return []; } })();
  if (quotes.length > 0) {
    lines.push('Important Quotes:');
    quotes.slice(0, 3).forEach((q: string) => lines.push('- "' + q + '"'));
    lines.push('');
  }
  lines.push('---');
  lines.push('');
  lines.push('=== FINAL PAGE: Summary & Review ===');
  lines.push('');
  lines.push('TOP TAKEAWAYS:');
  if (summary.verdict) lines.push('- ' + summary.verdict);
  const critique = (() => { try { return JSON.parse(summary.biasAnalysis || '[]'); } catch { return []; } })();
  critique.slice(0, 5).forEach((c: string) => lines.push('- ' + c));
  lines.push('');
  lines.push('QUESTIONS TO REVIEW:');
  lines.push('- Review the key concepts from this lecture');
  lines.push('- Practice applying the frameworks discussed');
  lines.push('');
  lines.push('See you in the next lecture!');
  return lines.join('\n');
}

async function callNotesModel(summaryContext: string, summary: any, keys: CustomKeys): Promise<string> {
  const geminiKey = keys.gemini || process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const result = await callGemini(summaryContext, geminiKey);
    if (result) return result;
  }

  const groqKey = keys.groq || process.env.GROQ_API_KEY;
  if (groqKey) {
    const result = await callGroq(summaryContext, groqKey);
    if (result) return result;
  }

  const openRouterKey = keys.openrouter || process.env.OPENAI_API_KEY;
  if (openRouterKey) {
    const result = await callOpenRouter(summaryContext, openRouterKey);
    if (result) return result;
  }

  return generateFallbackNotes(summary);
}

export async function POST(req: Request) {
  try {
    const { videoId, force, language = "English" } = await req.json();
    if (!videoId) return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });

    const summary = await db.summary.findFirst({ where: { videoId, language } });
    if (!summary) return NextResponse.json({ error: 'Summary not found.' }, { status: 404 });

    if (summary.notes && !force) {
       return NextResponse.json({ notes: summary.notes });
    }

    const summaryContext = JSON.stringify({
       title: summary.title, channel: summary.channel,
       // Cap the transcript — it's now persisted and can run to 100k+ chars,
       // which would 413 on Groq's on-demand tier.
       transcript: (summary.transcript || '').slice(0, 20000),
       executiveSummary: summary.executiveSummary,
       quotes: summary.quotes, verdict: summary.verdict,
       frameworks: summary.frameworks, biasAnalysis: summary.biasAnalysis,
       entities: summary.entities,
       // Phase 2: order the handwritten pages by these themes.
       TOPICS: (() => { try { return (JSON.parse(summary.topicClusters || '[]')).map((t: any) => t.topic); } catch { return []; } })(),
    });

    const customKeys = {
      gemini: req.headers.get('x-gemini-key'),
      groq: req.headers.get('x-groq-key'),
      openrouter: req.headers.get('x-openrouter-key'),
    };

    const notes = await callNotesModel(summaryContext, summary, customKeys);

    await db.summary.update({
      where: { id: summary.id },
      data: { notes }
    });

    return NextResponse.json({ notes });
  } catch (error: any) {
    console.error("Notes API error:", error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
