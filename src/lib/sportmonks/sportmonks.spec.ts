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

import { SportmonksNotFoundError, sportmonksFetch } from './sportmonks';

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

  // Sportmonks answers a missing or unlicensed single entity with 200 and no
  // `data` key. Before issue #337 that body was returned as a success and blew
  // up several frames downstream as a TypeError.
  it('throws when a 200 response carries no data key', async () => {
    mockToken.value = 'test-token';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        message: 'No result(s) found matching your request.',
        subscription: [],
        rate_limit: {},
        timezone: 'UTC',
      }),
    } as Response);

    await expect(sportmonksFetch('/fixtures/19873650')).rejects.toThrow(
      SportmonksNotFoundError,
    );
    await expect(sportmonksFetch('/fixtures/19873650')).rejects.toThrow(
      'Sportmonks returned no data: /fixtures/19873650 — No result(s) found matching your request.',
    );
  });

  it('throws without a detail suffix when a data-less 200 has no message', async () => {
    mockToken.value = 'test-token';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);

    await expect(sportmonksFetch('/foo')).rejects.toThrow(
      'Sportmonks returned no data: /foo',
    );
  });

  it('throws when a 200 response body is not an object', async () => {
    mockToken.value = 'test-token';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => null,
    } as Response);

    await expect(sportmonksFetch('/foo')).rejects.toThrow(
      SportmonksNotFoundError,
    );
  });

  // The collection endpoints answer an empty result with `data: []` *and* the
  // same generic message. Keying the guard on `message` instead of on the
  // presence of `data` would break the documented off-season path.
  it('resolves an empty collection that also carries a message', async () => {
    mockToken.value = 'test-token';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [],
        message: 'No result(s) found matching your request.',
      }),
    } as Response);

    await expect(sportmonksFetch('/fixtures/between/x/y/19')).resolves.toEqual({
      data: [],
      message: 'No result(s) found matching your request.',
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
