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
  const [retryCount, setRetryCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  // Tracks whether the fetch has fired so the observer isn't recreated on
  // every state update. Reset by the effect cleanup on retry.
  const fetchedRef = useRef(false);

  const resetError = useCallback(() => {
    setData(null);
    setError(null);
    setRetryCount((c) => c + 1);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: retryCount is a trigger dep — not read inside the body, but its change forces the effect to re-run after a retry
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
            if (!cancelled) {
              const err = e instanceof Error ? e : new Error(String(e));
              console.error(err);
              setError(err);
            }
          });
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      // Reset so a remounted component registers a fresh observer instead of
      // staying stuck on the loading skeleton when a prior mount's fetch was
      // abandoned mid-flight.
      fetchedRef.current = false;
      io.disconnect();
    };
  }, [fixtureId, settled, retryCount]);

  function content() {
    if (error) {
      return <FixtureCardError error={error} resetErrorBoundary={resetError} />;
    }
    if (data) {
      const { id: _id, ...rest } = data;
      return <FixtureCard {...rest} />;
    }
    return <FixtureCardLoading />;
  }

  return (
    <div ref={ref} data-id={fixtureId}>
      {content()}
    </div>
  );
}
