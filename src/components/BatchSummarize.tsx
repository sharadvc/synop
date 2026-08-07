"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, CheckCircle2, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

interface BatchSummarizeProps {
  /** The unprocessed videos in the playlist. */
  items: { id: string; title: string }[];
  language: string;
}

interface Result {
  title: string;
  ok: boolean;
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
 * tracks per-video results, and lets you retry only the failures.
 */
export default function BatchSummarize({ items, language }: BatchSummarizeProps) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [worklist, setWorklist] = useState<{ id: string; title: string }[]>([]);
  const [index, setIndex] = useState(0);
  const [current, setCurrent] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [finished, setFinished] = useState(false);

  const run = async (todo: { id: string; title: string }[]) => {
    if (running || todo.length === 0) return;
    setRunning(true);
    setWorklist(todo);
    setIndex(0);
    setResults([]);
    setFinished(false);
    const acc: Result[] = [];

    for (let i = 0; i < todo.length; i++) {
      const it = todo[i];
      setCurrent(it.title);
      setIndex(i + 1);
      let ok = false;
      try {
        const res = await fetch("/api/summarize", {
          method: "POST",
          headers: apiHeaders(),
          body: JSON.stringify({ url: `https://youtube.com/watch?v=${it.id}`, language }),
        });
        const j = await res.json();
        ok = !j.error && !!j.summary;
        if (!ok) console.warn("[batch] failed:", it.title, j.error || "no summary");
      } catch (e: any) {
        console.warn("[batch] error:", it.title, e.message);
      }
      acc.push({ title: it.title, ok });
      setResults([...acc]);
      // Breathe between videos to avoid free-tier rate-limit bursts.
      await new Promise(r => setTimeout(r, 500));
    }

    setRunning(false);
    setFinished(true);
    setShowResults(true);
    router.refresh();
  };

  if (items.length === 0 && !finished) return null;

  const doneCount = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok);
  const pct = worklist.length ? Math.round((index / worklist.length) * 100) : 0;

  return (
    <div className="flex flex-col items-end gap-2">
      {!running && !finished && (
        <button
          onClick={() => run(items)}
          className="bg-primary text-primary-foreground px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all inline-flex items-center gap-2"
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
            {index} / {worklist.length} — {current}
          </p>
        </div>
      )}

      {finished && !running && (
        <div className="w-80 text-right space-y-2">
          <div className={`text-xs font-bold flex items-center justify-end gap-1.5 ${failed.length === 0 ? "text-green-600" : "text-yellow-600"}`}>
            {failed.length === 0 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {failed.length === 0 ? "All videos summarized!" : `${doneCount}/${results.length} done, ${failed.length} failed`}
          </div>

          {failed.length > 0 && (
            <>
              <button
                onClick={() => run(failed.map(f => ({ id: items.find(i => i.title === f.title)?.id || "", title: f.title })).filter(x => x.id))}
                className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Retry {failed.length} failed
              </button>
              <button onClick={() => setShowResults(s => !s)} className="text-[11px] font-bold text-foreground/40 hover:text-foreground inline-flex items-center gap-1">
                {showResults ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} {showResults ? "Hide" : "Show"} results
              </button>
            </>
          )}

          {showResults && results.length > 0 && (
            <div className="text-right max-h-48 overflow-y-auto space-y-0.5">
              {results.map((r, i) => (
                <div key={i} className={`text-[11px] font-medium truncate ${r.ok ? "text-green-600/80" : "text-red-500/80"}`}>
                  {r.ok ? "✓" : "✗"} {r.title}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {finished && failed.length === 0 && (
        <button
          onClick={() => { setFinished(false); setShowResults(false); }}
          className="text-[11px] font-bold text-foreground/40 hover:text-foreground"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
