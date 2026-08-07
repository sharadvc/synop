"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sun, Radio, Play, Sparkles, Loader2, FileText } from "lucide-react";

interface NewVideo {
  id: string;
  title: string;
  publishedAt: string;
  thumbUrl: string;
}

/**
 * Daily Briefing — the retention surface. One screen that answers
 * "what's new today" (channel uploads) + "where was I" (your library),
 * so there's a reason to open the app every day.
 */
export default function BriefingPanel({ summaries }: { summaries: any[] }) {
  const [checking, setChecking] = useState(false);
  const [newVideos, setNewVideos] = useState<NewVideo[]>([]);
  // Hydration-safe date (render after mount to avoid SSR/client mismatch).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Check watched channels for new uploads.
  useEffect(() => {
    (async () => {
      setChecking(true);
      try {
        const res = await fetch("/api/watchlist/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const j = await res.json();
        const all: NewVideo[] = (j.results || []).flatMap((r: any) => r.newVideos || []);
        setNewVideos(all.slice(0, 6));
      } catch {}
      setChecking(false);
    })();
  }, []);

  const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-6 animate-rise stagger-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Sun className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Your Briefing</h3>
          <p className="text-sm text-foreground/50">{mounted ? date : ''}</p>
        </div>
      </div>

      {/* New uploads */}
      <div className="glass border border-border/50 rounded-3xl overflow-hidden shadow-xl shadow-foreground/5">
        <div className="px-5 py-3 border-b border-border/50 bg-foreground/[0.02] font-bold text-sm flex items-center gap-2">
          <Radio className="w-4 h-4 text-primary" /> New uploads from your channels
        </div>
        {checking ? (
          <div className="p-6 flex items-center gap-2 text-sm text-foreground/50">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking channels…
          </div>
        ) : newVideos.length > 0 ? (
          <div className="divide-y divide-border/40">
            {newVideos.map(v => (
              <Link key={v.id} href={`/summary/${v.id}`} className="px-5 py-3 flex items-center gap-3 hover:bg-accent/50 transition-colors">
                <img src={v.thumbUrl || ""} className="w-20 h-12 object-cover rounded-lg border border-border/50" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold truncate">{v.title}</div>
                  <div className="text-xs text-foreground/50">{new Date(v.publishedAt).toLocaleDateString()}</div>
                </div>
                <Play className="w-4 h-4 text-foreground/30 shrink-0" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-6 text-sm text-foreground/50">
            No new uploads — your channels are quiet. Add more in the <span className="font-bold text-foreground/70">Channels</span> tab.
          </div>
        )}
      </div>

      {/* Recent library */}
      <div className="glass border border-border/50 rounded-3xl overflow-hidden shadow-xl shadow-foreground/5">
        <div className="px-5 py-3 border-b border-border/50 bg-foreground/[0.02] font-bold text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" /> Recent in your library
        </div>
        {summaries.length === 0 ? (
          <div className="p-6 text-sm text-foreground/50">Nothing yet — paste a video above to get started.</div>
        ) : (
          <div className="divide-y divide-border/40">
            {summaries.slice(0, 4).map(s => (
              <Link key={s.id} href={`/summary/${s.videoId}`} className="px-5 py-3 flex items-center gap-3 hover:bg-accent/50 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold truncate">{s.title}</div>
                  <div className="text-xs text-foreground/50">{s.channel}</div>
                </div>
                <Play className="w-4 h-4 text-foreground/30 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {summaries.length > 0 && (
        <Link href={`/summary/${summaries[0].videoId}`} className="block">
          <div className="glass border border-primary/20 bg-primary/5 rounded-2xl px-5 py-4 flex items-center gap-3 hover:-translate-y-0.5 transition-all">
            <Sparkles className="w-5 h-5 text-primary" />
            <div>
              <div className="text-sm font-bold text-foreground">Keep going</div>
              <div className="text-xs text-foreground/50">Review your latest summary's study deck →</div>
            </div>
          </div>
        </Link>
      )}
    </div>
  );
}
