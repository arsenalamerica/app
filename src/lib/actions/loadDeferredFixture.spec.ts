import * as Sentry from '@sentry/nextjs';
import { headers } from 'next/headers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getSettledFixtureById,
  getUnsettledFixtureById,
} from '@/lib/data/fixtures';

import { loadDeferredFixture } from './loadDeferredFixture';

vi.mock('next/headers');

// The passthrough means "the action does not capture this itself". That a
// rethrown transient failure still reaches Sentry is the SDK's job:
// withServerActionInstrumentation captures from its own error branch. Revisit
// this mock, and the transient-failure test below, on a @sentry/nextjs major.
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
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
    vi.mocked(Sentry.captureException).mockClear();
  });

  it('resolves permanently for an id not present in the static fixture index', async () => {
    const result = await loadDeferredFixture(999999999, true);

    expect(result).toEqual({ ok: false, reason: 'unknown-id' });
    expect(getSettledFixtureById).not.toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Unknown fixture id=999999999' }),
    );
  });

  it('loads a settled fixture by its trusted, re-derived id', async () => {
    vi.mocked(getSettledFixtureById).mockResolvedValue({
      id: KNOWN_FIXTURE_ID,
    } as never);

    const result = await loadDeferredFixture(KNOWN_FIXTURE_ID, true);

    expect(getSettledFixtureById).toHaveBeenCalledWith(KNOWN_FIXTURE_ID);
    expect(getUnsettledFixtureById).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, fixture: { id: KNOWN_FIXTURE_ID } });
  });

  it('loads an unsettled fixture by its trusted, re-derived id', async () => {
    vi.mocked(getUnsettledFixtureById).mockResolvedValue({
      id: KNOWN_FIXTURE_ID,
    } as never);

    const result = await loadDeferredFixture(KNOWN_FIXTURE_ID, false);

    expect(getUnsettledFixtureById).toHaveBeenCalledWith(KNOWN_FIXTURE_ID);
    expect(getSettledFixtureById).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, fixture: { id: KNOWN_FIXTURE_ID } });
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

  it('rethrows a fetch failure so the client can offer a retry', async () => {
    vi.mocked(getSettledFixtureById).mockRejectedValue(
      new Error('Sportmonks 503: /fixtures'),
    );

    await expect(loadDeferredFixture(KNOWN_FIXTURE_ID, true)).rejects.toThrow(
      'Sportmonks 503: /fixtures',
    );
    // Reported by the instrumentation, not by the action itself.
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('rethrows an unsettled fetch failure too', async () => {
    vi.mocked(getUnsettledFixtureById).mockRejectedValue(
      new Error('Sportmonks 503: /fixtures'),
    );

    await expect(loadDeferredFixture(KNOWN_FIXTURE_ID, false)).rejects.toThrow(
      'Sportmonks 503: /fixtures',
    );
  });
});
