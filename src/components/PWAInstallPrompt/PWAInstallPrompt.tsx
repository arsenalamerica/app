'use client';

import { lazy, Suspense, useEffect, useState } from 'react';

const PWAPrompt = lazy(() => import('react-ios-pwa-prompt'));

export function PWAInstallPrompt() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <Suspense fallback={null}>
      <PWAPrompt promptOnVisit={1} timesToShow={3} />
    </Suspense>
  );
}
