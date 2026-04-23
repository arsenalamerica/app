import { Heading, HeadingLevel, VisuallyHidden } from '@ariakit/react';

import {
  type FixtureEntity,
  REGULAR_TIME_ACTIVE_STATES,
} from '@/lib/sportmonks';
import { Card, type CardProps } from '../Card/Card';
import { LeagueLogo } from '../LeagueLogo/LeagueLogo';
import { LocalDateTime } from '../LocalDateTime/LocalDateTime';
import styles from './FixtureCard.module.scss';
import { FixtureCardTeam } from './FixtureCardTeam';

type FixtureCardProps = Omit<CardProps, 'id'> & Omit<FixtureEntity, 'id'>;

export function FixtureCard({
  name,
  className,
  participants,
  starting_at_timestamp,
  league,
  scores,
  periods,
  venue,
  state,
  // Discard remaining entity fields so they don't leak to the DOM via ...rest
  starting_at: _starting_at,
  state_id: _state_id,
  tvstations: _tvstations,
  has_odds: _has_odds,
  has_premium_odds: _has_premium_odds,
  placeholder: _placeholder,
  ...rest
}: FixtureCardProps) {
  if (!participants) {
    return (
      <Card className={[styles._, className].join(' ')} {...rest}>
        <HeadingLevel>
          <VisuallyHidden>
            <Heading>{name}</Heading>
          </VisuallyHidden>
          <div className={styles.Details}>No upcoming fixtures...</div>
        </HeadingLevel>
      </Card>
    );
  }

  const localTeam = participants.find((team) => team.meta.location === 'home');
  const visitorTeam = participants.find(
    (team) => team.meta.location === 'away',
  );

  const currentScores = new Map(
    scores
      ?.filter((score) => score.description === 'CURRENT')
      .map((score) => [score.score.participant, score.score.goals]) || [],
  );

  const isActive = new Set(REGULAR_TIME_ACTIVE_STATES).has(state.state);
  const ticking = periods.find((period) => period.ticking);
  const isFuture = state.state === 'NS';

  return (
    <Card className={[styles._, className].join(' ')} {...rest}>
      <HeadingLevel>
        <VisuallyHidden>
          <Heading>{name}</Heading>
        </VisuallyHidden>
        <div className={styles.Details}>
          {localTeam && <FixtureCardTeam {...localTeam} />}
          <div className={styles.Separator}>
            <div className={styles.Date}>
              {isActive ? (
                ticking ? (
                  `${ticking.minutes}'`
                ) : (
                  'HT'
                )
              ) : isFuture ? (
                <LocalDateTime
                  epoch={starting_at_timestamp}
                  options={{
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  }}
                />
              ) : (
                // Past fixture shows a date only (no time). Render it on
                // the server in UTC to skip the client island — all
                // branches are in North America and matches are in Europe,
                // so the UTC/local date never disagree for a completed
                // match.
                <time
                  dateTime={new Date(
                    starting_at_timestamp * 1000,
                  ).toISOString()}
                >
                  {new Intl.DateTimeFormat('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'UTC',
                  }).format(new Date(starting_at_timestamp * 1000))}
                </time>
              )}
            </div>
            <div className={styles.Score}>
              {isFuture ? (
                <LocalDateTime
                  epoch={starting_at_timestamp}
                  options={{ timeStyle: 'short' }}
                />
              ) : (
                `${currentScores.get('home')}-${currentScores.get('away')}`
              )}
            </div>
          </div>
          {visitorTeam && <FixtureCardTeam {...visitorTeam} />}
        </div>
        <footer className={styles.Metadata}>
          <div>
            <LeagueLogo
              leagueId={league.id}
              name={league.name}
              fallback={league.image_path}
            />
            <span>{league.name}</span>
          </div>
          <div>{venue?.name}</div>
        </footer>
      </HeadingLevel>
    </Card>
  );
}

export function FixtureCardLoading() {
  return (
    <Card className={styles._}>
      <HeadingLevel>
        <VisuallyHidden>
          <Heading>Loading...</Heading>
        </VisuallyHidden>
        <div className={styles.Details}>
          <FixtureCardTeam
            isLoading
            id={19}
            name='Loading'
            short_code='XXX'
            image_path='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
          />
          <div className={styles.Separator}>
            <div className={styles.Date} />
            <div className={styles.Score} />
          </div>
          <FixtureCardTeam
            isLoading
            id={19}
            name='Loading'
            short_code='XXX'
            image_path='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
          />
        </div>
        <footer className={styles.Metadata}>
          <div>
            <LeagueLogo
              className='loading'
              leagueId={2}
              name='Loading...'
              fallback='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
            />
          </div>
          <div />
        </footer>
      </HeadingLevel>
    </Card>
  );
}
