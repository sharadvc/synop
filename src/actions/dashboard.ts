"use server";

import { db } from "@/lib/db";
import { userScope } from "@/lib/user";

export async function getDashboardData(language?: string, persona: string = 'general') {
  const [summaries, folders] = await Promise.all([
    db.summary.findMany({
      where: {
        AND: [
          await userScope(),
          { persona: { in: [persona, 'general'] } },
          ...(language ? [{ language }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    }),
    db.folder.findMany({
      where: await userScope(),
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
