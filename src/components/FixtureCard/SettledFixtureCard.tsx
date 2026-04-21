import { getSettledFixtureById } from '@/lib/data/fixtures';
import { FixtureCard } from './FixtureCard';

export type FixtureCardByIdProps = {
  fixtureId: number;
};

export async function SettledFixtureCard({ fixtureId }: FixtureCardByIdProps) {
  const { id: _id, ...rest } = await getSettledFixtureById(fixtureId);
  // data-settled is a stable DOM marker the e2e suite counts to verify
  // settled cards actually stream into the response (unique to this branch —
  // UnsettledFixtureCard renders the same FixtureCard without it).
  return <FixtureCard data-id={fixtureId} data-settled='true' {...rest} />;
}
