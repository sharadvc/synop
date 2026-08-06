"use server";

import { db } from "@/lib/db";

export async function getDashboardData() {
  // Clerk muted for local dev — use a fixed dev user.
  const userId = "dev-user";
  if (!userId) return null;

  const [user, summaries] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.summary.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
  ]);

  return {
    credits: user?.credits ?? 0,
    summaries: summaries.map(s => ({
      id: s.id,
      videoId: s.videoId,
      title: s.title,
      channel: s.channel,
      duration: s.duration,
      status: s.status,
      date: s.createdAt.toISOString()
    }))
  };
}
