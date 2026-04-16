import { notFound } from 'next/navigation';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LayoutProps } from './layout';
import { generateMetadata } from './layout';

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

const makeProps = (domain: string): LayoutProps => ({
  children: null,
  params: Promise.resolve({ domain }),
});

describe('[domain]/layout', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateMetadata', () => {
    it('returns metadata for a known domain', async () => {
      const metadata = await generateMetadata(makeProps('tacomagooners.com'));
      expect(metadata).toEqual({
        title: 'Tacoma Gooners',
        description: 'Welcome to Tacoma Gooners!',
      });
    });

    it('returns empty metadata for an unknown domain', async () => {
      const metadata = await generateMetadata(makeProps('unknown.example'));
      expect(metadata).toEqual({});
    });
  });

  describe('Layout', () => {
    it('calls notFound() for an unknown domain', async () => {
      const { default: Layout } = await import('./layout');
      await expect(Layout(makeProps('unknown.example'))).rejects.toThrow(
        'NEXT_NOT_FOUND',
      );
      expect(notFound).toHaveBeenCalled();
    });
  });
});
