import type { Metadata } from 'next';

import { GameCard } from '@/components';
import { branchData } from '@/data';
import { getNextFixture } from '@/lib/data/fixtures';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function GameCardPage(props: {
  params: Promise<{ domain: string }>;
}) {
  const params = await props.params;
  const branch = branchData[params.domain];

  const [nextFixture] = await getNextFixture();

  return <GameCard {...nextFixture} branch={branch} />;
}
