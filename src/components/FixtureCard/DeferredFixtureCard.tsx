'use client';

import { useEffect, useRef, useState } from 'react';
import { loadDeferredFixture } from '@/lib/actions/loadDeferredFixture';
import type { FixtureEntity } from '@/lib/sportmonks';
import { FixtureCard, FixtureCardLoading } from './FixtureCard';
import { FixtureCardError } from './FixtureCardError';

export function DeferredFixtureCard({
  fixtureId,
  settled,
}: {
  fixtureId: number;
  settled: boolean;
}) {
  const [data, setData] = useState<FixtureEntity | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data || error) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry], observer) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        loadDeferredFixture(fixtureId, settled)
          .then(setData)
          .catch((e) =>
            setError(e instanceof Error ? e : new Error(String(e))),
          );
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [fixtureId, settled, data, error]);

  if (error) {
    return (
      <div ref={ref}>
        <FixtureCardError error={error} resetErrorBoundary={() => {}} />
      </div>
    );
  }

  if (data) {
    const { id: _id, ...rest } = data;
    return (
      <div ref={ref}>
        <FixtureCard {...rest} />
      </div>
    );
  }

  return (
    <div ref={ref}>
      <FixtureCardLoading />
    </div>
  );
}
