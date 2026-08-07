"use client";

import { useMemo } from "react";

/**
 * Renders a framework as a radial mental-model diagram (SVG).
 * The framework name sits at the center; the satellite nodes are the key
 * phrases extracted deterministically from its description. No LLM involved —
 * the same description is shown verbatim underneath.
 */

interface FrameworkDiagramProps {
  name: string;
  description: string;
}

const W = 460;
const H = 300;
const CX = W / 2;
const CY = H / 2 + 10;
const R = 100;

function extractPhrases(desc: string): string[] {
  const parts = desc
    .split(/[.;:!?]|\band\b|,\s*/i)
    .map(p => p.trim())
    .filter(p => p.length >= 4 && p.length <= 90);
  const deduped = [...new Set(parts)].slice(0, 6);
  return deduped.length > 0 ? deduped : [desc.slice(0, 90)];
}

function wrap(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const mid = Math.floor(text.length / 2);
  const space = text.indexOf(" ", mid);
  if (space === -1) return [text.slice(0, max) + "…"];
  return [text.slice(0, space), text.slice(space + 1).slice(0, max) + "…"];
}

const PALETTE = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"];

export default function FrameworkDiagram({ name, description }: FrameworkDiagramProps) {
  const phrases = useMemo(() => extractPhrases(description), [description]);
  const centerLines = useMemo(() => wrap(name, 22), [name]);

  const sats = phrases.map((p, i) => {
    const angle = (i / phrases.length) * Math.PI * 2 - Math.PI / 2;
    const x = CX + Math.cos(angle) * R;
    const y = CY + Math.sin(angle) * R;
    return { x, y, label: p.length > 20 ? p.slice(0, 20) + "…" : p, full: p, color: PALETTE[i % PALETTE.length] };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[460px] mx-auto select-none" role="img" aria-label={`${name} mental model diagram`}>
      <defs>
        <filter id="fw-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* edges */}
      {sats.map((s, i) => (
        <g key={`e${i}`}>
          <line x1={CX} y1={CY} x2={s.x} y2={s.y} stroke={s.color} strokeOpacity={0.45} strokeWidth={1.5} strokeDasharray="4 3" />
        </g>
      ))}

      {/* satellite nodes */}
      {sats.map((s, i) => (
        <g key={`s${i}`}>
          <circle cx={s.x} cy={s.y} r={26} fill={`${s.color}1a`} stroke={s.color} strokeWidth={1.5} filter="url(#fw-glow)">
            <title>{s.full}</title>
          </circle>
          <text
            x={s.x}
            y={s.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="8.5"
            fontWeight={700}
            fill={s.color}
            style={{ pointerEvents: "none" }}
          >
            {s.label}
          </text>
        </g>
      ))}

      {/* center node */}
      <circle cx={CX} cy={CY} r={44} fill="var(--foreground)" filter="url(#fw-glow)" />
      <circle cx={CX} cy={CY} r={44} fill="none" stroke="var(--foreground)" strokeOpacity={0.2} strokeWidth={1} />
      <text
        x={CX}
        y={CY - (centerLines.length > 1 ? 4 : 0)}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="11"
        fontWeight={800}
        fill="var(--background)"
      >
        {centerLines[0]}
      </text>
      {centerLines[1] && (
        <text x={CX} y={CY + 14} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight={800} fill="var(--background)">
          {centerLines[1]}
        </text>
      )}
    </svg>
  );
}
