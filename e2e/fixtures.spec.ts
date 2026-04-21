import { expect, test } from '@playwright/test';
import {
  computeFixtureOrder,
  SETTLED_REAL,
} from '../src/lib/data/fixtureTiming';
import fixturesData from '../src/lib/sportmonks/fixtures.json';

type FixtureIndexEntry = { id: number; kickoff: number };
const fixtures: FixtureIndexEntry[] = fixturesData;

test('fixtures page renders the Fixtures heading', async ({ page }) => {
  await page.goto('/fixtures');
  await expect(page.getByRole('heading', { name: 'Fixtures' })).toBeVisible();
});

test('windowed settled fixtures stream real card markup into the /fixtures response', async ({
  request,
}) => {
  const nowS = Math.floor(Date.now() / 1000);
  const { settledIds } = computeFixtureOrder(fixtures, nowS);
  const settledCount = settledIds.length;
  const windowedCount = Math.min(SETTLED_REAL, settledCount);

  // No settled fixtures exist at the start of a new season. The assertion
  // below has nothing meaningful to verify in that window.
  test.skip(
    settledCount === 0,
    'no settled fixtures in index yet — start of season',
  );

  // request.get() returns the full streamed response body — the PPR shell
  // plus every Suspense boundary that resolved before the stream closed.
  // The SETTLED_REAL most-recent settled cards hit cacheLife('max') and
  // resolve ~instantly; their real markup must be present by the time the
  // stream ends. All other settled cards are DeferredFixtureCard skeletons
  // that hydrate via IntersectionObserver on scroll — not present in initial HTML.
  const response = await request.get('/fixtures');
  const html = await response.text();

  // data-settled="true" is emitted only by SettledFixtureCard. After windowing,
  // min(SETTLED_REAL, settledCount) settled cards are server-rendered — up to
  // SETTLED_REAL (= 2), fewer early in a season.
  const resolvedCardCount = (html.match(/data-settled="true"/g) ?? []).length;
  expect(resolvedCardCount).toBe(windowedCount);
});

test('all fixture cards render in ascending kickoff order', async ({
  request,
}) => {
  const response = await request.get('/fixtures');
  const html = await response.text();

  // Every card slot — real (SettledFixtureCard / UnsettledFixtureCard) and
  // deferred (DeferredFixtureCard skeleton) — emits data-id. Extracting them
  // in document order gives the full rendered sequence; mapping to kickoff
  // timestamps lets us assert the entire list is a single ascending timeline.
  const kickoffById = new Map(fixtures.map(({ id, kickoff }) => [id, kickoff]));
  const ids = [...html.matchAll(/data-id="(\d+)"/g)].map(([, id]) =>
    Number(id),
  );

  test.skip(
    ids.length === 0,
    'no fixture cards in initial HTML — cannot verify order',
  );

  const kickoffs = ids.map((id) => kickoffById.get(id) ?? -1);
  for (let i = 1; i < kickoffs.length; i++) {
    expect(kickoffs[i]).toBeGreaterThanOrEqual(kickoffs[i - 1]);
  }
});
