import Image from 'next/image';
import type { StandingEntity } from '@/lib/sportmonks';
import { Card } from '../Card/Card';
import { TeamLogo } from '../TeamLogo/TeamLogo';
import styles from './LeagueTable.module.scss';

function TableBase({ children }: { children: React.ReactNode }) {
  return (
    <Card className={styles._}>
      <table>
        <thead>
          <tr>
            <th>Team</th>
            <th>GP</th>
            <th>W</th>
            <th>D</th>
            <th>L</th>
            <th>GD</th>
            <th>GF</th>
            <th>GA</th>
            <th>P</th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </Card>
  );
}

export function LeagueTable({ standings }: { standings: StandingEntity[] }) {
  return (
    <TableBase>
      {standings?.map((team) => (
        <tr key={team.id}>
          <td>
            <TeamLogo
              teamId={team.participant.id}
              name={team.participant.name}
              fallback={team.participant.image_path}
            />
            <span className={styles.TeamName}>{team.participant.name}</span>
            <span className={styles.ShortName}>
              {team.participant.short_code}
            </span>
          </td>
          <td>{team.stats['overall-matches-played']}</td>
          <td>{team.stats['overall-won']}</td>
          <td>{team.stats['overall-draw']}</td>
          <td>{team.stats['overall-lost']}</td>
          <td>
            {team.stats['overall-goals-for'] -
              team.stats['overall-goals-against']}
          </td>
          <td>{team.stats['overall-goals-for']}</td>
          <td>{team.stats['overall-goals-against']}</td>
          <td>{team.stats['overall-points']}</td>
        </tr>
      ))}
    </TableBase>
  );
}

export function LeagueTableLoading() {
  const loadingStandings = Array.from({ length: 20 });

  return (
    <TableBase>
      {loadingStandings.map((_team, i) => (
        <tr key={i}>
          <td>
            <Image
              className='loading'
              src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
              alt='Loading...'
              width={24}
              height={24}
              unoptimized
            />{' '}
            <span className='loading'>Loading...</span>
          </td>
          <td>
            <span className='loading'>0</span>
          </td>
          <td>
            <span className='loading'>0</span>
          </td>
          <td>
            <span className='loading'>0</span>
          </td>
          <td>
            <span className='loading'>0</span>
          </td>
          <td>
            <span className='loading'>0</span>
          </td>
          <td>
            <span className='loading'>0</span>
          </td>
          <td>
            <span className='loading'>0</span>
          </td>
          <td>
            <span className='loading'>0</span>
          </td>
        </tr>
      ))}
    </TableBase>
  );
}
