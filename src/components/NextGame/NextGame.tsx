import { Heading } from '@ariakit/react';
import type { BranchData } from '@/data';
import type { FixtureEntity } from '@/lib/sportmonks';
import { epochToTime } from '@/lib/utils';
import { Card } from '../Card/Card';
import { LocalDateTime } from '../LocalDateTime/LocalDateTime';
import styles from './NextGame.module.scss';

export function NextGame({
  fixture,
  branch,
}: {
  fixture: FixtureEntity;
  branch: BranchData;
}) {
  const { starting_at_timestamp } = fixture;

  const fixtureDate = new Date(epochToTime(starting_at_timestamp));
  const branchHour = Number(
    fixtureDate.toLocaleTimeString('en-US', {
      timeZone: branch.timezone,
      hour: 'numeric',
      hour12: false,
    }),
  );

  const fixtureTimeBranch = fixtureDate.toLocaleTimeString('en-US', {
    timeZone: branch.timezone,
    timeStyle: 'short',
  });

  const isReplay = branch?.pub?.replayTime
    ? new Date(`1/1/2000 ${branch.pub.replayTime}`) >
      new Date(`1/1/2000 ${fixtureTimeBranch}`)
    : false;

  // THIS IS A TEMPORARY HARD-CODED FIX
  const viewingPub = branch?.pubs
    ? branchHour >= 6
      ? branch.pubs[0]
      : branch.pubs[1]
    : branch?.pub;

  return (
    <>
      <Heading>Match Watch Party</Heading>
      <Card as='div' className={styles._}>
        <p>
          <LocalDateTime
            epoch={starting_at_timestamp}
            options={{
              weekday: 'long',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            }}
          />{' '}
          {isReplay ? (
            `${branch.pub?.replayTime} (replay)`
          ) : (
            <LocalDateTime
              epoch={starting_at_timestamp}
              options={{ timeStyle: 'short' }}
            />
          )}
        </p>
        {viewingPub && (
          <address>
            <a href={viewingPub.website}>
              {viewingPub.name}
              <br />
              {viewingPub.address.replace(',', '\n')}
            </a>
          </address>
        )}
      </Card>
    </>
  );
}
