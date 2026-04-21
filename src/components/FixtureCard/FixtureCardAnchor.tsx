'use client';

import { type ReactNode, useEffect, useRef } from 'react';

// Isolated client boundary — keeps the scroll effect out of the PPR-eligible
// page body while centering the next fixture in the viewport on first paint.
export function FixtureCardAnchor({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'instant', block: 'center' });
  }, []);
  return <div ref={ref}>{children}</div>;
}
