"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Plus, X, Loader2, RefreshCw, Radio, Bell, Sparkles, CheckCircle2, Play } from "lucide-react";

interface ChannelInfo {
  channelId: string;
  title: string;
  handle?: string;
  avatar?: string;
  description?: string;
}

interface WatchChannel extends ChannelInfo {
  id: string;
  autoSummarize: boolean;
}

interface NewVideo {
  id: string;
  title: string;
  publishedAt: string;
  thumbUrl: string;
}

interface CheckResult {
  channel: { id: string; channelId: string; title: string; avatar: string | null; autoSummarize: boolean };
  uploads: NewVideo[];
  newVideos: NewVideo[];
}

const apiHeaders = () => ({
  "Content-Type": "application/json",
  "x-gemini-key": localStorage.getItem("gemini_key") || "",
  "x-groq-key": localStorage.getItem("groq_key") || "",
  "x-openrouter-key": localStorage.getItem("openrouter_key") || "",
});

export default function ChannelsPanel({ language = "English" }: { language?: string }) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ChannelInfo[]>([]);
  const [channels, setChannels] = useState<WatchChannel[]>([]);
  const [checking, setChecking] = useState(false);
  const [checkResults, setCheckResults] = useState<CheckResult[]>([]);
  const [summarizing, setSummarizing] = useState<Record<string, { index: number; total: number }>>({});
  const autoCheckedRef = useRef(false);

  const load = async () => {
    try {
      const res = await fetch("/api/watchlist");
      const j = await res.json();
      setChannels(j.channels || []);
    } catch {}
  };

  // Debounced live channel search
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/channels/search?q=${encodeURIComponent(query.trim())}`);
        const j = await res.json();
        setResults(j.results || []);
      } catch {}
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  // On mount: load the watchlist, then auto-check for new uploads once.
  useEffect(() => {
    load().then(() => {
      if (!autoCheckedRef.current) {
        autoCheckedRef.current = true;
        checkAll(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addChannel = async (c: ChannelInfo) => {
    await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: c.channelId, title: c.title, handle: c.handle, avatar: c.avatar }),
    });
    setQuery("");
    setResults([]);
    load();
  };

  const removeChannel = async (id: string) => {
    await fetch("/api/watchlist", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  };

  const toggleAuto = async (ch: WatchChannel) => {
    await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: ch.channelId, title: ch.title, handle: ch.handle, avatar: ch.avatar, autoSummarize: !ch.autoSummarize }),
    });
    load();
  };

  const summarizeVideos = async (channelId: string, videos: NewVideo[]) => {
    setSummarizing(s => ({ ...s, [channelId]: { index: 0, total: videos.length } }));
    for (let i = 0; i < videos.length; i++) {
      setSummarizing(s => ({ ...s, [channelId]: { index: i + 1, total: videos.length } }));
      try {
        await fetch("/api/summarize", {
          method: "POST",
          headers: apiHeaders(),
          body: JSON.stringify({ url: `https://youtube.com/watch?v=${videos[i].id}`, language }),
        });
      } catch {}
      await new Promise(r => setTimeout(r, 400));
    }
    setSummarizing(s => { const n = { ...s }; delete n[channelId]; return n; });
  };

  const checkAll = async (auto = false) => {
    if (checking) return;
    setChecking(true);
    let j: any = {};
    try {
      const res = await fetch("/api/watchlist/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      j = await res.json();
      setCheckResults(j.results || []);
    } catch {}
    setChecking(false);
    if (auto) {
      for (const r of j.results || []) {
        if (r.channel.autoSummarize && r.newVideos.length > 0) {
          await summarizeVideos(r.channel.channelId, r.newVideos);
        }
      }
    }
  };

  const summarizeChannelNew = async (r: CheckResult) => {
    await summarizeVideos(r.channel.channelId, r.newVideos);
    checkAll(true);
  };

  const isInWatchlist = (cid: string) => channels.some(c => c.channelId === cid);

  return (
    <div className="space-y-8 animate-rise stagger-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Radio className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2"><Bell className="w-5 h-5 text-primary" /> Channel Watchlist</h3>
            <p className="text-sm text-foreground/50 mt-0.5">New uploads from watched channels get auto-summarized.</p>
          </div>
        </div>
        <button
          onClick={() => checkAll(true)}
          disabled={checking || channels.length === 0}
          className="h-10 px-5 bg-foreground text-background rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-40 inline-flex items-center gap-2"
        >
          {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {checking ? "Checking…" : "Check for new uploads"}
        </button>
      </div>

      {/* Live search */}
      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
            <input
              type="text"
              placeholder="Search YouTube channels… (e.g. 'Lex Fridman', '@a16z')"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full h-12 pl-11 pr-4 glass border border-border/50 rounded-2xl text-sm outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </div>
          {searching && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
        </div>

        {results.length > 0 && (
          <div className="absolute left-0 right-0 top-14 z-30 mt-1 glass border border-border/50 rounded-2xl shadow-2xl overflow-hidden bg-background">
            {results.map(c => (
              <div key={c.channelId} className="p-3 flex items-center gap-3 hover:bg-accent/50 transition-colors">
                <img src={c.avatar || ""} className="w-10 h-10 rounded-full object-cover border border-border/50" />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm truncate">{c.title}</div>
                  <div className="text-xs text-foreground/50 truncate">{c.handle ? `@${c.handle.replace("@", "")}` : c.description?.slice(0, 40) || "YouTube channel"}</div>
                </div>
                {isInWatchlist(c.channelId) ? (
                  <span className="text-[11px] font-bold text-green-600 inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Added</span>
                ) : (
                  <button onClick={() => addChannel(c)} className="h-9 px-4 bg-primary text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 hover:opacity-90">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Watchlist */}
      {channels.length === 0 ? (
        <div className="p-12 text-center glass border border-border/50 rounded-3xl">
          <Radio className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
          <p className="font-bold text-foreground">No channels watched yet</p>
          <p className="text-sm text-foreground/50 mt-1 max-w-md mx-auto">Search for your favorite creators above and add them. New uploads will be auto-summarized into your library.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {channels.map(ch => (
            <div key={ch.id} className="glass border border-border/50 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <img src={ch.avatar || ""} className="w-12 h-12 rounded-full object-cover border border-border/50" />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm truncate">{ch.title}</div>
                  <div className="text-xs text-foreground/50 truncate">{ch.handle ? `@${ch.handle.replace("@", "")}` : "YouTube channel"}</div>
                </div>
                <button onClick={() => removeChannel(ch.id)} className="w-8 h-8 rounded-lg text-foreground/40 hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <label className="mt-4 flex items-center justify-between px-3 py-2 rounded-xl bg-foreground/5 border border-border/40 cursor-pointer">
                <span className="text-xs font-bold text-foreground/70 inline-flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Auto-summarize new uploads
                </span>
                <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${ch.autoSummarize ? "bg-primary" : "bg-foreground/15"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${ch.autoSummarize ? "translate-x-4" : "translate-x-0.5"}`} />
                </span>
                <input type="checkbox" className="sr-only" checked={ch.autoSummarize} onChange={() => toggleAuto(ch)} />
              </label>

              {summarizing[ch.channelId] && (
                <div className="mt-3 space-y-1">
                  <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.round((summarizing[ch.channelId].index / summarizing[ch.channelId].total) * 100)}%` }} />
                  </div>
                  <p className="text-[11px] font-bold text-foreground/60">Summarizing {summarizing[ch.channelId].index}/{summarizing[ch.channelId].total} new…</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Latest uploads / new video results */}
      {checkResults.some(r => r.newVideos.length > 0) && (
        <div className="space-y-5">
          <h4 className="text-sm font-bold text-foreground/60 uppercase tracking-[0.2em] flex items-center gap-2"><Play className="w-4 h-4" /> New uploads detected</h4>
          {checkResults.filter(r => r.newVideos.length > 0).map(r => (
            <div key={r.channel.id} className="glass border border-border/50 rounded-3xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border/50 bg-foreground/[0.02] flex items-center justify-between gap-3">
                <span className="font-bold text-sm truncate flex items-center gap-2">
                  <img src={r.channel.avatar || ""} className="w-6 h-6 rounded-full" /> {r.channel.title}
                </span>
                <button onClick={() => summarizeChannelNew(r)} disabled={!!summarizing[r.channel.channelId]} className="h-8 px-3 rounded-lg bg-primary text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50">
                  <Sparkles className="w-3.5 h-3.5" /> Summarize {r.newVideos.length} new
                </button>
              </div>
              <div className="divide-y divide-border/40">
                {r.newVideos.map(v => (
                  <div key={v.id} className="px-5 py-3 flex items-center gap-3">
                    <img src={v.thumbUrl || ""} className="w-20 h-12 object-cover rounded-lg border border-border/50" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold truncate">{v.title}</div>
                      <div className="text-xs text-foreground/50">{new Date(v.publishedAt).toLocaleDateString()}</div>
                    </div>
                    <a href={`/summary/${v.id}`} className="text-xs font-bold text-primary hover:underline whitespace-nowrap">Open</a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
