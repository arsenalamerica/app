'use client';

import * as Sentry from '@sentry/nextjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadDeferredFixture } from '@/lib/actions/loadDeferredFixture';
import type { FixtureEntity } from '@/lib/sportmonks';
import { FixtureCard, FixtureCardLoading } from './FixtureCard';
import { FixtureCardBoundary } from './FixtureCardBoundary';
import { FixtureCardError } from './FixtureCardError';

// One state value rather than a flag per outcome, so combinations like "loaded
// and unavailable" stay unrepresentable and a retry cannot leave a stale flag
// behind.
type CardState =
  | { status: 'loading' }
  | { status: 'ready'; fixture: FixtureEntity }
  | { status: 'error'; error: Error }
  | { status: 'unavailable' };

export function DeferredFixtureCard({
  fixtureId,
  settled,
}: {
  fixtureId: number;
  settled: boolean;
}) {
  const [state, setState] = useState<CardState>({ status: 'loading' });
  const [retryCount, setRetryCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  // Tracks whether the fetch has fired so the observer isn't recreated on
  // every state update. Reset by the effect cleanup on retry.
  const fetchedRef = useRef(false);

  const resetError = useCallback(() => {
    setState({ status: 'loading' });
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
          .then((result) => {
            if (cancelled) return;
            // A resolved `ok: false` is permanent and was already reported
            // server-side, so it neither retries nor captures again.
            setState(
              result.ok
                ? { status: 'ready', fixture: result.fixture }
                : { status: 'unavailable' },
            );
          })
          .catch((e) => {
            // Nothing to report once the card is gone: the failure is already
            // captured server-side by the action's instrumentation, and this
            // capture exists only to correlate it with a card the user is
            // looking at.
            if (cancelled) return;
            const err = e instanceof Error ? e : new Error(String(e));
            // The log alone never reached Sentry, which is what made a failed
            // deferred card invisible next to the boundary-wrapped ones. A
            // production server action redacts the message and identifies the
            // real error by its digest, so that digest is the join key from
            // this client event back to the server one.
            console.error(
              `DeferredFixtureCard: fetch failed for fixture ${fixtureId}`,
              err,
            );
            Sentry.captureException(err, {
              extra: {
                fixtureId,
                digest: (e as { digest?: string } | null)?.digest,
              },
              tags: { surface: 'DeferredFixtureCard' },
            });
            setState({ status: 'error', error: err });
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
    switch (state.status) {
      case 'unavailable':
        return <FixtureCardError canRetry={false} />;
      case 'error':
        return (
          <FixtureCardError
            error={state.error}
            resetErrorBoundary={resetError}
          />
        );
      case 'ready': {
        const { id: _id, ...rest } = state.fixture;
        // FixtureCard throws on a malformed fixture, and this card is rendered
        // outside the per-card boundary on /fixtures. Without this the throw
        // would escape to the route's error.tsx and blank the whole list.
        return (
          <FixtureCardBoundary>
            <FixtureCard {...rest} />
          </FixtureCardBoundary>
        );
      }
      default:
        return <FixtureCardLoading />;
    }
  }

  return (
    <div ref={ref} data-id={fixtureId}>
      {content()}
    </div>
  );
}
