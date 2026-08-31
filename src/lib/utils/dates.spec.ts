import { describe, expect, it } from 'vitest';

import { dateFromEpoch, epochToTime } from './dates';

describe('epochToTime', () => {
  it('converts seconds to milliseconds', () => {
    expect(epochToTime(1)).toBe(1000);
    expect(epochToTime(0)).toBe(0);
  });
});

describe('dateFromEpoch', () => {
  it('formats an epoch timestamp as a long-form date in a given time zone', () => {
    // 2024-01-15T12:00:00Z
    const timestamp = 1705320000;
    expect(dateFromEpoch(timestamp, 'UTC')).toBe('Monday, Jan 15, 2024');
  });

  it('formats using the environment default time zone when none is given', () => {
    const timestamp = 1705320000;
    const result = dateFromEpoch(timestamp);
    expect(result).toMatch(/\d{4}/);
  });
});
