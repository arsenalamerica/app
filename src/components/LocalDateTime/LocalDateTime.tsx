'use client';

// suppressHydrationWarning is intentionally NOT used here. It completely
// deactivates hydration for the element, preventing React from patching
// server-rendered text to the client timezone.
// See: https://github.com/vercel/next.js/issues/61911
export function LocalDateTime({
  epoch,
  options,
}: {
  epoch: number;
  options: Intl.DateTimeFormatOptions;
}) {
  const ms = epoch * 1000;

  return (
    <time dateTime={new Date(ms).toISOString()}>
      {new Intl.DateTimeFormat(undefined, options).format(new Date(ms))}
    </time>
  );
}
