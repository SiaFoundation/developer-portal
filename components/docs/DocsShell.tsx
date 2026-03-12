'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/docs/Sidebar';
import { Header } from '@/components/Header';
import type { NavItem } from '@/lib/docs';

export function DocsShell({
  nav,
  children,
}: {
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <>
      <Header
        onMenuToggle={() => setSidebarOpen((v) => !v)}
        menuOpen={sidebarOpen}
      />
      <div className="pt-[50px] min-h-screen flex">
        <Sidebar
          nav={nav}
          mobileOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </>
  );
}
