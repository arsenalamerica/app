const loadingFixtures = Array.from({ length: 25 });

import { FixtureCardLoading } from '@/components';

export default async function FixturesPageLoading() {
  return loadingFixtures?.map((_fixture, i) => <FixtureCardLoading key={i} />);
}
