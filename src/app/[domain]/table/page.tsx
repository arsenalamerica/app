import { LeagueTable } from '@/components';
import { getStandings } from '@/lib/data/standings';

// https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#revalidate
export const revalidate = 60; // 1 minute

export default async function LeagueTablePage() {
  const standings = await getStandings();
  return <LeagueTable standings={standings} />;
}
