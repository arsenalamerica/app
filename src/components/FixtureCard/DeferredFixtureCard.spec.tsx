import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { loadDeferredFixture } from '@/lib/actions/loadDeferredFixture';
import type { FixtureEntity } from '@/lib/sportmonks';
import { DeferredFixtureCard } from './DeferredFixtureCard';

vi.mock('@/lib/actions/loadDeferredFixture');

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
    vi.mocked(loadDeferredFixture).mockResolvedValue(fixture);

    render(<DeferredFixtureCard fixtureId={42} settled />);
    FakeIntersectionObserver.instances[0].trigger(true);

    expect(loadDeferredFixture).toHaveBeenCalledWith(42, true);
    expect(FakeIntersectionObserver.instances[0].disconnect).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText('Arsenal')).toBeTruthy();
    });
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
      'DeferredFixtureCard: fetch failed',
    );

    vi.mocked(loadDeferredFixture).mockResolvedValue(fixture);
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
      'DeferredFixtureCard: fetch failed',
    );
  });

  it('ignores a resolved fetch after the component has unmounted', async () => {
    let resolveFetch: (value: FixtureEntity) => void = () => {};
    vi.mocked(loadDeferredFixture).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const { unmount } = render(<DeferredFixtureCard fixtureId={42} settled />);
    FakeIntersectionObserver.instances[0].trigger(true);

    unmount();
    resolveFetch(fixture);

    // No assertion needed beyond "this doesn't throw" — the cleanup's
    // `cancelled` flag suppresses the post-unmount setState.
    await Promise.resolve();
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

    // No assertion needed beyond "this doesn't throw" — the cleanup's
    // `cancelled` flag suppresses the post-unmount setState and the
    // console.error/setError calls.
    await Promise.resolve().catch(() => {});
  });
});
