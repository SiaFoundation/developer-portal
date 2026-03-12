'use client';

import Link from 'next/link';
import { SearchButton } from '@/components/docs/Search';

interface HeaderProps {
  onMenuToggle?: () => void;
  menuOpen?: boolean;
}

export function Header({ onMenuToggle, menuOpen }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 h-[50px] bg-[#0f0f0f] light:bg-white border-b border-[#2d2d2d] light:border-[#e0e0e0] z-[100]">
      <div className="flex items-center h-full px-3 pr-4">
        {/* Mobile menu button (docs pages only) */}
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="md:hidden shrink-0 mr-2 p-1.5 text-[#757575] hover:text-[#e7e7e7]"
            aria-label="Toggle sidebar"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        )}

        <Link href="/" className="shrink-0 mr-4 flex items-center gap-2 no-underline">
          <img src="/logo.png" alt="Sia" className="h-5 w-5" />
          <span className="text-[13px] font-medium text-[#e7e7e7] light:text-[#1a1a1a]">
            Sia Developer Portal
          </span>
        </Link>

        <div className="ml-auto shrink-0">
          <SearchButton />
        </div>
      </div>
    </header>
  );
}
