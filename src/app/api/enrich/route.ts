import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTranscript } from '@/lib/youtube';
import { resolveKeys } from '@/lib/ai';
import { enrichTranscript } from '@/lib/phase2';
import { analyzeEntityGraph } from '@/lib/phase2/entityGraph';
import { userScope } from '@/lib/user';

export const maxDuration = 300;
export const runtime = 'nodejs';

/**
 * POST /api/enrich  { videoId, language?, force? }
 *
 * Computes the Phase 2 analysis features (Signal Density, Topic Clusters,
 * Debate Matrix, Freshness) for a stored summary and persists them. Already
 * computed features are returned from the DB untouched unless `force` is set.
 *
 * This is intentionally separate from /api/summarize so the core summary is
 * never delayed — the UI renders instantly, then progressively fills these in.
 */
export async function POST(req: Request) {
  try {
    const { videoId, language = 'English', force = false, persona = 'general' } = await req.json();
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    const summary = await db.summary.findFirst({ where: { videoId, language, persona, ...(await userScope()) } })
      ?? await db.summary.findFirst({ where: { videoId, language, ...(await userScope()) } });
    if (!summary) {
      return NextResponse.json({ error: 'Summary not found. Summarize the video first.' }, { status: 404 });
    }

    // Ensure we have a transcript to analyze (persist it if we had to fetch).
    let transcript = summary.transcript || '';
    if (!transcript) {
      try {
        transcript = await getTranscript(videoId);
        await db.summary.update({ where: { id: summary.id }, data: { transcript } });
      } catch (err: any) {
        console.warn('[enrich] Transcript unavailable:', err.message);
      }
    }
    if (!transcript) {
      return NextResponse.json(
        { error: 'No transcript available for this video, so it cannot be enriched.' },
        { status: 422 },
      );
    }

    const has = {
      topicClusters: !force && summary.topicClusters,
      debateMatrix: !force && summary.debateMatrix,
      freshness: !force && summary.freshness,
    };

    const parse = (raw: string | null) => {
      if (!raw) return null;
      try { return JSON.parse(raw); } catch { return null; }
    };

    // Entity graph is deterministic (no LLM) — recompute every time, scanning
    // both the transcript and the summary text so it still forms when the raw
    // transcript is in a different language/script than the entity names.
    const summaryText = [
      summary.executiveSummary,
      (parse(summary.quotes) || []).join(' '),
      (parse(summary.topicClusters) || []).map((t: any) => t.summary || '').join(' '),
    ].filter(Boolean).join(' ');
    const entityGraph = analyzeEntityGraph(
      transcript,
      parse(summary.entities) || [],
      summaryText ? [summaryText] : [],
      parse(summary.topicClusters) || [],
    );

    // Fully cached → return immediately, no AI spend.
    if (has.topicClusters && has.debateMatrix && has.freshness) {
      return NextResponse.json({
        videoId,
        language,
        topicClusters: parse(summary.topicClusters),
        debateMatrix: parse(summary.debateMatrix),
        freshness: parse(summary.freshness),
        entityGraph,
      });
    }

    // Only reach the network for features we actually need to compute.
    const keys = resolveKeys(req.headers);
    const payload = await enrichTranscript(transcript, keys, language);
    const out = {
      topicClusters: has.topicClusters ? parse(summary.topicClusters) : payload.topicClusters,
      debateMatrix: has.debateMatrix ? parse(summary.debateMatrix) : payload.debateMatrix,
      freshness: has.freshness ? parse(summary.freshness) : payload.freshness,
      entityGraph,
    };

    // Persist whatever was freshly computed (skip null failures so we can retry).
    await db.summary.update({
      where: { id: summary.id },
      data: {
        ...(out.topicClusters ? { topicClusters: JSON.stringify(out.topicClusters) } : {}),
        ...(out.debateMatrix ? { debateMatrix: JSON.stringify(out.debateMatrix) } : {}),
        ...(out.freshness ? { freshness: JSON.stringify(out.freshness) } : {}),
        ...(out.entityGraph ? { entityGraph: JSON.stringify(out.entityGraph) } : {}),
      },
    });

    return NextResponse.json({ videoId, language, ...out });
  } catch (error: any) {
    console.error('[enrich] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to enrich summary' }, { status: 500 });
  }
}
