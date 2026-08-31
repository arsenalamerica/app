'use client';

import { Heading, HeadingLevel, VisuallyHidden } from '@ariakit/react';
import type { FallbackProps } from 'react-error-boundary';
import { Card } from '../Card/Card';
import styles from './FixtureCard.module.scss';

/**
 * A union rather than a loosened `FallbackProps` so a Retry button with no
 * handler behind it is unrepresentable. `FallbackProps` is assignable to the
 * first arm, so the component stays usable as `ErrorBoundary`'s
 * `FallbackComponent`; the second arm is for `DeferredFixtureCard`, which
 * renders the fallback directly and has no boundary to reset.
 */
type FixtureCardErrorProps =
  | (FallbackProps & {
      /** Offer Retry. Omit or pass `true` alongside a reset handler. */
      canRetry?: true;
    })
  | {
      /**
       * Pass `false` for a permanent failure — a fixture that is gone upstream
       * fails identically on every attempt, so the button is a dead end.
       */
      canRetry: false;
      error?: never;
      resetErrorBoundary?: never;
    };

export function FixtureCardError({
  error: _error,
  resetErrorBoundary,
  canRetry = true,
}: FixtureCardErrorProps) {
  return (
    <Card className={styles._}>
      <HeadingLevel>
        <VisuallyHidden>
          <Heading>Fixture unavailable</Heading>
        </VisuallyHidden>
        <div className={styles.Details}>
          Fixture unavailable
          {canRetry && (
            <button onClick={resetErrorBoundary} type='button'>
              Retry
            </button>
          )}
        </div>
      </HeadingLevel>
    </Card>
  );
}
