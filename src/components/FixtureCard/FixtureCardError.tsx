'use client';

import { Heading, HeadingLevel, VisuallyHidden } from '@ariakit/react';
import { useEffect } from 'react';
import type { FallbackProps } from 'react-error-boundary';
import { Card } from '../Card/Card';
import styles from './FixtureCard.module.scss';

export function FixtureCardError({ error, resetErrorBoundary }: FallbackProps) {
  useEffect(() => {
    console.error('[FixtureCard] render failed:', error);
  }, [error]);

  return (
    <Card className={styles._}>
      <HeadingLevel>
        <VisuallyHidden>
          <Heading>Fixture unavailable</Heading>
        </VisuallyHidden>
        <div className={styles.Details}>
          Fixture unavailable
          <button onClick={resetErrorBoundary} type='button'>
            Retry
          </button>
        </div>
      </HeadingLevel>
    </Card>
  );
}
