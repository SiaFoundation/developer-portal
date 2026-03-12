'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SearchEntry } from '@/lib/search-index';

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[#0099ff]/20 text-inherit rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function getSnippet(content: string, query: string): string {
  const lower = content.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return content.slice(0, 120);
  const start = Math.max(0, idx - 40);
  const end = Math.min(content.length, idx + query.length + 80);
  let snippet = content.slice(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';
  return snippet;
}

export function SearchButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 p-2 xl:px-3 xl:h-[30px] text-[12px] text-[#757575] light:text-[#999] xl:bg-[#1a1a1a] xl:light:bg-[#f3f4f6] xl:border xl:border-[#2d2d2d] xl:light:border-[#e0e0e0] rounded-md hover:text-[#e7e7e7] light:hover:text-[#1a1a1a] xl:hover:text-[#757575] xl:hover:border-[#404040] xl:light:hover:border-[#ccc] transition-colors cursor-pointer"
      >
        <SearchIcon className="shrink-0" />
        <span className="hidden xl:inline">Search...</span>
        <kbd className="hidden xl:inline text-[10px] text-[#555] light:text-[#aaa] ml-1 px-1.5 py-0.5 bg-[#0f0f0f] light:bg-white border border-[#2d2d2d] light:border-[#d1d5db] rounded">
          ⌘K
        </kbd>
      </button>
      {open && <SearchDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<SearchEntry[]>([]);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load index
  useEffect(() => {
    fetch('/api/search-index')
      .then((res) => res.json())
      .then(setIndex)
      .catch((err) => console.error('Failed to load search index:', err));
  }, []);

  // Focus input and lock body scroll
  useEffect(() => {
    inputRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Close on escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const results =
    query.length >= 2
      ? index
          .filter((entry) => {
            const q = query.toLowerCase();
            return (
              entry.title.toLowerCase().includes(q) ||
              entry.description.toLowerCase().includes(q) ||
              entry.content.toLowerCase().includes(q)
            );
          })
          .slice(0, 8)
      : [];

  useEffect(() => {
    setSelected(0);
  }, [query]);

  const navigate = useCallback(
    (slug: string) => {
      onClose();
      router.push(slug);
    },
    [onClose, router],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === 'Enter' && results[selected]) {
        e.preventDefault();
        navigate(results[selected].slug);
      }
    },
    [results, selected, navigate],
  );

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] sm:pt-[15vh]"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg mx-2 sm:mx-4 bg-[#1a1a1a] light:bg-white border border-[#2d2d2d] light:border-[#e0e0e0] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-3 sm:px-4 py-3 border-b border-[#2d2d2d] light:border-[#e0e0e0]">
          <SearchIcon className="shrink-0 text-[#757575]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search documentation..."
            className="flex-1 bg-transparent text-[14px] text-[#e7e7e7] light:text-[#1a1a1a] placeholder-[#555] light:placeholder-[#aaa] outline-none min-w-0"
          />
          <button
            type="button"
            onClick={onClose}
            className="sm:hidden shrink-0 p-1 text-[#757575] hover:text-[#e7e7e7]"
            aria-label="Close search"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <kbd className="hidden sm:inline-block shrink-0 text-[10px] text-[#555] light:text-[#aaa] px-1.5 py-0.5 bg-[#0f0f0f] light:bg-[#f3f4f6] border border-[#2d2d2d] light:border-[#d1d5db] rounded">
            ESC
          </kbd>
        </div>

        {query.length >= 2 && (
          <div className="max-h-[60vh] sm:max-h-[400px] overflow-y-auto">
            {results.length === 0 ? (
              <div className="px-4 py-8 text-center text-[13px] text-[#757575] light:text-[#999]">
                No results for &ldquo;{query}&rdquo;
              </div>
            ) : (
              <ul className="py-2">
                {results.map((entry, i) => (
                  <li key={entry.slug}>
                    <button
                      type="button"
                      className={`w-full text-left px-3 sm:px-4 py-3 transition-colors ${
                        i === selected
                          ? 'bg-[#0099ff]/10 light:bg-[#0099ff]/5'
                          : 'hover:bg-[#252525] light:hover:bg-[#f5f5f5]'
                      }`}
                      onClick={() => navigate(entry.slug)}
                      onMouseEnter={() => setSelected(i)}
                    >
                      {entry.section && (
                        <div className="text-[10px] text-[#555] light:text-[#aaa] uppercase tracking-wider mb-0.5">
                          {entry.section}
                        </div>
                      )}
                      <div className="text-[13px] font-medium text-[#e7e7e7] light:text-[#1a1a1a]">
                        {highlight(entry.title, query)}
                      </div>
                      <div className="text-[11px] text-[#757575] light:text-[#999] mt-0.5 line-clamp-2">
                        {highlight(getSnippet(entry.content, query), query)}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {query.length < 2 && (
          <div className="px-4 py-6 text-center text-[12px] text-[#555] light:text-[#aaa]">
            Type at least 2 characters to search
          </div>
        )}
      </div>
    </div>
  );
}
