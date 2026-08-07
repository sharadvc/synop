"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";

interface Card {
  front: string;
  back: string;
}

export default function SharedDeckView({
  title,
  sourceUrl,
  deck,
}: {
  title: string;
  sourceUrl: string | null;
  deck: Card[];
}) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (!deck || deck.length === 0) {
    return <div className="p-12 text-center">This deck is empty.</div>;
  }

  const card = deck[idx];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="text-center mb-6 max-w-md">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {sourceUrl && (
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 text-xs font-bold text-primary hover:underline inline-flex items-center gap-1">
            <Link2 className="w-3 h-3" /> Source video
          </a>
        )}
        <p className="text-xs text-foreground/40 mt-1">{deck.length} cards · shared via Synop</p>
      </div>

      <div onClick={() => setFlipped(f => !f)} className="cursor-pointer w-full max-w-xl">
        <div className={`relative w-full min-h-[260px] glass border rounded-3xl shadow-xl p-8 transition-all duration-300 flex flex-col items-center justify-center text-center ${flipped ? 'bg-primary text-white border-primary' : 'border-border/50'}`}>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 mb-4">{flipped ? 'Answer' : 'Question'} · tap to flip</span>
          <p className={`text-xl md:text-2xl font-bold leading-snug whitespace-pre-wrap ${flipped ? 'text-white' : 'text-foreground'}`}>{flipped ? card.back : card.front}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-6 w-full max-w-xl">
        <button onClick={() => { setIdx(i => Math.max(0, i - 1)); setFlipped(false); }} disabled={idx === 0} className="h-10 px-5 bg-foreground/5 hover:bg-foreground/10 disabled:opacity-40 rounded-xl text-sm font-bold transition-colors">← Prev</button>
        <span className="text-sm font-bold text-foreground/50">{idx + 1} / {deck.length}</span>
        <button onClick={() => { setIdx(i => Math.min(deck.length - 1, i + 1)); setFlipped(false); }} disabled={idx >= deck.length - 1} className="h-10 px-5 bg-foreground text-background hover:opacity-90 disabled:opacity-40 rounded-xl text-sm font-bold transition-colors">Next →</button>
      </div>
    </div>
  );
}
