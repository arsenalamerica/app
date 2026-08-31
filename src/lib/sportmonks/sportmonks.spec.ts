import { describe, expect, it, vi } from 'vitest';

// MONK_TOKEN resolves to '' under `test` by design (see the comment in
// sportmonks.ts), which is what stops a test from ever reaching the real
// Sportmonks API. To exercise the fetch/response-handling branches below the
// token guard, this file mocks varlock's ENV export directly rather than the
// calling module, which is a third-party seam, not a source file.
const mockToken = vi.hoisted(() => ({ value: '' }));

vi.mock('varlock/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('varlock/env')>();
  return {
    ...actual,
    ENV: new Proxy(actual.ENV, {
      get(target, prop) {
        if (prop === 'MONK_TOKEN') return mockToken.value;
        return Reflect.get(target, prop);
      },
    }),
  };
});

import { sportmonksFetch } from './sportmonks';

describe('sportmonksFetch', () => {
  it('throws when MONK_TOKEN is not set (empty by design in tests)', async () => {
    mockToken.value = '';

    await expect(sportmonksFetch('/foo')).rejects.toThrow(
      /MONK_TOKEN is not set/,
    );
  });

  it('resolves with the parsed JSON body on a successful response', async () => {
    mockToken.value = 'test-token';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: 'ok' }),
    } as Response);

    await expect(sportmonksFetch('/foo', { a: 'b' })).resolves.toEqual({
      data: 'ok',
    });

    const fetchMock = vi.mocked(globalThis.fetch);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://api.sportmonks.com/v3/football/foo?a=b');
    expect((init as RequestInit).headers).toEqual({
      Authorization: 'test-token',
    });
  });

  it('throws an error including the message from a JSON error body', async () => {
    mockToken.value = 'test-token';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    } as Response);

    await expect(sportmonksFetch('/foo')).rejects.toThrow(
      'Sportmonks 401 Unauthorized: /foo',
    );
  });

  it('throws an error without a detail suffix when the body has no message', async () => {
    mockToken.value = 'test-token';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    await expect(sportmonksFetch('/foo')).rejects.toThrow(
      'Sportmonks 500: /foo',
    );
  });

  it('throws an error without a detail suffix when the body is not JSON', async () => {
    mockToken.value = 'test-token';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    } as unknown as Response);

    await expect(sportmonksFetch('/foo')).rejects.toThrow(
      'Sportmonks 503: /foo',
    );
  });
});
