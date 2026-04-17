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
    <time dateTime={new Date(ms).toISOString()} suppressHydrationWarning>
      {new Intl.DateTimeFormat(undefined, options).format(new Date(ms))}
    </time>
  );
}
