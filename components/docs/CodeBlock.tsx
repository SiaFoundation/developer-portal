'use client';

import { type ReactNode, useRef, useState } from 'react';

export function CodeBlock({
  children,
  ...props
}: {
  children: ReactNode;
  'data-language'?: string;
  'data-theme'?: string;
}) {
  const [copied, setCopied] = useState(false);
  const rawLanguage = props['data-language'];
  const language =
    rawLanguage && rawLanguage !== 'plaintext' ? rawLanguage : undefined;
  const contentRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    const text =
      contentRef.current?.textContent ??
      (typeof children === 'string' ? children : '');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block not-prose relative group rounded-lg overflow-hidden my-4 bg-[#0d1117] light:bg-[#f6f8fa] border border-[#2d2d2d] light:border-[#e0e0e0]">
      {language && (
        <div className="code-lang flex items-center justify-between px-4 py-1.5 border-b border-[#2d2d2d] light:border-[#e0e0e0]">
          <span className="text-[11px] text-[#757575] light:text-[#374151] uppercase tracking-wider">
            {language}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="text-[11px] text-[#757575] light:text-[#374151] hover:text-[#e7e7e7] light:hover:text-[#1a1a1a] transition-colors opacity-0 group-hover:opacity-100"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
      <div
        ref={contentRef}
        className="overflow-x-auto p-4 text-[13px] leading-relaxed text-[#e7e7e7] light:text-[#1a1a1a] [&_code]:whitespace-pre [&_code]:block"
      >
        {children}
      </div>
    </div>
  );
}
