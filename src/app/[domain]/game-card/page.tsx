import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

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
  // Layout also guards unknown domains, but layout and page render
  // concurrently in the App Router, so this page needs its own guard too.
  if (!branch) notFound();

  const [nextFixture] = await getNextFixture();

  // Nothing to render between seasons; this route exists only to produce a
  // shareable card for an actual fixture.
  if (!nextFixture) notFound();

  return <GameCard {...nextFixture} branch={branch} />;
}
