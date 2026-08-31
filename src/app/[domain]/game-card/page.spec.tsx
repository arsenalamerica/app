import { render } from '@testing-library/react';
import { notFound } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';

import { getNextFixture } from '@/lib/data/fixtures';

import GameCardPage, { metadata } from './page';

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
  },
}));

vi.mock('@/lib/data/fixtures', () => ({
  getNextFixture: vi.fn(),
}));

vi.mock('@/components', () => ({
  GameCard: ({ id, branch }: { id: number; branch: { name: string } }) => (
    <p>
      card {id} for {branch.name}
    </p>
  ),
}));

const makeProps = (domain: string) => ({
  params: Promise.resolve({ domain }),
});

describe('game-card/page', () => {
  it('sets noindex/nofollow robots metadata', () => {
    expect(metadata).toEqual({
      robots: { index: false, follow: false },
    });
  });

  it('renders GameCard with the next fixture and branch', async () => {
    vi.mocked(getNextFixture).mockResolvedValue([{ id: 42 }] as never);

    const ui = await GameCardPage(makeProps('tacomagooners.com'));
    const { getByText } = render(ui);

    expect(getByText('card 42 for Tacoma Gooners')).toBeInTheDocument();
  });

  it('calls notFound() when there is no next fixture', async () => {
    vi.mocked(getNextFixture).mockResolvedValue([]);

    await expect(GameCardPage(makeProps('tacomagooners.com'))).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
    expect(notFound).toHaveBeenCalled();
  });

  it('calls notFound() for an unknown domain', async () => {
    vi.mocked(getNextFixture).mockResolvedValue([{ id: 42 }] as never);

    await expect(GameCardPage(makeProps('unknown.example'))).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
    expect(notFound).toHaveBeenCalled();
  });
});
