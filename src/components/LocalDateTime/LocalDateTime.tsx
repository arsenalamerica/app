'use client';

import { useEffect, useState } from 'react';

export function LocalDateTime({
  epoch,
  options,
}: {
  epoch: number;
  options: Intl.DateTimeFormatOptions;
}) {
  // Force a re-render after hydration so the formatted output uses the client's locale/timezone.
  const [, rerender] = useState(false);
  useEffect(() => rerender(true), []);

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
