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

  const parse = (raw: string | null): any[] => {
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  };

  // Cross-video topic map — the compounding signal.
  const topicMap = new Map<string, { count: number; videos: string[] }>();
  for (const s of summaries) {
    for (const t of parse(s.topicClusters)) {
      if (!t?.topic) continue;
      const entry = topicMap.get(t.topic) || { count: 0, videos: [] };
      entry.count += 1;
      entry.videos.push(s.videoId);
      topicMap.set(t.topic, entry);
    }
  }
  const topics = [...topicMap.entries()]
    .map(([topic, v]) => ({ topic, count: v.count, videos: v.videos }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  let claims = 0;
  for (const s of summaries) claims += parse(s.freshness).length;

  const filtered = q
    ? summaries.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.channel.toLowerCase().includes(q) ||
        s.executiveSummary.toLowerCase().includes(q) ||
        (s.quotes || '').toLowerCase().includes(q) ||
        (s.entities || '').toLowerCase().includes(q) ||
        (s.topicClusters || '').toLowerCase().includes(q))
    : summaries;

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
    stats: { videos: summaries.length, topics: topics.length, claims },
    topics,
    results,
    query: q || null,
  });
}
