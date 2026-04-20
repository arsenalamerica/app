import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SPORTMONKS_BASE = 'https://api.sportmonks.com/v3/football';
const ARSENAL_TEAM_ID = 19;
// Safety cap: a full PL season for one club is ~60 fixtures at 50/page → 2 pages.
// Guards against an unexpected pagination bug looping forever.
const MAX_PAGES = 20;

export function serialize(fixtures) {
  return `${JSON.stringify(fixtures, null, 2)}\n`;
}

// True when writing `next` over `existing` would nuke a committed non-empty
// index with an empty fetch result — treat as an upstream fetch anomaly,
// not a schedule change, and skip the write so the next cron can retry.
export function isEmptyOverwrite(nextFixtures, existing) {
  if (nextFixtures.length > 0) return false;
  const trimmed = existing.trim();
  return trimmed !== '' && trimmed !== '[]';
}

export function seasonWindow(date = new Date()) {
  const month = date.getMonth();
  const year = date.getFullYear();
  const start = month > 6 ? year : year - 1;
  const end = start + 1;
  return { start: `${start}-07-01`, end: `${end}-06-30` };
}

async function main() {
  const token = process.env.MONK_TOKEN;
  if (!token) {
    console.error('MONK_TOKEN environment variable is required');
    process.exit(1);
  }

  const { start: seasonStart, end: seasonEnd } = seasonWindow();
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const fixturesPath = resolve(
    __dirname,
    '../src/lib/sportmonks/fixtures.json',
  );

  try {
    const byId = new Map();
    let page = 1;
    while (page <= MAX_PAGES) {
      const url = new URL(
        `${SPORTMONKS_BASE}/fixtures/between/${seasonStart}/${seasonEnd}/${ARSENAL_TEAM_ID}`,
      );
      url.searchParams.set('per_page', '50');
      url.searchParams.set('page', String(page));

      const res = await fetch(url, {
        headers: { Authorization: token },
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(
          `Sportmonks API error: ${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 500)}` : ''}`,
        );
      }

      const { data, pagination } = await res.json();
      for (const { id, starting_at_timestamp } of data) {
        byId.set(id, { id, kickoff: starting_at_timestamp });
      }
      if (!pagination?.has_more) break;
      page += 1;
    }
    if (page > MAX_PAGES) {
      throw new Error(
        `Pagination exceeded MAX_PAGES=${MAX_PAGES}; aborting without write.`,
      );
    }

    const fixtures = [...byId.values()].sort((a, b) => a.id - b.id);

    let existing = '';
    try {
      existing = await readFile(fixturesPath, 'utf-8');
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }

    if (isEmptyOverwrite(fixtures, existing)) {
      console.warn(
        'Sportmonks returned zero fixtures but committed file is non-empty; skipping write.',
      );
      process.exit(0);
    }

    const next = serialize(fixtures);
    if (existing === next) {
      console.log(`Fixture index unchanged (${fixtures.length} fixtures).`);
      process.exit(0);
    }

    await writeFile(fixturesPath, next);
    console.log(`Fixture index updated (${fixtures.length} fixtures).`);
  } catch (error) {
    console.error('sync-fixtures failed:', error.message);
    if (error.cause) console.error('  cause:', error.cause);
    process.exit(1);
  }
}

// Run only when invoked directly (e.g. `node scripts/sync-fixtures.mjs`).
// Imports from test files skip the fetch loop.
if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
