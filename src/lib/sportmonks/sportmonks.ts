import { ENV } from 'varlock/env';

export type Sportmonks = {
  subscription: [];
  rate_limit: {
    resets_in_seconds: number;
    remaining: number;
    requested_entity: string;
  };
  timezone: string;
  pagination: {
    count: number;
    per_page: number;
    current_page: number;
    next_page: number | null;
    has_more: boolean;
  };
};

export type EntityBase = {
  id: number;
  name: string;
  image_path: string;
};

export const ARSENAL_TEAM_ID = 19;

const SPORTMONKS_BASE = 'https://api.sportmonks.com/v3/football';

/**
 * A 200 response with no usable `data`: either a body that is not an object, or
 * one that omits `data` or sets it nullish. Sportmonks does not 404 a missing or
 * unlicensed single entity — observed on issue #337 for fixture 19873650, it
 * answers 200 with a body holding only a generic `message`, so this is the only
 * signal that the entity is gone.
 *
 * Throwing is what stops the failure surfacing as a TypeError several frames
 * downstream. The distinct class name additionally keeps it grouped on its own
 * in Sentry; `this.name` is what carries that through a minified build, so it is
 * asserted in the spec rather than left to look redundant.
 */
export class SportmonksNotFoundError extends Error {
  constructor(
    readonly path: string,
    readonly detail?: string,
  ) {
    super(
      `Sportmonks returned no data: ${path}${detail ? ` — ${detail}` : ''}`,
    );
    this.name = 'SportmonksNotFoundError';
  }
}

/**
 * A non-OK response `sportmonksFetch` did not (or could not) recover from via
 * retry: a 4xx (never retried), or a 5xx that was still failing after
 * `RETRY_DELAYS_MS` was exhausted. `status` lets callers branch on the code;
 * `this.name` carries the distinct grouping through a minified build, same as
 * `SportmonksNotFoundError` above. Message format is unchanged from the plain
 * `Error` this replaces (`Sportmonks <status>[ <detail>]: <path>`) so existing
 * grouping and any message-matching stay valid.
 */
export class SportmonksServerError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    readonly detail?: string,
  ) {
    super(`Sportmonks ${status}${detail ? ` ${detail}` : ''}: ${path}`);
    this.name = 'SportmonksServerError';
  }
}

// Sportmonks 503/504s are transient — observed 9 times over 4 months in
// Sentry (APP-7) — and blanked the whole route segment on a single failed
// fetch. Two retries with a short backoff absorbs those without masking a
// genuinely down upstream: 4xx responses are never retried, since retrying a
// client error (bad params, auth) just repeats the same failure three times.
const RETRY_DELAYS_MS = [250, 750];

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sportmonksFetch<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  // MONK_TOKEN is required outside tests, so `next build` and `varlock run` exit
  // before reaching this. `next dev` deliberately stays up on a config error
  // though, and ENV then yields undefined — which Headers would stringify to the
  // literal "undefined" and Sportmonks would reject as an opaque 401. It is also
  // empty under `test`, so this is what stops a test reaching the real API.
  const token = ENV.MONK_TOKEN;
  if (!token) {
    throw new Error(
      'MONK_TOKEN is not set. It resolves from 1Password in local dev — check ' +
        'OP_TOKEN is set in .env.local (see README.md) and read the varlock errors ' +
        'above. In tests it is empty by design; mock the calling module instead.',
    );
  }

  const url = new URL(`${SPORTMONKS_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const maxAttempts = RETRY_DELAYS_MS.length + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const isLastAttempt = attempt === maxAttempts - 1;

    let res: Response;
    try {
      res = await fetch(url, {
        headers: { Authorization: token },
      });
    } catch (err) {
      // A network error (DNS, timeout, connection reset — `fetch` rejects
      // rather than resolving with a status). Treated the same as a 5xx:
      // retryable, since it is as likely transient.
      if (isLastAttempt) {
        throw err;
      }
      await wait(RETRY_DELAYS_MS[attempt]);
      continue;
    }

    if (!res.ok) {
      let detail = '';
      try {
        const body = (await res.json()) as { message?: string };
        detail = body.message ?? '';
      } catch {
        // body was not JSON
      }

      if (res.status >= 500 && !isLastAttempt) {
        await wait(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw new SportmonksServerError(res.status, path, detail);
    }

    const body = (await res.json()) as T;

    // Reject on `data` being absent or nullish, never on `message` and never on
    // plain truthiness.
    //
    // Not `message`: a collection endpoint with no matches returns `data: []`
    // alongside the very same generic message, and that is a legitimate empty
    // result callers handle — e.g. no upcoming fixture between seasons.
    //
    // Not truthiness: `data: []` is truthy, so the two predicates agree on the
    // shapes seen so far, but truthiness encodes an assumption about what may sit
    // in `data` rather than about whether the entity exists. Sportmonks does use
    // `null` for an absent sub-object (a fixture with no assigned venue), so a
    // nullish `data` is worth rejecting explicitly rather than letting it
    // destructure to undefined and crash several frames later.
    if (
      typeof body !== 'object' ||
      body === null ||
      !('data' in body) ||
      (body as { data: unknown }).data == null
    ) {
      const detail = (body as { message?: string } | null)?.message;
      throw new SportmonksNotFoundError(path, detail);
    }

    return body;
  }

  // Unreachable: the loop above always either returns or throws on its last
  // attempt. Satisfies the compiler, which cannot see that.
  throw new Error(`Sportmonks: exhausted retries for ${path}`);
}
