import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveKeys, llmText } from '@/lib/ai';
import { userScope } from '@/lib/user';

export const maxDuration = 120;

const SYSTEM = `You are a rigorous research analyst. Produce a DETAILED, structured research report on a single video. Be dense, precise, and evidence-based — cite the video's actual claims, keep every number/name/date, and flag anything that is asserted rather than proven.

Write the report in clean Markdown with EXACTLY these headings (in this order):

# Research Report: <title>
**Source:** <url> · **Channel:** <channel>

## Executive Analysis
A deep, multi-paragraph analysis of the video's thesis, argument structure, methodology, and most significant claims. Go beyond summary — assess the strength of the reasoning.

CRITICAL: The video's executive summary is ALWAYS provided in the data under "executiveSummary". Use it as the factual basis for this section. NEVER write "Executive summary not available" or "not covered" when data is present. Expand on it, organize its substance, and assess it.

## Key Claims & Fact-Check Status
A bulleted list of the most checkable claims, each with its verification status (use the provided Freshness data: VALIDATED / CONTEXT_CHANGED / DEBUNKED_OUTDATED, or UNVERIFIED) and a one-line note.

## Evidence & Key Quotes
The strongest evidence the speaker offers, plus 3-6 verbatim quotes worth citing, each attributed to the video.

## Entities & Concepts
The notable people, companies, organizations, and scientific/conceptual terms, grouped by type.

## Frameworks & Mental Models
The frameworks, systems, or step-by-step methods the video presents, each with a concise description.

## Contradictions & Tensions
Internal contradictions, unstated assumptions, and points where the video's claims strain against each other or against established knowledge.

## Bias Assessment
The speaker's biases, incentives, logical fallacies, and what they stand to gain — be specific.

## Open Questions
3-5 concrete questions a researcher should investigate further before relying on this video.

## Sources
The primary source (the video) plus any books, papers, tools, or references mentioned in it.

Rules:
- NEVER invent facts not present in the provided data. If something is missing, say "Not covered in the video."
- All output text must be in the requested language.
- Output ONLY the markdown report — no preamble.`;

/** Deterministic fallback: assemble a solid report from the stored data. */
function buildFallbackReport(input: any): string {
  const s = input.summary;
  const L: string[] = [];
  L.push(`# Research Report: ${input.title}`);
  L.push(`**Source:** https://youtube.com/watch?v=${input.videoId} · **Channel:** ${input.channel}`);
  L.push('');
  L.push('## Executive Analysis');
  L.push(s?.executiveSummary || 'Executive summary not available.');
  L.push('');
  const claims = input.freshness || [];
  if (claims.length) {
    L.push('## Key Claims & Fact-Check Status');
    for (const c of claims) {
      const badge = c.status === 'DEBUNKED_OUTDATED' ? '🔴' : c.status === 'CONTEXT_CHANGED' ? '🟡' : '🟢';
      L.push(`- ${badge} **${c.claim}** — ${c.note}`);
    }
    L.push('');
  }
  if ((input.quotes || []).length) {
    L.push('## Evidence & Key Quotes');
    for (const q of input.quotes) L.push(`> ${q}`);
    L.push('');
  }
  if ((input.entities || []).length) {
    L.push('## Entities & Concepts');
    const groups: Record<string, string[]> = {};
    for (const e of input.entities) (groups[e.type || 'Entity'] = groups[e.type || 'Entity'] || []).push(e.name);
    for (const [t, names] of Object.entries(groups)) L.push(`- **${t}:** ${(names as string[]).join(', ')}`);
    L.push('');
  }
  if ((input.frameworks || []).length) {
    L.push('## Frameworks & Mental Models');
    for (const f of input.frameworks) L.push(`- **${f.name}:** ${f.description}`);
    L.push('');
  }
  if ((input.bias || []).length) {
    L.push('## Bias Assessment');
    for (const b of input.bias) L.push(`- ${b}`);
    L.push('');
  }
  if ((input.resources || []).length) {
    L.push('## Sources');
    for (const r of input.resources) L.push(`- ${r}`);
    L.push('');
  }
  L.push('## Open Questions');
  L.push('- What verification does each key claim require before it can be relied upon?');
  L.push('');
  return L.join('\n');
}

export async function POST(req: Request) {
  try {
    const { videoId, language = 'English', persona = 'general' } = await req.json();
    if (!videoId) return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });

    const summary = await db.summary.findFirst({ where: { videoId, language, persona, ...(await userScope()) } })
      ?? await db.summary.findFirst({ where: { videoId, language, ...(await userScope()) } });
    if (!summary) return NextResponse.json({ error: 'Summary not found. Summarize the video first.' }, { status: 404 });

    const parse = (raw: string | null): any => {
      if (!raw) return [];
      try { return JSON.parse(raw); } catch { return []; }
    };

    const context = {
      title: summary.title,
      channel: summary.channel,
      videoId,
      executiveSummary: summary.executiveSummary,
      quotes: parse(summary.quotes),
      resources: parse(summary.resources),
      bias: parse(summary.biasAnalysis),
      frameworks: parse(summary.frameworks),
      entities: parse(summary.entities),
      topics: parse(summary.topicClusters),
      freshness: parse(summary.freshness),
      debate: parse(summary.debateMatrix),
      transcriptExcerpt: (summary.transcript || '').slice(0, 8000),
    };

    const keys = resolveKeys(req.headers);
    let report: string;
    try {
      report = await llmText({
        system: SYSTEM,
        user: `Language: ${language}.\n\nVIDEO DATA (JSON):\n${JSON.stringify(context, null, 2)}`,
        keys,
        temperature: 0.3,
        maxTokens: 6000,
        maxUserChars: 14000,
      });
    } catch (err: any) {
      console.warn('[research] LLM report failed, using deterministic fallback:', err.message);
      report = buildFallbackReport(context);
    }

    return NextResponse.json({ report, videoId, language });
  } catch (error: any) {
    console.error('[research] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate research report' }, { status: 500 });
  }
}
