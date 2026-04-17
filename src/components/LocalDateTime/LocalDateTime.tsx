'use client';

import { useHydrated } from './HydratedProvider';

export function LocalDateTime({
  epoch,
  options,
}: {
  epoch: number;
  options: Intl.DateTimeFormatOptions;
}) {
  // Subscribe to hydration context — triggers a single batched re-render
  // so the formatted output uses the client's locale/timezone.
  useHydrated();

  const ms = epoch * 1000;
  const formatted = new Intl.DateTimeFormat(undefined, options).format(
    new Date(ms),
  );

  return (
    <time dateTime={new Date(ms).toISOString()} suppressHydrationWarning>
      {formatted}
    </time>
  );
}
