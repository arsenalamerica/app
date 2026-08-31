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
 * A 200 response that carries no `data` at all. Sportmonks does not 404 a
 * missing or unlicensed single entity — it answers 200 with a body holding only
 * a generic `message`, so this is the only signal that the entity is gone.
 *
 * Named so it groups in Sentry as its own issue rather than surfacing as a
 * downstream TypeError several frames from the actual cause (issue #337).
 */
export class SportmonksNotFoundError extends Error {
  constructor(path: string, detail?: string) {
    super(
      `Sportmonks returned no data: ${path}${detail ? ` — ${detail}` : ''}`,
    );
    this.name = 'SportmonksNotFoundError';
  }
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

  const res = await fetch(url, {
    headers: { Authorization: token },
  });

  if (!res.ok) {
    let detail = '';
    try {
      const body = (await res.json()) as { message?: string };
      detail = body.message ?? '';
    } catch {
      // body was not JSON
    }
    throw new Error(
      `Sportmonks ${res.status}${detail ? ` ${detail}` : ''}: ${path}`,
    );
  }
  const body = (await res.json()) as T;

  // Key on the `data` key being *present*, never on it being truthy and never
  // on `message`. A collection endpoint with no matches returns `data: []`
  // alongside the same generic message — a legitimate empty result the callers
  // handle (see the off-season path in getNextFixture). A missing single entity
  // omits `data` entirely, and destructuring it downstream yields undefined and
  // crashes several frames later.
  if (typeof body !== 'object' || body === null || !('data' in body)) {
    const detail = (body as { message?: string } | null)?.message;
    throw new SportmonksNotFoundError(path, detail);
  }

  return body;
}
