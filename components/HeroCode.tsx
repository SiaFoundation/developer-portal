'use client';

import { useEffect, useState } from 'react';
import type { HeroExample } from '@/lib/hero-snippets';

const CYCLE_MS = 4000;

export function HeroCode({ examples }: { examples: HeroExample[] }) {
  const [index, setIndex] = useState(0);
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (pinned || hovered) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % examples.length),
      CYCLE_MS,
    );
    return () => clearInterval(timer);
  }, [pinned, hovered, examples.length]);

  const example = examples[index];

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover only pauses the auto-cycle; keyboard users pin a language via the tab buttons
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-lg border border-[#2d2d2d] light:border-[#e0e0e0] bg-[#0d1117] light:bg-[#f6f8fa] overflow-hidden shadow-2xl shadow-black/40 light:shadow-none"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-[#2d2d2d] light:border-[#e0e0e0]">
        <span className="font-mono text-[11px] text-[#757575] light:text-[#6e7781]">
          {example.file}
        </span>
        <div className="flex gap-1">
          {examples.map((ex, i) => (
            <button
              key={ex.name}
              type="button"
              onClick={() => {
                setIndex(i);
                setPinned(true);
              }}
              className={`rounded px-1.5 py-0.5 text-[11px] transition-colors ${
                i === index
                  ? 'text-[#e7e7e7] light:text-[#1a1a1a] bg-[#2d2d2d] light:bg-[#e0e0e0]'
                  : 'text-[#757575] light:text-[#999] hover:text-[#e7e7e7] light:hover:text-[#1a1a1a]'
              }`}
            >
              {ex.name}
            </button>
          ))}
        </div>
      </div>
      <div
        className="hero-code"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: build-time shiki output from our own snippet strings
        dangerouslySetInnerHTML={{ __html: example.html }}
      />
    </div>
  );
}
