import { render } from '@testing-library/react';
import { headers } from 'next/headers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import NotFound from './not-found';

vi.mock('next/headers');
vi.mock('next/image', () => ({
  // biome-ignore lint/performance/noImgElement: test mock, not a real image component
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

describe('NotFound', () => {
  afterEach(() => vi.restoreAllMocks());

  it('warns with host and pathname', async () => {
    vi.mocked(headers).mockResolvedValue({
      get: (k: string) =>
        k === 'host'
          ? 'tacomagooners.com'
          : k === 'x-pathname'
            ? '/oops'
            : null,
    } as unknown as Awaited<ReturnType<typeof headers>>);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const ui = await NotFound();
    const { baseElement } = render(ui);

    expect(warn).toHaveBeenCalledWith('[404] tacomagooners.com/oops');
    expect(baseElement).toBeTruthy();
  });
});
