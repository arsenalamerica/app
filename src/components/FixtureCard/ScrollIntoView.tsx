'use client';

import { useEffect, useRef } from 'react';

export function ScrollIntoView({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active) {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [active]);

  return <div ref={ref} />;
}
