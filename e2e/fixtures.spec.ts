import { expect, test } from '@playwright/test';
import fixturesData from '../src/lib/sportmonks/fixtures.json';

type FixtureIndexEntry = { id: number; kickoff: number };
const fixtures: FixtureIndexEntry[] = fixturesData;
const SETTLED_THRESHOLD_S = 86_400;

test('fixtures page renders the Fixtures heading', async ({ page }) => {
  await page.goto('/fixtures');
  await expect(page.getByRole('heading', { name: 'Fixtures' })).toBeVisible();
});

test('fixtures page exposes the next-fixture scroll anchor', async ({
  page,
}) => {
  const nowS = Math.floor(Date.now() / 1000);
  const settledCutoff = nowS - SETTLED_THRESHOLD_S;
  const hasUnsettled = fixtures.some(({ kickoff }) => kickoff > settledCutoff);

  // End-of-season: every fixture is more than 24h past kickoff, so
  // getFixtureTiming() returns nextFixtureId = undefined and no card renders
  // the #next-fixture anchor. Nothing to assert.
  test.skip(
    !hasUnsettled,
    'every fixture is settled — end of season, no next-fixture anchor',
  );

  await page.goto('/fixtures');
  // Anchor presence confirms the server derived the correct fixture id from
  // the committed fixtures.json index without calling getNextFixture(), and
  // gives /fixtures#next-fixture a navigable deep-link target.
  await expect(page.locator('#next-fixture')).toBeAttached();
});

test('settled fixtures stream real card markup into the /fixtures response', async ({
  request,
}) => {
  const nowS = Math.floor(Date.now() / 1000);
  const settledCutoff = nowS - SETTLED_THRESHOLD_S;
  const settledCount = fixtures.filter(
    ({ kickoff }) => kickoff < settledCutoff,
  ).length;

  // No settled fixtures exist at the start of a new season. The assertion
  // below has nothing meaningful to verify in that window.
  test.skip(
    settledCount === 0,
    'no settled fixtures in index yet — start of season',
  );

  // request.get() returns the full streamed response body — the PPR shell
  // plus every Suspense boundary that resolved before the stream closed.
  // Settled cards hit cacheLife('max') and resolve ~instantly; their real
  // markup must be present by the time the stream ends.
  const response = await request.get('/fixtures');
  const html = await response.text();

  // data-settled="true" is emitted only by SettledFixtureCard. Unsettled
  // cards and FixtureCardLoading skeletons do not carry it, so the count is
  // a strict lower bound on settled-card Suspense resolution. A regression
  // where settled cards never stream (cache miss + upstream failure, bad
  // dispatch, rendering exception) drops this below settledCount and fails.
  const resolvedCardCount = (html.match(/data-settled="true"/g) ?? []).length;
  expect(resolvedCardCount).toBeGreaterThanOrEqual(settledCount);
});
