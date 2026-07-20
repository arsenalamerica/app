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

export async function sportmonksFetch<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  // MONK_TOKEN is @required, so `next build` and `varlock run` both exit before
  // reaching this. `next dev` deliberately stays up on a config error though, and
  // ENV then yields undefined — which Headers would stringify to the literal
  // "undefined" and Sportmonks would reject as an opaque 401. Fail clearly instead.
  const token = ENV.MONK_TOKEN;
  if (!token) {
    throw new Error(
      'MONK_TOKEN is not set. Locally it resolves from 1Password — check the op ' +
        'CLI is installed, the desktop app is unlocked, and the varlock errors above.',
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
  return res.json() as Promise<T>;
}
