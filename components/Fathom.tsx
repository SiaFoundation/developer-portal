'use client';

import * as Fathom from 'fathom-client';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

function FathomTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    Fathom.load('LOLUTYWQ', { auto: false });
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    Fathom.trackPageview({
      url: `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`,
    });
  }, [pathname, searchParams]);

  return null;
}

export function FathomAnalytics() {
  return (
    <Suspense fallback={null}>
      <FathomTracker />
    </Suspense>
  );
}
