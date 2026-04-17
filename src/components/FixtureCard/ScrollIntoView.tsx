'use client';

import { useEffect, useRef } from 'react';

export function ScrollIntoView() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  return <div ref={ref} />;
}
