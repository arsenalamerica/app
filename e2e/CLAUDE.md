# e2e/CLAUDE.md

## Running Tests

By default tests target `http://localhost:3000`, so `yarn dev` in one terminal and `yarn e2e` in another is enough for local runs.

To run against a deployed Vercel preview instead, set:

- `PLAYWRIGHT_BASE_URL` — target URL (e.g. a Vercel preview deployment URL)
- `VERCEL_BYPASS_SECRET` — Vercel protection bypass token

CI sets these on the `e2e` job only; no other job (biome, knip, typecheck, test, build, lighthouse) needs them.

## Selector Strategy

**Prefer `getByRole` and other accessible locators. Never use `data-testid` or other test-only attributes.**

Playwright's accessible locator API — `getByRole`, `getByLabel`, `getByText` — queries the accessibility tree rather than the DOM. This means tests interact with the app the same way a screenreader or assistive technology would.

Reasons to avoid `data-testid`:

- **It tests nothing meaningful.** A `data-testid` can exist on a completely inaccessible element — broken ARIA role, missing accessible name, wrong semantics — and the test would still pass. You get coverage of behavior but not of accessibility.
- **It couples tests to implementation.** Test IDs are noise in the production markup. They require discipline to maintain and are easily orphaned when components are refactored.
- **`getByRole` gives you both for free.** If `page.getByRole('button', { name: 'Reset' })` passes, you know the element exists, has the correct ARIA role, and has a meaningful accessible name. A regression in any of those properties fails the test — which is the right outcome.

Locator priority (highest to lowest):

1. `page.getByRole(role, { name })` — role + accessible name from the accessibility tree
2. `page.getByLabel(text)` — form elements associated with a `<label>` or `aria-label`
3. `page.getByText(text)` — visible text content, for non-interactive elements
4. CSS/attribute selectors — only as a last resort when no semantic locator applies

When a test cannot be written without a `data-testid`, treat it as a signal that the component is missing accessible semantics — fix the component, not the test.

## Scoping Locators

Use chained locators to scope queries to a subtree when multiple elements share the same accessible name:

```ts
// Scope to a container to disambiguate — equivalent to Testing Library's within().
await page.getByRole('dialog').getByRole('button', { name: 'Reset' }).click();
```

## Dynamic Import Timing

Components loaded via `next/dynamic` with `ssr: false` are absent from the initial server-rendered HTML. Do not assert on them immediately after navigation.

Playwright's `expect` assertions auto-wait up to the configured timeout, so this is sufficient:

```ts
await expect(page.getByRole('button', { name: 'Some Action' })).toBeVisible();
```

No explicit `waitForSelector` or `waitFor` wrapper is needed.
