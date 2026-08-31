'use server';

import * as Sentry from '@sentry/nextjs';
import { headers } from 'next/headers';

import {
  getSettledFixtureById,
  getUnsettledFixtureById,
} from '@/lib/data/fixtures';
import type { FixtureEntity } from '@/lib/sportmonks';
import type { FixtureIndexEntry } from '@/lib/sportmonks/fixtures';
import fixturesData from '@/lib/sportmonks/fixtures.json';

const fixtures: FixtureIndexEntry[] = fixturesData;

/**
 * Discriminated result rather than a bare `FixtureEntity`.
 *
 * A server action serializes a thrown error before it reaches the client and
 * strips the message in production, so the client cannot classify a rejection.
 * Naming a permanent failure in the resolved value instead is what lets
 * `DeferredFixtureCard` suppress a Retry that could never succeed.
 *
 * The contract the two halves carry: resolving means the action reached a
 * definite conclusion, so `ok: false` is permanent for this client. Rejecting
 * means the failure may not recur, so Retry is worth offering.
 *
 * `SportmonksNotFoundError` — a fixture that is gone upstream — is the other
 * permanent case and is deliberately NOT classified here. `getSettledFixtureById`
 * and `getUnsettledFixtureById` live in a file-level `'use cache'` module, so a
 * throw inside them crosses a React Flight boundary and arrives as a
 * reconstructed `Error` with a digest; `instanceof` cannot hold. Classifying it
 * means returning it as a value from below that boundary, in `@/lib/data/fixtures`.
 * See docs/adr/012-server-action-permanent-failures.md.
 */
export type DeferredFixtureResult =
  | { ok: true; fixture: FixtureEntity }
  | { ok: false; reason: 'unknown-id' };

export async function loadDeferredFixture(
  id: number,
  settled: boolean,
): Promise<DeferredFixtureResult> {
  return Sentry.withServerActionInstrumentation(
    'loadDeferredFixture',
    { headers: await headers() },
    async (): Promise<DeferredFixtureResult> => {
      // Validate id against the static fixture index. fixture.id re-derives the
      // value from a trusted server-side source, breaking the taint chain from
      // the client-supplied parameter to the downstream fetch URL.
      const fixture = fixtures.find((f) => f.id === id);
      if (!fixture) {
        // The index is a committed artifact, so an id missing from it is
        // missing on every attempt too — a stale client bundle or a tampered
        // argument, never something a Retry resolves.
        Sentry.captureException(new Error(`Unknown fixture id=${id}`));
        return { ok: false, reason: 'unknown-id' };
      }
      // Anything the fetch throws rejects, and the surrounding instrumentation
      // reports it. That is the retryable path.
      return {
        ok: true,
        fixture: settled
          ? await getSettledFixtureById(fixture.id)
          : await getUnsettledFixtureById(fixture.id),
      };
    },
  );
}
