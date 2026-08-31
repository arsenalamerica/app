# ADR-012: Server actions return permanent failures as values, not throws

## Status

Accepted

## Context

`DeferredFixtureCard` renders `FixtureCardError` with a Retry button whenever
`loadDeferredFixture` rejects. Retry is the right affordance for a timeout or a
Sportmonks 503. It is a dead end for a failure that will recur identically —
issue #347 raised this for `SportmonksNotFoundError`, where a stale id in the
committed fixture index means the entity is gone upstream and every attempt
returns the same nothing.

The client cannot tell the two apart from the rejection. A server action does
not hand the client the error object: React serializes it across the RSC
boundary, and a production build replaces the message with an opaque string plus
a digest. `instanceof`, `error.name`, and message matching are all unavailable by
the time the rejection reaches `.catch()`.

There is a second boundary behind that one. `src/lib/data/fixtures.ts` is a
file-level `'use cache'` module, so `getSettledFixtureById` and
`getUnsettledFixtureById` run inside Next's cache wrapper, which renders their
result — a throw included — to a React Flight stream and reads it back through a
tee (`next/dist/server/use-cache/use-cache-wrapper.js`). An error thrown below
that boundary therefore arrives at the action as a reconstructed `Error` with a
digest, not as the original instance. A `try/catch` in the action cannot classify
it either.

## Decision

A server action that can fail permanently returns a discriminated result rather
than throwing:

```ts
type DeferredFixtureResult =
  | { ok: true; fixture: FixtureEntity }
  | { ok: false; reason: 'unknown-id' };
```

The contract both halves carry:

- **Resolving** means the action reached a definite conclusion. `ok: false` is
  permanent for this client, so the UI offers no Retry.
- **Rejecting** means the failure may not recur. Retry stays.

A permanent failure returns normally, which skips
`Sentry.withServerActionInstrumentation`'s own reporting, so the action captures
it explicitly before returning.

A failure may only be classified where its type still exists — above every
serialization boundary it must cross. `unknown-id` qualifies: the action derives
it from the committed fixture index in its own frame. `SportmonksNotFoundError`
does not, and classifying it means returning it as a value from inside
`@/lib/data/fixtures`, below the `'use cache'` boundary. That is deliberately not
done here (see issue #364); until it is, a fixture that is gone upstream stays on
the retryable path.

## Consequences

- Callers narrow on `ok` instead of catching, and the compiler stops them reading
  `fixture` off a failure.
- Permanent failures no longer mark the action's span as errored, so a Sentry
  alert keyed on `serverAction/loadDeferredFixture` failure rate does not see
  them. The explicit `captureException` is what keeps them visible.
- Adding a permanent reason is a type change that forces every consumer to
  re-narrow, which is the intended pressure.
- The rule generalizes: this is the shape for any action in `src/lib/actions/`
  whose caller needs to distinguish "try again" from "never".
