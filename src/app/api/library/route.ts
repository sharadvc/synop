import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/library?q=...&persona=...
 *
 * The compounding knowledge base:
 *  - aggregates topic clusters across EVERY summary (the growing topic map)
 *  - searches the library by title/channel/summary/quotes/entities/topics
 *  - reports library stats (videos, topics, fact-checked claims)
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const persona = searchParams.get('persona') || 'general';

  const summaries = await db.summary.findMany({
    where: { persona: { in: [persona, 'general'] } },
    select: {
      id: true, videoId: true, title: true, channel: true,
      executiveSummary: true, quotes: true, topicClusters: true,
      entities: true, freshness: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  // A video can have multiple persona rows — dedupe to one per video
  // (keep the most recent) so the library lists unique videos.
  const seenVideo = new Set<string>();
  const uniqueSummaries = summaries.filter(s => {
    if (seenVideo.has(s.videoId)) return false;
    seenVideo.add(s.videoId);
    return true;
  });

  const parse = (raw: string | null): any[] => {
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  };

  // Cross-video topic map — the compounding signal (unique videos per topic).
  const topicMap = new Map<string, Set<string>>();
  for (const s of uniqueSummaries) {
    for (const t of parse(s.topicClusters)) {
      if (!t?.topic) continue;
      const videos = topicMap.get(t.topic) || new Set<string>();
      videos.add(s.videoId);
      topicMap.set(t.topic, videos);
    }
  }
  const topics = [...topicMap.entries()]
    .map(([topic, videos]) => ({ topic, count: videos.size, videos: [...videos] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  let claims = 0;
  for (const s of uniqueSummaries) claims += parse(s.freshness).length;

  const filtered = q
    ? uniqueSummaries.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.channel.toLowerCase().includes(q) ||
        s.executiveSummary.toLowerCase().includes(q) ||
        (s.quotes || '').toLowerCase().includes(q) ||
        (s.entities || '').toLowerCase().includes(q) ||
        (s.topicClusters || '').toLowerCase().includes(q))
    : uniqueSummaries;

  const results = filtered.slice(0, 50).map(s => ({
    videoId: s.videoId,
    title: s.title,
    channel: s.channel,
    excerpt: (s.executiveSummary || '').slice(0, 240),
    topics: parse(s.topicClusters).map((t: any) => t.topic).filter(Boolean).slice(0, 4),
    entities: parse(s.entities).map((e: any) => e.name).filter(Boolean).slice(0, 5),
    freshness: parse(s.freshness).length,
  }));

  return NextResponse.json({
    stats: { videos: uniqueSummaries.length, topics: topics.length, claims },
    topics,
    results,
    query: q || null,
  });
}
