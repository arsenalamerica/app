import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { config, proxy } from './proxy';

vi.mock('@/data', () => ({
  branchData: {
    'tacomagooners.com': {},
    'boisegooners.com': {},
  },
}));

describe('proxy', () => {
  afterEach(() => vi.restoreAllMocks());

  it('rewrites a known branch hostname to its tenant path', () => {
    const request = new NextRequest('https://tacomagooners.com/fixtures');

    const response = proxy(request);

    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'https://tacomagooners.com/tacomagooners.com/fixtures',
    );
    expect(response.headers.get('x-middleware-override-headers')).toContain(
      'x-pathname',
    );
  });

  it('resolves the domain query param on localhost', () => {
    const request = new NextRequest(
      'http://localhost:3000/table?domain=boisegooners.com',
    );

    const response = proxy(request);

    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'http://localhost:3000/boisegooners.com/table',
    );
  });

  it('falls back to the request hostname on localhost with no domain param', () => {
    const request = new NextRequest('http://localhost:3000/');

    const response = proxy(request);

    // "localhost" itself is not a branch site, and localhost is never treated
    // as a preview deployment, so this falls through to the 404 rewrite.
    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'http://localhost:3000/',
    );
  });

  it('rewrites to the first branch domain on an unrecognized vercel.app preview', () => {
    const request = new NextRequest(
      'https://app-git-foo-arsenalamerica.vercel.app/table',
    );

    const response = proxy(request);

    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'https://app-git-foo-arsenalamerica.vercel.app/tacomagooners.com/table',
    );
  });

  it('warns and rewrites to the base path for an unrecognized non-preview, non-local host', () => {
    const request = new NextRequest('https://not-a-branch.example/oops');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const response = proxy(request);

    expect(warn).toHaveBeenCalledWith(
      'Not a branch site:',
      'not-a-branch.example',
    );
    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'https://not-a-branch.example/',
    );
  });

  it('exports a matcher config excluding framework/internal paths', () => {
    expect(config.matcher).toHaveLength(1);
    expect(config.matcher[0]).toContain('monitoring');
  });
});
