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
  page,
}) => {
  // domcontentloaded rather than the default load: no load state tells us the
  // card list is final (see below), so the assertions below do the waiting.
  // Blocking on load would only add a dependency on remote logo images, whose
  // timeout would say nothing about ordering.
  await page.goto('/fixtures', { waitUntil: 'domcontentloaded' });

  // The whole index sorted by kickoff — the same order the page renders from.
  // Sorting is clock-independent, so this holds whatever getFixtureTiming()
  // has cached; only the settled/unsettled dispatch moves with the clock.
  const { orderedIds } = computeFixtureOrder(
    fixtures,
    Math.floor(Date.now() / 1000),
  );

  // Every card slot — real (SettledFixtureCard / UnsettledFixtureCard) and
  // deferred (DeferredFixtureCard skeleton) — emits data-id.
  //
  // Scoping to the main landmark is load-bearing, not just hygiene. Streamed
  // Suspense content lands in a `<div hidden>` staging container in stream
  // order and is moved into place by React; until that happens the cards are
  // out of the accessibility tree, so getByRole('main') does not match them
  // and the assertion below keeps retrying. Matching on [data-id] alone would
  // read the staging container — i.e. stream order, the very thing this test
  // exists to catch — and no load state is late enough to rule that out:
  // <main> is still staged at DOMContentLoaded and at load.
  const cards = page.getByRole('main').locator('[data-id]');

  // Auto-waiting matcher, and the count comes first: it waits out cards React
  // has not placed yet instead of snapshotting them as missing, and it fails
  // on a card that dropped its data-id by erroring into FixtureCardBoundary.
  // Without it a shortened list is still ascending, so a broken page passes
  // silently. 15s because the wait spans hydration on a cold preview.
  await expect(cards).toHaveCount(orderedIds.length, { timeout: 15_000 });

  const ids = await cards.evaluateAll((els) =>
    els.map((el) => Number(el.getAttribute('data-id'))),
  );
  expect(ids).toEqual(orderedIds);
});
