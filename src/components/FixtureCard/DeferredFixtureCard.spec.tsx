import * as Sentry from '@sentry/nextjs';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import {
  type DeferredFixtureResult,
  loadDeferredFixture,
} from '@/lib/actions/loadDeferredFixture';
import type { FixtureEntity } from '@/lib/sportmonks';
import { DeferredFixtureCard } from './DeferredFixtureCard';

vi.mock('@/lib/actions/loadDeferredFixture');

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

const fixture: FixtureEntity = {
  id: 42,
  name: 'Arsenal vs Spurs',
  starting_at: '2024-01-06T15:00:00Z',
  starting_at_timestamp: 1704553200,
  state_id: 5,
  state: {
    id: 5,
    state: 'FT',
    name: 'Full Time',
    short_name: 'FT',
    developer_name: 'FT',
  },
  league: { id: 8, name: 'Premier League', image_path: 'league.png' },
  venue: { id: 1, name: 'Emirates Stadium', image_path: 'venue.png' },
  participants: [
    {
      id: 19,
      name: 'Arsenal',
      image_path: 'arsenal.png',
      short_code: 'ARS',
      meta: { location: 'home' },
    },
    {
      id: 6,
      name: 'Spurs',
      image_path: 'spurs.png',
      short_code: 'TOT',
      meta: { location: 'away' },
    },
  ],
  scores: [
    { description: 'CURRENT', score: { participant: 'home', goals: 2 } },
    { description: 'CURRENT', score: { participant: 'away', goals: 1 } },
  ],
  periods: [],
  tvstations: [],
};

type Callback = (
  entries: { isIntersecting: boolean }[],
  observer: FakeIntersectionObserver,
) => void;

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  callback: Callback;
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(callback: Callback) {
    this.callback = callback;
    FakeIntersectionObserver.instances.push(this);
  }

  trigger(isIntersecting: boolean) {
    this.callback([{ isIntersecting }], this);
  }
}

beforeEach(() => {
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  vi.mocked(Sentry.captureException).mockClear();
});

describe('DeferredFixtureCard', () => {
  it('renders the loading skeleton before the fixture intersects the viewport', () => {
    render(<DeferredFixtureCard fixtureId={42} settled />);

    expect(
      screen.getAllByText('Loading', { exact: false }).length,
    ).toBeGreaterThan(0);
    expect(loadDeferredFixture).not.toHaveBeenCalled();
    expect(FakeIntersectionObserver.instances).toHaveLength(1);
    expect(FakeIntersectionObserver.instances[0].observe).toHaveBeenCalled();
  });

  it('does nothing when the entry is not intersecting', () => {
    render(<DeferredFixtureCard fixtureId={42} settled />);

    FakeIntersectionObserver.instances[0].trigger(false);

    expect(loadDeferredFixture).not.toHaveBeenCalled();
  });

  it('loads and renders the fixture once it intersects', async () => {
    vi.mocked(loadDeferredFixture).mockResolvedValue({ ok: true, fixture });

    render(<DeferredFixtureCard fixtureId={42} settled />);
    FakeIntersectionObserver.instances[0].trigger(true);

    expect(loadDeferredFixture).toHaveBeenCalledWith(42, true);
    expect(FakeIntersectionObserver.instances[0].disconnect).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText('Arsenal')).toBeTruthy();
    });
  });

  it('renders the fallback without Retry when the failure is permanent', async () => {
    vi.mocked(loadDeferredFixture).mockResolvedValue({
      ok: false,
      reason: 'unknown-id',
    });

    render(<DeferredFixtureCard fixtureId={42} settled />);
    FakeIntersectionObserver.instances[0].trigger(true);

    await waitFor(() => {
      expect(screen.getAllByText('Fixture unavailable').length).toBeGreaterThan(
        0,
      );
    });
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    // Already captured server-side by the action — see the matching assertion
    // in loadDeferredFixture.spec.ts ("resolves permanently for an id not
    // present in the static fixture index").
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('renders the error fallback and lets retry reset it when loading fails with an Error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(loadDeferredFixture).mockRejectedValueOnce(
      new Error('network down'),
    );

    render(<DeferredFixtureCard fixtureId={42} settled />);
    FakeIntersectionObserver.instances[0].trigger(true);

    await waitFor(() => {
      expect(screen.getAllByText('Fixture unavailable').length).toBeGreaterThan(
        0,
      );
    });
    expect(console.error).toHaveBeenCalledWith(
      'DeferredFixtureCard: fetch failed for fixture 42',
      expect.objectContaining({ message: 'network down' }),
    );
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'network down' }),
      {
        extra: { fixtureId: 42, digest: undefined },
        tags: { surface: 'DeferredFixtureCard' },
      },
    );

    vi.mocked(loadDeferredFixture).mockResolvedValue({ ok: true, fixture });
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(
      screen.getAllByText('Loading', { exact: false }).length,
    ).toBeGreaterThan(0);
    expect(FakeIntersectionObserver.instances).toHaveLength(2);

    FakeIntersectionObserver.instances[1].trigger(true);

    await waitFor(() => {
      expect(screen.getByText('Arsenal')).toBeTruthy();
    });
  });

  it('shows the fallback again when the retry fails too', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(loadDeferredFixture).mockRejectedValue(new Error('still down'));

    render(<DeferredFixtureCard fixtureId={42} settled />);
    FakeIntersectionObserver.instances[0].trigger(true);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    // The cleanup must reset fetchedRef, or the retry sticks on the skeleton.
    expect(FakeIntersectionObserver.instances).toHaveLength(2);
    FakeIntersectionObserver.instances[1].trigger(true);

    await waitFor(() => {
      expect(Sentry.captureException).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('wraps a non-Error rejection in an Error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(loadDeferredFixture).mockRejectedValueOnce(
      'a plain string reason',
    );

    render(<DeferredFixtureCard fixtureId={42} settled={false} />);
    FakeIntersectionObserver.instances[0].trigger(true);

    await waitFor(() => {
      expect(screen.getAllByText('Fixture unavailable').length).toBeGreaterThan(
        0,
      );
    });
    expect(console.error).toHaveBeenCalledWith(
      'DeferredFixtureCard: fetch failed for fixture 42',
      expect.objectContaining({ message: 'a plain string reason' }),
    );
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'a plain string reason' }),
      {
        extra: { fixtureId: 42, digest: undefined },
        tags: { surface: 'DeferredFixtureCard' },
      },
    );
  });

  it('ignores a resolved fetch after the component has unmounted', async () => {
    let resolveFetch: (value: DeferredFixtureResult) => void = () => {};
    vi.mocked(loadDeferredFixture).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const { unmount } = render(<DeferredFixtureCard fixtureId={42} settled />);
    FakeIntersectionObserver.instances[0].trigger(true);

    unmount();
    resolveFetch({ ok: true, fixture });
    await Promise.resolve();

    expect(screen.queryByText('Arsenal')).toBeNull();
  });

  it('ignores a rejected fetch after the component has unmounted', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let rejectFetch: (reason: unknown) => void = () => {};
    vi.mocked(loadDeferredFixture).mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectFetch = reject;
      }),
    );

    const { unmount } = render(<DeferredFixtureCard fixtureId={42} settled />);
    FakeIntersectionObserver.instances[0].trigger(true);

    unmount();
    rejectFetch(new Error('too late'));
    await Promise.resolve().catch(() => {});
    await Promise.resolve();

    // The cleanup's `cancelled` flag suppresses the setState, the log and the
    // capture: the action already reported this server-side, and there is no
    // card left for a client event to point at.
    expect(console.error).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
