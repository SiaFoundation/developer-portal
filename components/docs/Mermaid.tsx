'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/lib/theme';

export function Mermaid({ encoded }: { encoded: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState('');
  const { theme } = useTheme();

  const chart = encoded ? atob(encoded) : '';
  const isLight = theme === 'light';

  useEffect(() => {
    if (!chart) return;
    let cancelled = false;
    async function render() {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: isLight ? 'default' : 'dark',
          fontFamily: 'inherit',
        });
        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
        const { svg: rendered } = await mermaid.render(id, chart);
        if (!cancelled) setSvg(rendered);
      } catch (err) {
        console.error('Mermaid render error:', err);
      }
    }
    render();
    return () => {
      cancelled = true;
    };
  }, [chart, isLight]);

  if (!chart) return null;

  return (
    <div
      ref={ref}
      className="my-6 flex justify-center overflow-x-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}
