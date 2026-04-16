'use client';

import styles from './RouteError.module.scss';

export interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function RouteError({ reset }: RouteErrorProps) {
  return (
    <div className={styles._}>
      <h2>Something went wrong</h2>
      <p>An unexpected error occurred.</p>
      <button type='button' onClick={reset}>
        Try again
      </button>
    </div>
  );
}
