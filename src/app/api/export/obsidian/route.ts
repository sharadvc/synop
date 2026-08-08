import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { db } from '@/lib/db';
import { userScope, requireUserId } from '@/lib/user';
import { buildKnowledgeMarkdown, slugify } from '@/lib/pkm';

export const runtime = 'nodejs';

/**
 * POST /api/export/obsidian  { videoId, language? }
 *
 * Two modes:
 *  - If OBSIDIAN_VAULT_PATH is configured server-side, the markdown (with
 *    [[Wiki-Links]]) is written straight into <vault>/Synop/ so it appears in
 *    the user's vault instantly.
 *  - Otherwise the route returns the markdown and the client downloads the
 *    .md file (drop it into any vault folder).
 */
export async function POST(req: Request) {
  try {
    const __uid = await requireUserId(req); if (!__uid) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const { videoId, language = 'English' } = await req.json();
    if (!videoId) return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });

    const summary = await db.summary.findFirst({ where: { videoId, language, ...(await userScope()) } });
    if (!summary) return NextResponse.json({ error: 'Summary not found' }, { status: 404 });

    const parse = (raw: string | null) => {
      if (!raw) return null;
      try { return JSON.parse(raw); } catch { return null; }
    };

    const markdown = buildKnowledgeMarkdown({
      title: summary.title,
      channel: summary.channel,
      videoId,
      language,
      executiveSummary: summary.executiveSummary,
      verdict: summary.verdict,
      quotes: parse(summary.quotes) || [],
      resources: parse(summary.resources) || [],
      frameworks: parse(summary.frameworks) || [],
      biasAnalysis: parse(summary.biasAnalysis) || [],
      entities: parse(summary.entities) || [],
      signalDensity: parse(summary.signalDensity),
      topicClusters: parse(summary.topicClusters),
      freshness: parse(summary.freshness),
      notes: summary.notes,
    });

    const filename = `${slugify(summary.title)}.md`;

    // Server-side vault write when configured.
    const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
    if (vaultPath) {
      const dir = path.join(vaultPath, 'Synop');
      await mkdir(dir, { recursive: true });
      const target = path.join(dir, filename);
      await writeFile(target, markdown, 'utf8');
      return NextResponse.json({ success: true, wroteToVault: true, path: target, filename });
    }

    return NextResponse.json({ success: true, wroteToVault: false, filename, markdown });
  } catch (error: any) {
    console.error('[obsidian export] Error:', error);
    return NextResponse.json({ error: error.message || 'Obsidian export failed' }, { status: 500 });
  }
}
