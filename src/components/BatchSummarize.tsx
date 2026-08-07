"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

interface BatchSummarizeProps {
  /** The unprocessed videos in the playlist. */
  items: { id: string; title: string }[];
  language: string;
}

const apiHeaders = () => ({
  "Content-Type": "application/json",
  "x-gemini-key": localStorage.getItem("gemini_key") || "",
  "x-groq-key": localStorage.getItem("groq_key") || "",
  "x-openrouter-key": localStorage.getItem("openrouter_key") || "",
});

/**
 * "Summarize All Unprocessed" for a course playlist.
 * Runs sequentially (each video is a full AI pipeline) with live progress,
 * then refreshes the server-rendered playlist so completed states update.
 */
export default function BatchSummarize({ items, language }: BatchSummarizeProps) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);
  const [current, setCurrent] = useState("");
  const [failures, setFailures] = useState(0);
  const [finished, setFinished] = useState(false);

  const run = async () => {
    if (running || items.length === 0) return;
    setRunning(true);
    setIndex(0);
    setFailures(0);
    setFinished(false);
    let fails = 0;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      setCurrent(it.title);
      setIndex(i + 1);
      try {
        const res = await fetch("/api/summarize", {
          method: "POST",
          headers: apiHeaders(),
          body: JSON.stringify({ url: `https://youtube.com/watch?v=${it.id}`, language }),
        });
        const j = await res.json();
        if (j.error) {
          fails++;
          console.warn("[batch] failed:", it.title, j.error);
        }
      } catch (e: any) {
        fails++;
        console.warn("[batch] error:", it.title, e.message);
      }
      // Breathe between videos to avoid free-tier rate-limit bursts.
      await new Promise(r => setTimeout(r, 800));
    }

    setFailures(fails);
    setRunning(false);
    setFinished(true);
    router.refresh();
  };

  if (items.length === 0) return null;

  const pct = Math.round((index / items.length) * 100);

  return (
    <div className="flex flex-col items-end gap-2">
      {!running && (
        <button
          onClick={run}
          disabled={running}
          className="bg-primary text-primary-foreground px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" /> Summarize All Unprocessed
        </button>
      )}

      {running && (
        <div className="w-72 space-y-1.5">
          <div className="h-2 rounded-full bg-foreground/10 overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs font-bold text-foreground/70 flex items-center gap-2 truncate">
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            {index} / {items.length} — {current}
          </p>
        </div>
      )}

      {finished && (
        <div className={`text-xs font-bold flex items-center gap-1.5 ${failures === 0 ? "text-green-600" : "text-yellow-600"}`}>
          {failures === 0 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {failures === 0 ? "All videos summarized!" : `${items.length - failures}/${items.length} done, ${failures} failed`}
        </div>
      )}

      {finished && failures > 0 && (
        <button onClick={run} className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Retry failed
        </button>
      )}
    </div>
  );
}
