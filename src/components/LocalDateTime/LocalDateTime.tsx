'use client';

export function LocalDateTime({
  epoch,
  options,
}: {
  epoch: number;
  options: Intl.DateTimeFormatOptions;
}) {
  const ms = epoch * 1000;

  return (
    // Do NOT add suppressHydrationWarning — it disables text patching entirely.
    // https://github.com/vercel/next.js/issues/61911
    <time dateTime={new Date(ms).toISOString()}>
      {new Intl.DateTimeFormat(undefined, options).format(new Date(ms))}
    </time>
  );
}
