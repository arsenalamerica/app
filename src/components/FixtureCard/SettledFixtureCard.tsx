import { getSettledFixtureById } from '@/lib/data/fixtures';
import { FixtureCard } from './FixtureCard';

export type FixtureCardByIdProps = {
  fixtureId: number;
  htmlId?: string;
};

export async function SettledFixtureCard({
  fixtureId,
  htmlId,
}: FixtureCardByIdProps) {
  const { id: _id, ...rest } = await getSettledFixtureById(fixtureId);
  return <FixtureCard id={htmlId} {...rest} />;
}
