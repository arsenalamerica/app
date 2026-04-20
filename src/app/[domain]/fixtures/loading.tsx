import { FixtureCardLoading } from '@/components';
import type { FixtureIndexEntry } from '@/lib/sportmonks/fixtures';
import fixturesData from '@/lib/sportmonks/fixtures.json';

const fixtures: FixtureIndexEntry[] = fixturesData;

export default function FixturesPageLoading() {
  return fixtures.map(({ id }) => <FixtureCardLoading key={id} />);
}
