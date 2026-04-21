'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  // Tracks whether the fetch has fired so the observer isn't recreated on
  // every state update. Reset to false when the user retries after an error.
  const fetchedRef = useRef(false);

  const resetError = useCallback(() => {
    fetchedRef.current = false;
    setError(null);
  }, []);

  useEffect(() => {
    if (fetchedRef.current) return;
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    const io = new IntersectionObserver(
      ([entry], observer) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        fetchedRef.current = true;
        loadDeferredFixture(fixtureId, settled)
          .then((d) => {
            if (!cancelled) setData(d);
          })
          .catch((e) => {
            if (!cancelled)
              setError(e instanceof Error ? e : new Error(String(e)));
          });
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [fixtureId, settled]);

  if (error) {
    return (
      <div ref={ref}>
        <FixtureCardError error={error} resetErrorBoundary={resetError} />
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
