import { LeagueTable } from '@/components';
import { getStandings } from '@/lib/data/standings';

export default async function LeagueTablePage() {
  const standings = await getStandings();
  return <LeagueTable standings={standings} />;
}
