"use client";

import { useMemo, useState } from "react";
import { GraduationCap, RefreshCw, Copy, CheckCircle2, GraduationCap as Cap, BookOpen } from "lucide-react";

export interface CourseCard {
  front: string;
  back: string;
  tags: string[];
  video: string;
}

interface CourseStudyProps {
  deck: CourseCard[];
  doneCount: number;
  totalCount: number;
  onRefresh?: () => void;
}

/**
 * Whole-course study system for a playlist: aggregated flashcards + quiz +
 * one-click Anki export across every completed lecture.
 */
export default function CourseStudy({ deck, doneCount, totalCount, onRefresh }: CourseStudyProps) {
  const [mode, setMode] = useState<"cards" | "quiz">("cards");
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizChoice, setQuizChoice] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [copied, setCopied] = useState(false);

  const topics = useMemo(() => {
    const s = new Set<string>();
    deck.forEach(c => c.tags.forEach(t => { if (t !== "framework" && t !== "topic" && t !== "quote" && t !== "critique" && !t.startsWith("video:")) s.add(t); }));
    return [...s].sort();
  }, [deck]);

  // Quiz questions from framework/topic cards (name ⇄ description).
  const quiz = useMemo(() => {
    const source = deck.filter(c => c.tags.includes("framework") || c.tags.includes("topic"));
    const pool = [...new Set(source.map(c => c.front))];
    const seen = new Set<string>();
    return source
      .map(c => ({ question: c.back, correct: c.front }))
      .filter(x => { if (seen.has(x.correct)) return false; seen.add(x.correct); return true; })
      .slice(0, 25)
      .map(x => {
        const others = pool.filter(n => n !== x.correct).slice(0, 4);
        return { ...x, options: [x.correct, ...others].sort(() => Math.random() - 0.5) };
      });
  }, [deck]);

  const buildAnki = () => {
    const lines = deck.map(c => {
      const tags = ["synop", "video:" + c.video.replace(/[^a-z0-9]/gi, "_").slice(0, 30), ...c.tags].join(" ");
      return `${c.front}\t${c.back}\t${tags}`;
    });
    return lines.join("\n");
  };

  const copyAnki = async () => {
    try {
      await navigator.clipboard.writeText(buildAnki());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const card = deck[idx];

  if (deck.length === 0) {
    return (
      <div className="glass border border-border/50 rounded-3xl p-12 text-center">
        <BookOpen className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-foreground">No study material yet</h3>
        <p className="text-sm text-foreground/50 mt-2 max-w-md mx-auto">
          Summarize at least one lecture in this playlist, then come back — the whole course study deck, quiz, and Anki export appear here.
        </p>
        {onRefresh && (
          <button onClick={onRefresh} className="mt-5 h-10 px-5 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 inline-flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="glass border border-border/50 rounded-3xl overflow-hidden shadow-xl shadow-foreground/5">
      {/* Header */}
      <div className="p-6 border-b border-border/50 bg-foreground/[0.02] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Course Study</h3>
            <p className="text-sm text-foreground/50 mt-0.5">
              {doneCount} / {totalCount} lectures • {deck.length} cards • {topics.length} topics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setMode("cards"); setFlipped(false); setIdx(0); }} className={`h-9 px-4 rounded-xl text-xs font-bold transition-colors ${mode === "cards" ? "bg-primary text-white" : "bg-foreground/5 hover:bg-foreground/10"}`}>Flashcards</button>
          <button onClick={() => { setMode("quiz"); setQuizIdx(0); setQuizScore(0); setQuizChoice(null); setQuizDone(false); }} className={`h-9 px-4 rounded-xl text-xs font-bold transition-colors ${mode === "quiz" ? "bg-primary text-white" : "bg-foreground/5 hover:bg-foreground/10"}`}>Quiz</button>
          <button onClick={copyAnki} className="h-9 px-4 bg-foreground text-background rounded-xl text-xs font-bold hover:opacity-90 inline-flex items-center gap-1.5">
            {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? "Copied!" : "Copy Course Anki"}
          </button>
        </div>
      </div>

      <div className="p-6 md:p-8">
        {mode === "cards" && (
          <div className="max-w-2xl mx-auto">
            <div onClick={() => setFlipped(f => !f)} className="cursor-pointer min-h-[260px]">
              <div className={`relative w-full min-h-[260px] glass border rounded-3xl shadow-xl p-8 transition-all duration-300 flex flex-col items-center justify-center text-center ${flipped ? "bg-primary text-white border-primary" : "border-border/50"}`}>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 mb-4">{flipped ? "Back" : "Front"} · tap to flip</span>
                {card ? (
                  <p className={`text-xl md:text-2xl font-bold leading-snug whitespace-pre-wrap ${flipped ? "text-white" : "text-foreground"}`}>{flipped ? card.back : card.front}</p>
                ) : null}
                {card && (
                  <span className={`mt-4 text-[10px] font-bold uppercase tracking-wider ${flipped ? "text-white/60" : "text-foreground/30"}`}>{card.video}</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between mt-6">
              <button onClick={() => { setIdx(i => Math.max(0, i - 1)); setFlipped(false); }} disabled={idx === 0} className="h-10 px-5 bg-foreground/5 hover:bg-foreground/10 disabled:opacity-40 rounded-xl text-sm font-bold transition-colors">← Prev</button>
              <span className="text-sm font-bold text-foreground/50">{idx + 1} / {deck.length}</span>
              <button onClick={() => { setIdx(i => Math.min(deck.length - 1, i + 1)); setFlipped(false); }} disabled={idx >= deck.length - 1} className="h-10 px-5 bg-foreground text-background hover:opacity-90 disabled:opacity-40 rounded-xl text-sm font-bold transition-colors">Next →</button>
            </div>
          </div>
        )}

        {mode === "quiz" && (
          <div className="max-w-2xl mx-auto">
            {quizDone ? (
              <div className="text-center p-10 glass border border-border/50 rounded-3xl">
                <Cap className="w-12 h-12 text-primary mx-auto mb-4" />
                <h4 className="text-2xl font-bold mb-2">Quiz complete!</h4>
                <p className="text-lg text-foreground/70 mb-6">You got <span className="font-bold text-primary">{quizScore}</span> / {quiz.length} correct</p>
                <button onClick={() => { setQuizIdx(0); setQuizScore(0); setQuizChoice(null); setQuizDone(false); }} className="bg-primary text-white px-6 py-3 rounded-full font-bold">Restart Quiz</button>
              </div>
            ) : quiz.length === 0 ? (
              <div className="text-center p-10 glass rounded-3xl"><p className="text-foreground/60">Not enough frameworks/topics across the course to build a quiz yet.</p></div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground/50">Question {quizIdx + 1} / {quiz.length}</span>
                  <span className="text-sm font-bold text-foreground/50">Score: {quizScore}</span>
                </div>
                <div className="glass border border-border/50 rounded-3xl p-8">
                  <h4 className="text-lg font-bold mb-2">Which concept does this describe?</h4>
                  <p className="text-[15px] font-medium text-foreground/70 leading-relaxed mb-6">"{quiz[quizIdx]?.question}"</p>
                  <div className="space-y-3">
                    {quiz[quizIdx]?.options?.map(opt => {
                      const isCorrect = opt === quiz[quizIdx].correct;
                      const isChosen = quizChoice === opt;
                      return (
                        <button
                          key={opt}
                          onClick={() => {
                            if (quizChoice) return;
                            setQuizChoice(opt);
                            if (isCorrect) setQuizScore(s => s + 1);
                            setTimeout(() => {
                              if (quizIdx + 1 >= quiz.length) setQuizDone(true);
                              else { setQuizIdx(i => i + 1); setQuizChoice(null); }
                            }, 800);
                          }}
                          className={`w-full text-left p-4 rounded-2xl border text-sm font-medium transition-all ${quizChoice === null ? 'bg-foreground/5 hover:bg-foreground/10 border-border/50' : isCorrect ? 'bg-green-500/10 border-green-500/50 text-green-700' : isChosen ? 'bg-red-500/10 border-red-500/50 text-red-700' : 'bg-foreground/5 border-border/50 opacity-50'}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
