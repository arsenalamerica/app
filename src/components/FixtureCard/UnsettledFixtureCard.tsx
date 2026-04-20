import { getUnsettledFixtureById } from '@/lib/data/fixtures';
import { FixtureCard } from './FixtureCard';
import type { FixtureCardByIdProps } from './SettledFixtureCard';

export async function UnsettledFixtureCard({
  fixtureId,
  htmlId,
}: FixtureCardByIdProps) {
  const { id: _id, ...rest } = await getUnsettledFixtureById(fixtureId);
  return <FixtureCard id={htmlId} {...rest} />;
}
