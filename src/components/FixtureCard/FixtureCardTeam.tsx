import type { EntityBase } from '@/lib/sportmonks';
import { TeamLogo } from '../TeamLogo/TeamLogo';
import styles from './FixtureCard.module.scss';

interface FixtureCardTeamProps extends EntityBase {
  short_code: string;
  isLoading?: boolean;
}

export function FixtureCardTeam({
  id,
  name,
  image_path,
  short_code,
  isLoading,
}: FixtureCardTeamProps) {
  const loadingClassname = isLoading ? 'loading' : '';

  return (
    <div className={styles.Team}>
      <TeamLogo
        isLoading={isLoading}
        className={[styles.TeamLogo, loadingClassname].join(' ')}
        teamId={id}
        name={name}
        fallback={image_path}
      />
      <div className={[styles.TeamName, loadingClassname].join(' ')}>
        {name}
      </div>
      <div className={[styles.TeamAbbr, loadingClassname].join(' ')}>
        {short_code}
      </div>
    </div>
  );
}
