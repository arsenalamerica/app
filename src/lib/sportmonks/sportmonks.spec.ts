import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

import {
  SportmonksNotFoundError,
  SportmonksServerError,
  sportmonksFetch,
} from './sportmonks';

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
  // `data` key. Previously that body was returned as a success and blew up
  // several frames downstream as a TypeError.
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

    let caught: unknown;
    try {
      await sportmonksFetch('/fixtures/19873650');
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(SportmonksNotFoundError);
    const error = caught as SportmonksNotFoundError;
    // `name` is what carries the Sentry grouping through a minified build, so
    // it is asserted rather than left looking like a redundant assignment.
    expect(error.name).toBe('SportmonksNotFoundError');
    expect(error.message).toBe(
      'Sportmonks returned no data: /fixtures/19873650 — No result(s) found matching your request.',
    );
    expect(error.path).toBe('/fixtures/19873650');
    expect(error.detail).toBe('No result(s) found matching your request.');
  });

  // `data: []` is truthy while `data: null` is not, so these two cases together
  // are what pin the guard to key-presence-plus-nullish rather than to plain
  // truthiness. Sportmonks does use null for an absent sub-object.
  it('throws when a 200 response has a null data value', async () => {
    mockToken.value = 'test-token';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: null, message: 'Nothing here' }),
    } as Response);

    await expect(sportmonksFetch('/fixtures/1')).rejects.toThrow(
      SportmonksNotFoundError,
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
    // A 4xx is never retried, so this stays a single attempt.
    mockToken.value = 'test-token';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({}),
    } as Response);

    await expect(sportmonksFetch('/foo')).rejects.toThrow(
      'Sportmonks 400: /foo',
    );
  });

  it('throws an error without a detail suffix when the body is not JSON', async () => {
    mockToken.value = 'test-token';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    } as unknown as Response);

    await expect(sportmonksFetch('/foo')).rejects.toThrow(
      'Sportmonks 400: /foo',
    );
  });
});

describe('sportmonksFetch retries', () => {
  // Retries sleep via a real `setTimeout`, so these use fake timers rather
  // than eating the ~250ms/750ms backoff in real time on every test run.
  // `vi.advanceTimersByTimeAsync` lets the pending retry's promise chain
  // actually resolve between advances, which plain `advanceTimersByTime`
  // (synchronous) does not.
  beforeEach(() => {
    mockToken.value = 'test-token';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries a 503 and returns the eventual success', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ message: 'Service Unavailable' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'recovered' }),
      } as Response);

    const promise = sportmonksFetch('/foo');
    await vi.advanceTimersByTimeAsync(250);

    await expect(promise).resolves.toEqual({ data: 'recovered' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws SportmonksServerError once retries are exhausted', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ message: 'Service Unavailable' }),
    } as Response);

    // The handler is attached before the timers advance — attaching it only
    // after the reject has already happened (as a bare `await` following the
    // advances would) reports as an unhandled rejection even though it is
    // ultimately caught here.
    const settled = sportmonksFetch('/fixtures/1').then(
      () => ({ rejected: false as const }),
      (e: unknown) => ({ rejected: true as const, error: e }),
    );
    // Two retries: 250ms then 750ms, before the third (final) attempt throws.
    await vi.advanceTimersByTimeAsync(250);
    await vi.advanceTimersByTimeAsync(750);

    const result = await settled;
    if (!result.rejected) {
      throw new Error('expected sportmonksFetch to reject');
    }
    const error = result.error as SportmonksServerError;
    expect(error).toBeInstanceOf(SportmonksServerError);
    expect(error.name).toBe('SportmonksServerError');
    expect(error.status).toBe(503);
    expect(error.message).toBe(
      'Sportmonks 503 Service Unavailable: /fixtures/1',
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry a 4xx response', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Not Found' }),
    } as Response);

    await expect(sportmonksFetch('/foo')).rejects.toThrow(
      SportmonksServerError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a network error and returns the eventual success', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'recovered' }),
      } as Response);

    const promise = sportmonksFetch('/foo');
    await vi.advanceTimersByTimeAsync(250);

    await expect(promise).resolves.toEqual({ data: 'recovered' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws a path-attributed error once network retries are exhausted', async () => {
    // Regression risk this pins: a bare rethrow of `err` here would carry no
    // `path`, so every endpoint's exhausted-retry network failures would
    // group under the same generic "TypeError: fetch failed" in Sentry.
    const networkError = new TypeError('fetch failed');
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(networkError);

    const settled = sportmonksFetch('/foo').then(
      () => ({ rejected: false as const }),
      (e: unknown) => ({ rejected: true as const, error: e }),
    );
    await vi.advanceTimersByTimeAsync(250);
    await vi.advanceTimersByTimeAsync(750);

    const result = await settled;
    if (!result.rejected) {
      throw new Error('expected sportmonksFetch to reject');
    }
    const error = result.error as Error;
    expect(error.message).toBe(
      'Sportmonks network error after 3 attempts: /foo — fetch failed',
    );
    expect(error.cause).toBe(networkError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
