'use client';

import { useEffect, useState } from 'react';
import type { TOCItem } from '@/lib/docs';

export function TableOfContents({ items }: { items: TOCItem[] }) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (items.length === 0) return;

    const headingIds = items.map((item) => item.id);

    const updateActive = () => {
      const headerOffset = 80;
      let current = '';
      for (const id of headingIds) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.getBoundingClientRect().top;
          if (top <= headerOffset) {
            current = id;
          }
        }
      }
      // If no heading is above the header offset, use the first one
      if (!current && headingIds.length > 0) {
        current = headingIds[0];
      }
      // Near bottom of page, activate the last heading
      const atBottom =
        window.innerHeight + window.scrollY >= document.body.scrollHeight - 50;
      if (atBottom && headingIds.length > 0) {
        current = headingIds[headingIds.length - 1];
      }
      setActiveId(current);
    };

    updateActive();
    window.addEventListener('scroll', updateActive, { passive: true });
    return () => window.removeEventListener('scroll', updateActive);
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav className="hidden xl:block w-[200px] shrink-0 sticky top-[50px] h-[calc(100vh-50px)] overflow-y-auto scrollbar-none py-10 pr-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#757575] light:text-[#999] mb-3">
        On this page
      </p>
      <ul className="space-y-1.5 list-none m-0 p-0">
        {items.map((item) => (
          <li key={item.id} className={item.level === 3 ? 'ml-3' : ''}>
            <a
              href={`#${item.id}`}
              className={`block text-[12px] py-0.5 transition-colors no-underline ${
                activeId === item.id
                  ? 'text-[#0099ff]'
                  : 'text-[#757575] light:text-[#999] hover:text-[#e7e7e7] light:hover:text-[#1a1a1a]'
              }`}
            >
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
