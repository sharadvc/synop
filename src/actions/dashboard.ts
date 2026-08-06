"use server";

import { db } from "@/lib/db";

export async function getDashboardData(language?: string) {
  const [summaries, folders] = await Promise.all([
    db.summary.findMany({
      where: language ? { language } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50
    }),
    db.folder.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { summaries: true }
        }
      }
    })
  ]);

  return {
    summaries: summaries.map(s => ({
      id: s.id,
      videoId: s.videoId,
      title: s.title,
      channel: s.channel,
      duration: s.duration,
      status: s.status,
      folderId: s.folderId,
      executiveSummary: s.executiveSummary,
      quotes: s.quotes,
      resources: s.resources,
      verdict: s.verdict,
      biasAnalysis: s.biasAnalysis,
      frameworks: s.frameworks,
      entities: s.entities,
      mindMap: s.mindMap,
      date: s.createdAt.toISOString()
    })),
    folders: folders.map(f => ({
      id: f.id,
      name: f.name,
      color: f.color,
      count: f._count.summaries
    }))
  };
}
