"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Layers, ShieldCheck, FileText, Sparkles, Loader2, Send, RefreshCw } from "lucide-react";
import { aiHeaders } from "@/lib/client-ai";
import { getPersona } from "@/lib/persona";

interface LibraryVideo {
  videoId: string;
  title: string;
  channel: string;
  excerpt: string;
  topics: string[];
  entities: string[];
  freshness: number;
}

interface LibraryData {
  stats: { videos: number; topics: number; claims: number };
  topics: { topic: string; count: number; videos: string[] }[];
  results: LibraryVideo[];
  query: string | null;
}

/**
 * The Library — the compounding knowledge base.
 * Search across every summary, browse the cross-video topic map, and ask the
 * whole library a question (LLM synthesis).
 */
export default function LibraryPanel() {
  const [data, setData] = useState<LibraryData | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [ask, setAsk] = useState("");
  const [askResult, setAskResult] = useState("");
  const [asking, setAsking] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/library?q=${encodeURIComponent(query)}&persona=${encodeURIComponent(getPersona())}`);
      const j = await res.json();
      setData(j);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  // Debounced search.
  const onSearch = (value: string) => {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(value.trim()), 350);
  };

  const askLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = ask.trim();
    if (!text || asking) return;
    setAsking(true);
    setAskResult("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: aiHeaders(),
        body: JSON.stringify({
          messages: [{ role: "user", content: text }],
          videoId: "global",
          persona: getPersona(),
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      setAskResult(j.reply || "");
    } catch (err: any) {
      setAskResult(`⚠️ ${err.message}`);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="space-y-6 animate-rise stagger-3">
      {/* Stats */}
      {data && (
        <div className="flex flex-wrap gap-3">
          <div className="px-5 py-3 glass border border-border/50 rounded-2xl flex items-center gap-2.5 text-[13px] font-bold text-foreground">
            <FileText className="w-4 h-4 text-foreground/40" /> {data.stats.videos} videos
          </div>
          <div className="px-5 py-3 glass border border-border/50 rounded-2xl flex items-center gap-2.5 text-[13px] font-bold text-foreground">
            <Layers className="w-4 h-4 text-foreground/40" /> {data.stats.topics} topics
          </div>
          <div className="px-5 py-3 glass border border-border/50 rounded-2xl flex items-center gap-2.5 text-[13px] font-bold text-foreground">
            <ShieldCheck className="w-4 h-4 text-foreground/40" /> {data.stats.claims} claims fact-checked
          </div>
        </div>
      )}

      {/* Ask your library */}
      <div className="glass border border-border/50 rounded-3xl p-5 shadow-xl shadow-foreground/5">
        <p className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Ask your whole library</p>
        <form onSubmit={askLibrary} className="relative flex items-center">
          <input
            value={ask}
            onChange={e => setAsk(e.target.value)}
            placeholder='e.g. "What has my library said about AI regulation?"'
            className="w-full bg-foreground/5 border-none rounded-full pl-5 pr-14 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20 placeholder:text-foreground/30 font-medium"
          />
          <button type="submit" disabled={asking || !ask.trim()} className="absolute right-2 p-2 bg-primary text-white rounded-full hover:scale-105 transition-transform disabled:opacity-50">
            {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
        {askResult && (
          <div className="mt-4 p-4 rounded-2xl bg-foreground/5 text-[13px] font-medium text-foreground/80 leading-relaxed whitespace-pre-wrap">
            {askResult}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
        <input
          value={q}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search your whole library…"
          className="w-full h-12 pl-11 pr-4 glass border border-border/50 rounded-2xl text-sm outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      )}

      {!loading && data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Topic map */}
          <div className="lg:col-span-1">
            <h4 className="text-xs font-bold text-foreground/50 uppercase tracking-[0.2em] mb-3">Cross-video topics</h4>
            {data.topics.length === 0 ? (
              <p className="text-sm text-foreground/40">Summarize videos to grow your topic map.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data.topics.slice(0, 24).map(t => (
                  <button
                    key={t.topic}
                    onClick={() => onSearch(t.topic)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${q.toLowerCase() === t.topic.toLowerCase() ? 'bg-primary text-white border-primary' : 'bg-foreground/5 hover:bg-foreground/10 text-foreground/70 border-border/40'}`}
                    title={`${t.count} videos`}
                  >
                    {t.topic} <span className="opacity-50">·{t.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Results */}
          <div className="lg:col-span-2 space-y-3">
            {data.results.length === 0 ? (
              <div className="p-10 text-center glass border border-border/50 rounded-3xl">
                <FileText className="w-10 h-10 text-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-foreground/50">No matches{data.query ? ` for "${data.query}"` : " yet — summarize a video to start your library"}.</p>
              </div>
            ) : (
              data.results.map(r => (
                <Link key={r.videoId} href={`/summary/${r.videoId}`} className="block glass border border-border/50 rounded-2xl p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">{r.title}</div>
                      <div className="text-xs text-foreground/50 mt-0.5">{r.channel}</div>
                    </div>
                    {r.freshness > 0 && (
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-[10px] font-bold">{r.freshness} claims checked</span>
                    )}
                  </div>
                  <p className="mt-2 text-[13px] font-medium text-foreground/70 leading-relaxed line-clamp-2">{r.excerpt}</p>
                  {(r.topics.length > 0 || r.entities.length > 0) && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {r.topics.map(t => <span key={t} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">{t}</span>)}
                      {r.entities.map(en => <span key={en} className="px-2 py-0.5 rounded-full bg-foreground/5 text-foreground/50 text-[10px] font-bold">{en}</span>)}
                    </div>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
