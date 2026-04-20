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
  // data-settled is a stable DOM marker the e2e suite counts to verify
  // settled cards actually stream into the response (unique to this branch —
  // UnsettledFixtureCard renders the same FixtureCard without it).
  return <FixtureCard id={htmlId} data-settled='true' {...rest} />;
}
