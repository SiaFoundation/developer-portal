'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { NavItem } from '@/lib/docs';

function pathToHref(filePath: string): string {
  return '/docs/' + filePath.replace(/\.md$/, '').replace(/\/index$/, '');
}

function NavSection({
  item,
  pathname,
  depth = 0,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  depth?: number;
  onNavigate?: () => void;
}) {
  const hasChildren = item.children && item.children.length > 0;
  const href = item.path ? pathToHref(item.path) : undefined;
  const isActive = href === pathname;

  function isChildActive(items: NavItem[]): boolean {
    for (const child of items) {
      if (child.path && pathToHref(child.path) === pathname) return true;
      if (child.children && isChildActive(child.children)) return true;
    }
    return false;
  }

  const childActive = hasChildren ? isChildActive(item.children!) : false;
  // Previously: useState(childActive || isActive)
  const [isOpen, setIsOpen] = useState(true);

  if (hasChildren && !item.path) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between text-left text-[13px] font-medium py-1.5 transition-colors ${
            depth === 0
              ? 'text-[#e7e7e7] light:text-[#1a1a1a]'
              : 'text-[#999] light:text-[#666] hover:text-[#e7e7e7] light:hover:text-[#1a1a1a]'
          }`}
        >
          {item.title}
          <svg
            className={`w-3.5 h-3.5 transition-transform shrink-0 ${isOpen ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
        {isOpen && (
          <div className="ml-3 border-l border-[#2d2d2d] light:border-[#e0e0e0] pl-3 mt-0.5">
            {item.children!.map((child) => (
              <NavSection
                key={child.title}
                item={child}
                pathname={pathname}
                depth={depth + 1}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (href) {
    return (
      <Link
        href={href}
        onClick={onNavigate}
        className={`block text-[13px] py-1.5 transition-colors no-underline ${
          isActive
            ? 'text-[#0099ff] font-medium'
            : 'text-[#999] light:text-[#666] hover:text-[#e7e7e7] light:hover:text-[#1a1a1a]'
        }`}
      >
        {item.title}
      </Link>
    );
  }

  return null;
}

export function Sidebar({
  nav,
  mobileOpen,
  onClose,
}: {
  nav: NavItem[];
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-[150]"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          w-[260px] shrink-0 border-r border-[#2d2d2d] light:border-[#e0e0e0]
          bg-[#0f0f0f] light:bg-white overflow-y-auto scrollbar-none
          sticky top-[50px] h-[calc(100vh-50px)] p-4
          max-md:fixed max-md:left-0 max-md:z-[160] max-md:transition-transform
          ${mobileOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'}
        `}
      >
        <div className="space-y-4">
          {nav.map((section) => (
            <NavSection
              key={section.title}
              item={section}
              pathname={pathname}
              onNavigate={onClose}
            />
          ))}
        </div>
      </aside>
    </>
  );
}
