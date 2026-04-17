'use client';

import { Textfit } from 'react-textfit';
import { dateFromEpoch, epochToTime } from '@/lib/utils';
import styles from './GameCard.module.scss';

export function GameCardTime({
  starting_at_timestamp,
  timeZone,
}: {
  starting_at_timestamp: number;
  timeZone: string;
}) {
  const fixtureDate = dateFromEpoch(starting_at_timestamp, timeZone);
  const fixtureTime = new Date(
    epochToTime(starting_at_timestamp),
  ).toLocaleTimeString('en-US', {
    timeZone,
    timeStyle: 'short',
  });

  return (
    <div className={styles.GameTime}>
      <Textfit mode='single'>
        <h2>{fixtureDate}</h2>
      </Textfit>
      <Textfit mode='single'>
        <h2>{fixtureTime} @ Doyle&apos;s</h2>
      </Textfit>
    </div>
  );
}
