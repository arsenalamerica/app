'use client';

import * as Sentry from '@sentry/nextjs';
import type { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { FixtureCardError } from './FixtureCardError';

// Client component so onError can hold a function reference without crossing
// the RSC serialization boundary.
export function FixtureCardBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={FixtureCardError}
      onError={(error) => Sentry.captureException(error)}
    >
      {children}
    </ErrorBoundary>
  );
}
