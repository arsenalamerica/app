import { GameCard } from '@/components';
import { branchData } from '@/data';
import { getNextFixture } from '@/lib/data/fixtures';

// https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#revalidate
export const revalidate = 45; // 45 seconds

export default async function GameCardPage(props: {
  params: Promise<{ domain: string }>;
}) {
  const params = await props.params;
  const branch = branchData[params.domain];

  const [nextFixture] = await getNextFixture();

  return <GameCard {...nextFixture} branch={branch} />;
}
