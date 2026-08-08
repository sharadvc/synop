import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRecentUploads } from '@/lib/youtubeApi';
import { userScope, requireUserId } from '@/lib/user';

/**
 * POST /api/watchlist/check   { id?, max? }
 * Fetches the newest uploads for every watched channel (or one, if `id`),
 * and reports which are NOT yet summarized. Summarizing is done client-side
 * so the heavy LLM calls stay visible/progressed and cost-controlled.
 */
export async function POST(req: Request) {
  try {
    const __uid = await requireUserId(req); if (!__uid) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const { id, max = 5 } = await req.json();
    const where = id ? { id, ...(await userScope()) } : await userScope();
    const channels = await db.channelWatch.findMany({ where, orderBy: { createdAt: 'desc' } });

    const results = [];
    for (const ch of channels) {
      let uploads: { id: string; title: string; publishedAt: string; thumbUrl: string }[] = [];
      try {
        uploads = await getRecentUploads(ch.channelId, max);
      } catch (e: any) {
        console.warn('[watchlist/check]', ch.channelId, e.message);
      }

      const videoIds = uploads.map(u => u.id);
      const existing = videoIds.length
        ? await db.summary.findMany({ where: { videoId: { in: videoIds }, ...(await userScope()) }, select: { videoId: true } })
        : [];
      const existingIds = new Set(existing.map(s => s.videoId));
      const newVideos = uploads.filter(u => !existingIds.has(u.id));

      await db.channelWatch.update({
        where: { id: ch.id, ...(await userScope()) },
        data: { lastCheckedAt: new Date(), lastVideoId: uploads[0]?.id || null },
      });

      results.push({
        channel: { id: ch.id, channelId: ch.channelId, title: ch.title, avatar: ch.avatar, autoSummarize: ch.autoSummarize },
        uploads,
        newVideos,
      });
    }

    return NextResponse.json({ results, checkedAt: new Date().toISOString() });
  } catch (e: any) {
    console.error('[watchlist/check]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
