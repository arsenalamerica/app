import { FixtureCardLoading } from '@/components';
import type { FixtureIndexEntry } from '@/lib/sportmonks/fixtures';
import fixturesData from '@/lib/sportmonks/fixtures.json';

const fixtures: FixtureIndexEntry[] = fixturesData;

// Renders one skeleton per fixture so the loading paint occupies the same
// vertical space as the resolved page — no layout shift when streaming resolves.
// Keys are per-fixture-id to suppress React duplicate-key warnings within the list.
export default function FixturesPageLoading() {
  return fixtures.map(({ id }) => <FixtureCardLoading key={id} />);
}
