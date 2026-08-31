import * as Sentry from '@sentry/nextjs';
import { headers } from 'next/headers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getSettledFixtureById,
  getUnsettledFixtureById,
} from '@/lib/data/fixtures';

import { loadDeferredFixture } from './loadDeferredFixture';

vi.mock('next/headers');

vi.mock('@sentry/nextjs', () => ({
  withServerActionInstrumentation: vi.fn((_name, _opts, fn) => fn()),
}));

vi.mock('@/lib/data/fixtures', () => ({
  getSettledFixtureById: vi.fn(),
  getUnsettledFixtureById: vi.fn(),
}));

const KNOWN_FIXTURE_ID = 19721833;

describe('loadDeferredFixture', () => {
  beforeEach(() => {
    vi.mocked(headers).mockResolvedValue({
      get: () => null,
    } as unknown as Awaited<ReturnType<typeof headers>>);
    vi.mocked(getSettledFixtureById).mockReset();
    vi.mocked(getUnsettledFixtureById).mockReset();
  });

  it('throws for an id not present in the static fixture index', async () => {
    await expect(loadDeferredFixture(999999999, true)).rejects.toThrow(
      'Unknown fixture id=999999999',
    );
  });

  it('loads a settled fixture by its trusted, re-derived id', async () => {
    vi.mocked(getSettledFixtureById).mockResolvedValue({
      id: KNOWN_FIXTURE_ID,
    } as never);

    const result = await loadDeferredFixture(KNOWN_FIXTURE_ID, true);

    expect(getSettledFixtureById).toHaveBeenCalledWith(KNOWN_FIXTURE_ID);
    expect(getUnsettledFixtureById).not.toHaveBeenCalled();
    expect(result).toEqual({ id: KNOWN_FIXTURE_ID });
  });

  it('loads an unsettled fixture by its trusted, re-derived id', async () => {
    vi.mocked(getUnsettledFixtureById).mockResolvedValue({
      id: KNOWN_FIXTURE_ID,
    } as never);

    const result = await loadDeferredFixture(KNOWN_FIXTURE_ID, false);

    expect(getUnsettledFixtureById).toHaveBeenCalledWith(KNOWN_FIXTURE_ID);
    expect(getSettledFixtureById).not.toHaveBeenCalled();
    expect(result).toEqual({ id: KNOWN_FIXTURE_ID });
  });

  it('wraps the call with Sentry server action instrumentation', async () => {
    vi.mocked(getSettledFixtureById).mockResolvedValue({} as never);

    await loadDeferredFixture(KNOWN_FIXTURE_ID, true);

    expect(Sentry.withServerActionInstrumentation).toHaveBeenCalledWith(
      'loadDeferredFixture',
      { headers: expect.anything() },
      expect.any(Function),
    );
  });
});
