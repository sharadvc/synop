"use client";

import React, { useEffect, useRef } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
  fontFamily: "Inter, sans-serif"
});

export default function MermaidGraph({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && chart) {
      mermaid.render("mermaid-svg-" + Date.now(), chart).then((result) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = result.svg;
        }
      }).catch(e => console.error("Mermaid parsing failed", e));
    }
  }, [chart]);

  return (
    <div 
      ref={containerRef} 
      className="w-full overflow-auto flex justify-center p-8 bg-background/5 rounded-2xl border border-border/50 shadow-inner min-h-[300px]"
    />
  );
}
