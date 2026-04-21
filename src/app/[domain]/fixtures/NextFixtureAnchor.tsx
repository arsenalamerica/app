'use client';

import { type ReactNode, useEffect, useRef } from 'react';

// Scrolls to the next upcoming fixture on initial mount so the user lands
// at the right point in the chronological list without JS-driven scrolling
// being visible across subsequent navigations.
export function NextFixtureAnchor({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'instant', block: 'center' });
  }, []);
  return <div ref={ref}>{children}</div>;
}
