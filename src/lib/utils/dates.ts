export const epochToTime = (epoch: number) => epoch * 1000;

export function dateFromEpoch(timestamp: number, timeZone?: string) {
  return new Date(epochToTime(timestamp)).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone,
  });
}
