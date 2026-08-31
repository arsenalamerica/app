import { describe, expect, it } from 'vitest';
import {
  fixtureIdResolves,
  isEmptyOverwrite,
  isExcessiveDrop,
  isPlaceholderFixture,
  seasonWindow,
  serialize,
} from './sync-fixtures.mjs';

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

describe('isPlaceholderFixture', () => {
  it('flags a fixture marked placeholder: true', () => {
    expect(isPlaceholderFixture({ id: 1, placeholder: true })).toBe(true);
  });

  it('does not flag a fixture with placeholder: false', () => {
    expect(isPlaceholderFixture({ id: 1, placeholder: false })).toBe(false);
  });

  it('does not flag a fixture missing the placeholder field', () => {
    expect(isPlaceholderFixture({ id: 1 })).toBe(false);
  });
});

describe('fixtureIdResolves', () => {
  it('is true when the response body has a data key', async () => {
    const fetchImpl = async () => ({
      ok: true,
      json: async () => ({ data: { id: 1 } }),
    });
    expect(await fixtureIdResolves(1, 'token', fetchImpl)).toBe(true);
  });

  it('is true for an empty data array (key-presence, not truthiness)', async () => {
    const fetchImpl = async () => ({
      ok: true,
      json: async () => ({ data: [] }),
    });
    expect(await fixtureIdResolves(1, 'token', fetchImpl)).toBe(true);
  });

  it('is false when the response body has no data key', async () => {
    const fetchImpl = async () => ({
      ok: true,
      json: async () => ({ message: 'Fixture not found' }),
    });
    expect(await fixtureIdResolves(1, 'token', fetchImpl)).toBe(false);
  });

  it('throws on a non-ok response instead of treating the id as dead', async () => {
    const fetchImpl = async () => ({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'boom',
    });
    await expect(fixtureIdResolves(1, 'token', fetchImpl)).rejects.toThrow(
      'Sportmonks API error: 500 Internal Server Error — boom',
    );
  });
});

describe('isExcessiveDrop', () => {
  it('allows a single withdrawn fixture', () => {
    expect(isExcessiveDrop(47, 46)).toBe(false);
  });

  it('allows the cap exactly', () => {
    expect(isExcessiveDrop(47, 45)).toBe(false);
  });

  it('flags a drop past the cap', () => {
    expect(isExcessiveDrop(47, 44)).toBe(true);
  });

  // The gap isEmptyOverwrite cannot see: a partial wipe is non-empty, so it
  // would write and — with auto-merge — land unreviewed.
  it('flags a partial wipe that isEmptyOverwrite would let through', () => {
    expect(isExcessiveDrop(47, 7)).toBe(true);
    expect(isEmptyOverwrite(new Array(7).fill({}), '[{"id":1}]')).toBe(false);
  });

  it('is false when nothing was dropped', () => {
    expect(isExcessiveDrop(47, 47)).toBe(false);
  });
});
