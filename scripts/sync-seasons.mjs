import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SPORTMONKS_BASE = 'https://api.sportmonks.com/v3/football';
const PREMIER_LEAGUE_ID = 8;

const __dirname = dirname(fileURLToPath(import.meta.url));
const seasonsPath = resolve(__dirname, '../src/lib/sportmonks/seasons.json');

const token = process.env.MONK_TOKEN;
if (!token) {
  console.error('MONK_TOKEN environment variable is required');
  process.exit(1);
}

try {
  const res = await fetch(
    `${SPORTMONKS_BASE}/leagues/${PREMIER_LEAGUE_ID}?include=currentSeason`,
    {
      headers: { Authorization: token },
      signal: AbortSignal.timeout(30_000),
    },
  );

  if (!res.ok) {
    console.error(`Sportmonks API error: ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const { data } = await res.json();

  if (!data?.currentSeason?.id) {
    console.error(
      `Sportmonks returned no currentSeason for league ${PREMIER_LEAGUE_ID}`,
    );
    process.exit(1);
  }

  const newSeasonId = data.currentSeason.id;

  const existing = JSON.parse(await readFile(seasonsPath, 'utf-8'));
  const oldSeasonId = existing.premierLeague.seasonId;

  if (oldSeasonId === newSeasonId) {
    console.log(`Season ID unchanged (${oldSeasonId}). No update needed.`);
    process.exit(0);
  }

  existing.premierLeague.seasonId = newSeasonId;
  await writeFile(seasonsPath, `${JSON.stringify(existing, null, 2)}\n`);

  console.log(`Season ID updated: ${oldSeasonId} → ${newSeasonId}`);
} catch (error) {
  console.error('sync-seasons failed:', error.message);
  process.exit(1);
}
