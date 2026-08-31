import { render } from '@testing-library/react';
import { notFound } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';

import { getNextFixture } from '@/lib/data/fixtures';

import Home from './page';

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('@/data', () => ({
  branchData: {
    'tacomagooners.com': {
      domain: 'tacomagooners.com',
      name: 'Tacoma Gooners',
    },
    'no-logo.example': { domain: 'no-logo.example', name: 'No Logo Branch' },
  },
  branchLogo: {
    'tacomagooners.com': ({ title }: { title?: string }) => (
      <svg role='img' aria-label={title} />
    ),
  },
}));

vi.mock('@/lib/data/fixtures', () => ({
  getNextFixture: vi.fn(),
}));

vi.mock('@/components', () => ({
  Card: ({
    as: As = 'div',
    children,
  }: {
    as?: React.ElementType;
    children: React.ReactNode;
  }) => <As>{children}</As>,
  FixtureCard: ({ id, kickoff }: { id?: number; kickoff?: number }) => (
    <p>
      fixture-card id={String(id)} kickoff={kickoff}
    </p>
  ),
  FixtureCardBoundary: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='fixture-card-boundary'>{children}</div>
  ),
  Main: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
  NextGame: ({
    fixture,
    branch,
  }: {
    fixture: { id: number };
    branch: { name: string };
  }) => (
    <p>
      next-game {fixture.id} {branch.name}
    </p>
  ),
}));

const makeProps = (domain: string) => ({
  params: Promise.resolve({ domain }),
});

describe('[domain]/page (Home)', () => {
  it('renders a no-fixture message when there is no next fixture', async () => {
    vi.mocked(getNextFixture).mockResolvedValue([]);

    const ui = await Home(makeProps('tacomagooners.com'));
    const { getByRole, getByText } = render(ui);

    expect(getByRole('heading', { name: 'Next Match' })).toBeInTheDocument();
    expect(getByText(/No upcoming match scheduled/)).toBeInTheDocument();
    expect(getByRole('img', { name: 'Tacoma Gooners' })).toBeInTheDocument();
  });

  it('omits the Logo when the branch has none registered', async () => {
    vi.mocked(getNextFixture).mockResolvedValue([]);

    const ui = await Home(makeProps('no-logo.example'));
    const { queryByRole } = render(ui);

    expect(queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders the FixtureCard and NextGame when a fixture is scheduled', async () => {
    vi.mocked(getNextFixture).mockResolvedValue([
      { id: 7, kickoff: 123 },
    ] as never);

    const ui = await Home(makeProps('tacomagooners.com'));
    const { getByText, getByTestId } = render(ui);

    // FixtureCard throws on malformed fixture data, so it must render inside
    // the boundary rather than beside it.
    expect(getByTestId('fixture-card-boundary')).toContainElement(
      getByText('fixture-card id=undefined kickoff=123'),
    );
    // The `id` field is deliberately stripped before spreading fixture props
    // onto FixtureCard (see the `{ id: _id, ...nextFixtureProps }` destructure
    // in page.tsx), so FixtureCard must not receive it.
    expect(
      getByText('fixture-card id=undefined kickoff=123'),
    ).toBeInTheDocument();
    expect(getByText('next-game 7 Tacoma Gooners')).toBeInTheDocument();
  });

  it('calls notFound() for an unknown domain', async () => {
    // notFound() throws before getNextFixture() is ever called, so no
    // fixture mock is needed here.
    await expect(Home(makeProps('unknown.example'))).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
    expect(notFound).toHaveBeenCalled();
  });
});
