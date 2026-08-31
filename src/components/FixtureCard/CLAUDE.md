# FixtureCard — development guidance

## FixtureCard throws; every render site needs a boundary

`FixtureCard.tsx` throws on data that cannot be rendered honestly:

- an absent or empty `participants` include
- no home/away `CURRENT` score row for a fixture in a `FULL_TIME_STATES` state

Both are upstream drift, not "no fixture", and both used to render misleading
text instead (`"No upcoming fixtures..."` and the literal `"undefined-undefined"`
— issue #79). So **every place that renders `FixtureCard` must sit under
`FixtureCardBoundary`**, which reports to Sentry and degrades that one card:

- `src/app/[domain]/fixtures/page.tsx` — `renderReal` wraps the dispatchers
- `DeferredFixtureCard.tsx` — wraps its own `FixtureCard` (it is rendered
  outside the page's boundary, so without this a throw blanks the whole route)
- `src/app/[domain]/page.tsx` — wraps the home page's next-fixture card

A caller that genuinely has no fixture to show writes its own copy; the home
page does this for the empty `getNextFixture` result. Do not reintroduce a
"nothing to show" branch inside `FixtureCard`.

`FULL_TIME_STATES` is deliberately narrow. Postponed, cancelled, abandoned,
delayed, suspended and walkover fixtures legitimately carry no score, and
breaks and extra time are in play without being in `REGULAR_TIME_ACTIVE_STATES`
(`src/lib/sportmonks/fixtures.ts`). Widening the throw to "not upcoming and not
active" turns every postponed fixture into a recurring Sentry issue.

## Deferred vs. dispatched cards

`SettledFixtureCard` / `UnsettledFixtureCard` are async server components used
for the cards nearest the viewport. `DeferredFixtureCard` is a client component
that fetches on intersection through the `loadDeferredFixture` server action.

The action returns a discriminated result: `ok: false` is a **permanent**
failure and renders `FixtureCardError` with no Retry, while a rejection is
transient and keeps Retry. See `docs/adr/012-server-action-permanent-failures.md`
for the rule and for why a `SportmonksNotFoundError` cannot be classified in the
action today (issue #364).

`FixtureCardError`'s props are a union, so a Retry button with no handler behind
it does not type-check. Pass `canRetry={false}` for the permanent case.

## Testing

Specs assert the score slot through the CSS-module class (`styles.Score`), not
by text, so "no score" is distinguishable from "some other text". Tests that
expect a throw should stub `console.error`, since React logs the component stack.
