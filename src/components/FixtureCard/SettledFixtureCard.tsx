import { getSettledFixtureById } from '@/lib/data/fixtures';
import { FixtureCard } from './FixtureCard';

export type FixtureCardByIdProps = {
  fixtureId: number;
};

export async function SettledFixtureCard({ fixtureId }: FixtureCardByIdProps) {
  const { id: _id, ...rest } = await getSettledFixtureById(fixtureId);
  return <FixtureCard data-id={fixtureId} data-settled='true' {...rest} />;
}
