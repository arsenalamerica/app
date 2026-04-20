import { describe, expect, it } from 'vitest';
import { isEmptyOverwrite, seasonWindow, serialize } from './sync-fixtures.mjs';

describe('serialize', () => {
  it('emits pretty JSON with a trailing newline', () => {
    expect(serialize([{ id: 1, kickoff: 100 }])).toBe(
      '[\n  {\n    "id": 1,\n    "kickoff": 100\n  }\n]\n',
    );
  });

  it('serializes the empty array as []', () => {
    expect(serialize([])).toBe('[]\n');
  });

  it('is idempotent: re-serializing the parsed output matches the original', () => {
    const fixtures = [
      { id: 1, kickoff: 100 },
      { id: 2, kickoff: 200 },
    ];
    const first = serialize(fixtures);
    const second = serialize(JSON.parse(first));
    expect(first).toBe(second);
  });
});

describe('isEmptyOverwrite', () => {
  it('blocks writing an empty array over a committed non-empty index', () => {
    const existing = '[\n  {\n    "id": 1,\n    "kickoff": 100\n  }\n]\n';
    expect(isEmptyOverwrite([], existing)).toBe(true);
  });

  it('allows the first write when the file does not exist', () => {
    expect(isEmptyOverwrite([], '')).toBe(false);
  });

  it('allows overwriting an existing empty array with an empty array', () => {
    expect(isEmptyOverwrite([], '[]\n')).toBe(false);
  });

  it('allows any non-empty write regardless of existing content', () => {
    expect(isEmptyOverwrite([{ id: 1, kickoff: 100 }], '')).toBe(false);
    expect(
      isEmptyOverwrite(
        [{ id: 1, kickoff: 100 }],
        '[\n  {\n    "id": 2,\n    "kickoff": 200\n  }\n]\n',
      ),
    ).toBe(false);
  });
});

describe('seasonWindow', () => {
  it('returns July–June for a date after June', () => {
    expect(seasonWindow(new Date('2026-08-15'))).toEqual({
      start: '2026-07-01',
      end: '2027-06-30',
    });
  });

  it('returns the prior July for a date on or before June', () => {
    expect(seasonWindow(new Date('2026-03-01'))).toEqual({
      start: '2025-07-01',
      end: '2026-06-30',
    });
  });
});
