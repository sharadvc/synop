"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Play, RotateCcw, TrendingUp } from "lucide-react";

/**
 * Course progress tracker for a playlist: lectures done, next-up, mastery %.
 * Persists manual "done" marks in localStorage keyed by playlist id.
 */
export default function CourseTracker({
  playlistId,
  items,
  doneIds,
}: {
  playlistId: string;
  items: { id: string; title: string }[];
  doneIds: string[];
}) {
  const KEY = `synop_course_${playlistId}`;
  const [localDone, setLocalDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "[]");
      setLocalDone(new Set(Array.isArray(s) ? s : []));
    } catch {}
  }, [KEY]);

  const done = useMemo(() => {
    const d = new Set(doneIds);
    localDone.forEach(x => d.add(x));
    return d;
  }, [doneIds, localDone]);

  const total = items.length;
  const doneCount = items.filter(i => done.has(i.id)).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const nextUp = items.find(i => !done.has(i.id));

  const toggle = (id: string) => {
    setLocalDone(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const reset = () => {
    setLocalDone(new Set());
    localStorage.setItem(KEY, "[]");
  };

  if (total === 0) return null;

  return (
    <div className="glass border border-border/50 rounded-3xl p-6 shadow-xl shadow-foreground/5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Course Progress</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-foreground/60">{doneCount}/{total} lectures · {pct}%</span>
          <button onClick={reset} className="text-[11px] font-bold text-foreground/40 hover:text-foreground inline-flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-foreground/10 overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      {nextUp && (
        <p className="mt-3 text-sm font-medium text-foreground/70 flex items-center gap-2">
          <Play className="w-3.5 h-3.5 text-primary shrink-0" /> Next up: <span className="font-bold truncate">{nextUp.title}</span>
        </p>
      )}
      {!nextUp && total > 0 && (
        <p className="mt-3 text-sm font-bold text-green-600">🎉 Course complete!</p>
      )}
      <div className="mt-4 max-h-56 overflow-y-auto space-y-1 pr-1">
        {items.map((it, i) => {
          const isDone = done.has(it.id);
          return (
            <button key={it.id} onClick={() => toggle(it.id)} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-accent/40 transition-colors text-left">
              {isDone ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" /> : <Circle className="w-4 h-4 text-foreground/30 shrink-0" />}
              <span className={`text-[13px] font-medium truncate ${isDone ? 'text-foreground/40 line-through' : 'text-foreground/80'}`}>{i + 1}. {it.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
