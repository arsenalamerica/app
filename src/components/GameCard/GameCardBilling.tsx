'use client';

import { Textfit } from 'react-textfit';
import type { EntityBase } from '@/lib/sportmonks';
import { shite } from '@/lib/utils';
import styles from './GameCard.module.scss';

export function GameCardBilling({
  localTeam,
  visitorTeam,
}: {
  localTeam: EntityBase;
  visitorTeam: EntityBase;
}) {
  return (
    <div className={styles.MainBilling}>
      <Textfit mode='single' max={500}>
        <h2>
          {shite(localTeam.name)}
          <span>{localTeam.id !== 19 && ' vs'}</span>
        </h2>
      </Textfit>
      <Textfit mode='single' max={500}>
        <h2>
          <span>{visitorTeam.id !== 19 && 'vs '}</span>
          {shite(visitorTeam.name)}
        </h2>
      </Textfit>
    </div>
  );
}
