'use client';

import { useTheme } from '@/lib/theme';

const LINKS = [
  { label: 'Sia', href: 'https://sia.tech' },
  { label: 'How It Works', href: 'https://sia.tech/how-it-works' },
  { label: 'About', href: 'https://sia.tech/about' },
  { label: 'Privacy Policy', href: 'https://sia.tech/privacy-policy' },
  {
    label: 'Terms of Service',
    href: 'https://sia.tech/terms-of-service',
  },
];

function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function Footer() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  return (
    <footer className="flex flex-col items-center gap-3 py-6 px-4 bg-[#0f0f0f] light:bg-white border-t border-[#2d2d2d] light:border-[#e0e0e0]">
      <nav className="flex flex-wrap justify-center items-center gap-x-5 gap-y-2">
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] text-[#757575] light:text-[#999] hover:text-[#e7e7e7] light:hover:text-[#1a1a1a] transition-colors no-underline"
          >
            {link.label}
          </a>
        ))}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-1.5 rounded-md text-[#757575] light:text-[#999] hover:text-[#e7e7e7] light:hover:text-[#1a1a1a] hover:bg-[#1a1a1a] light:hover:bg-[#f3f4f6] transition-colors"
          aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {isLight ? <MoonIcon /> : <SunIcon />}
        </button>
      </nav>
      <p className="text-[13px] text-[#757575] light:text-[#999] opacity-60 m-0">
        &copy; {new Date().getFullYear()} The Sia Foundation
      </p>
    </footer>
  );
}
