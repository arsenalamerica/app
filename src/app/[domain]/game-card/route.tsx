import { ImageResponse } from 'next/og';
import teams from '@/components/TeamLogo/teams';
import { branchData, branchLogo, branchLogoSrc } from '@/data';
import { getNextFixture } from '@/lib/data/fixtures';
import { fitText } from '@/lib/og/fitText';
import { getImageResponseFonts, getParsedFonts } from '@/lib/og/fonts';
import { ARSENAL_TEAM_ID } from '@/lib/sportmonks/sportmonks';
import { dateFromEpoch, epochToTime } from '@/lib/utils';

import { AwayBg, HomeBg } from './_backgrounds';

const SIZE = 1080;
// Center X for logo, billing, and time: right:33% + translateX(50%) = 67% from left
const CENTER_X = Math.round(SIZE * 0.6667);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ domain: string }> },
) {
  const { domain } = await params;

  const branch = branchData[domain];
  const Logo = branchLogo[domain];
  const rasterSrc = branchLogoSrc[domain];

  const fonts = getImageResponseFonts();
  const { boldFont, regFont } = getParsedFonts();

  const [fixture] = await getNextFixture();
  const { participants, starting_at_timestamp } = fixture;

  const url = new URL(req.url);
  const simulateAway = url.searchParams.get('simulate') === 'away';

  let localTeam = participants.find((p) => p.meta.location === 'home');
  let visitorTeam = participants.find((p) => p.meta.location === 'away');
  let isHomeGame = localTeam?.id === ARSENAL_TEAM_ID;

  if (simulateAway && isHomeGame) {
    [localTeam, visitorTeam] = [visitorTeam, localTeam];
    isHomeGame = false;
  }

  const fixtureDate = dateFromEpoch(starting_at_timestamp, branch.timezone);
  const fixtureTime = new Date(
    epochToTime(starting_at_timestamp),
  ).toLocaleTimeString('en-US', {
    timeZone: branch.timezone,
    timeStyle: 'short',
  });

  // Billing text sizing: max width 510px (leaving 30px breathing room from 540px container)
  const localLabel = localTeam
    ? localTeam.name + (localTeam.id !== ARSENAL_TEAM_ID ? ' vs' : '')
    : '';
  const visitorLabel = visitorTeam
    ? (visitorTeam.id !== ARSENAL_TEAM_ID ? 'vs ' : '') + visitorTeam.name
    : '';

  // Arsenal's row (no "vs") scales up to 200px. The "vs + opponent" row is then
  // sized to match Arsenal's actual rendered pixel width so both lines are equal.
  let localSize: number;
  let visitorSize: number;
  if (isHomeGame && localTeam && visitorTeam) {
    localSize = fitText(boldFont, localTeam.name, 510, 200, 32);
    const arsenalWidth = boldFont.getAdvanceWidth(localTeam.name, localSize);
    const visitorRowAt100 =
      regFont.getAdvanceWidth('vs', 75) +
      15 +
      boldFont.getAdvanceWidth(visitorTeam.name, 100);
    visitorSize = Math.max(
      32,
      Math.ceil((100 * arsenalWidth) / visitorRowAt100),
    );
  } else if (!isHomeGame && localTeam && visitorTeam) {
    visitorSize = fitText(boldFont, visitorTeam.name, 510, 200, 32);
    const arsenalWidth = boldFont.getAdvanceWidth(
      visitorTeam.name,
      visitorSize,
    );
    const localRowAt100 =
      boldFont.getAdvanceWidth(localTeam.name, 100) +
      15 +
      regFont.getAdvanceWidth('vs', 75);
    localSize = Math.max(32, Math.ceil((100 * arsenalWidth) / localRowAt100));
  } else {
    localSize = fitText(boldFont, localLabel, 510, 200, 32);
    visitorSize = fitText(boldFont, visitorLabel, 510, 200, 32);
  }

  // Time text sizing: max width 420px
  const dateSize = fitText(regFont, fixtureDate, 420, 72, 24);
  const timeSize = fitText(boldFont, `${fixtureTime} @ Doyle's`, 420, 72, 24);

  const textShadow = '0 0 16px rgba(0,0,0,0.3)';
  const badgeSize = 270;

  return new ImageResponse(
    <div
      style={{
        width: SIZE,
        height: SIZE,
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#da1f26',
        backgroundImage:
          'linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.25))',
      }}
    >
      {/* Background pattern */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: SIZE,
          height: SIZE,
          display: 'flex',
        }}
      >
        {isHomeGame ? <HomeBg /> : <AwayBg />}
      </div>

      {/* Branch logo */}
      <div
        style={{
          position: 'absolute',
          top: 86,
          left: CENTER_X - Math.round(badgeSize / 2),
          width: badgeSize,
          height: badgeSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          boxShadow: '0 0 24px 12px rgba(0,0,0,0.35)',
        }}
      >
        {rasterSrc ? (
          // biome-ignore lint/performance/noImgElement: <img> required inside ImageResponse
          // biome-ignore lint/a11y/useAltText: rendered to PNG via Satori
          <img
            src={rasterSrc}
            style={{
              width: badgeSize,
              height: badgeSize,
              objectFit: 'contain',
            }}
          />
        ) : (
          Logo && <Logo width={String(badgeSize)} />
        )}
      </div>

      {/* Team badges — left column, vertically centered */}
      {localTeam && visitorTeam && (
        <>
          <div
            style={{
              position: 'absolute',
              top: Math.round(SIZE / 2 - badgeSize - 27),
              left: Math.round(SIZE * 0.08),
              display: 'flex',
              flexDirection: 'column',
              gap: 54,
            }}
          >
            {teams.has(localTeam.id) ? (
              // biome-ignore lint/a11y/noSvgWithoutTitle: rendered to PNG via Satori
              <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 512 512'
                width={badgeSize}
                height={badgeSize}
              >
                <path fill='#ffffff' d={teams.get(localTeam.id)} />
              </svg>
            ) : (
              // biome-ignore lint/performance/noImgElement: <img> required inside ImageResponse — Next/Image is not compatible with next/og
              // biome-ignore lint/a11y/useAltText: rendered to PNG via Satori, not served to browsers
              <img
                src={localTeam.image_path}
                style={{
                  width: badgeSize,
                  height: badgeSize,
                  objectFit: 'contain',
                }}
              />
            )}
            {teams.has(visitorTeam.id) ? (
              // biome-ignore lint/a11y/noSvgWithoutTitle: rendered to PNG via Satori
              <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 512 512'
                width={badgeSize}
                height={badgeSize}
              >
                <path fill='#ffffff' d={teams.get(visitorTeam.id)} />
              </svg>
            ) : (
              // biome-ignore lint/performance/noImgElement: <img> required inside ImageResponse — Next/Image is not compatible with next/og
              // biome-ignore lint/a11y/useAltText: rendered to PNG via Satori, not served to browsers
              <img
                src={visitorTeam.image_path}
                style={{
                  width: badgeSize,
                  height: badgeSize,
                  objectFit: 'contain',
                }}
              />
            )}
          </div>

          {/* Team name billing */}
          <div
            style={{
              position: 'absolute',
              top: SIZE / 2,
              left: CENTER_X,
              transform: 'translate(-50%, -40%)',
              width: 540,
              display: 'flex',
              flexDirection: 'column',
              textAlign: 'center',
              textTransform: 'uppercase',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'baseline',
                gap: Math.round(localSize * 0.15),
                color: '#ffffff',
                lineHeight: 0.9,
                textShadow,
              }}
            >
              <span
                style={{
                  fontFamily: 'ars-bold',
                  fontWeight: 700,
                  fontSize: localSize,
                  letterSpacing: -(localSize * 0.03),
                }}
              >
                {localTeam.name}
              </span>
              {localTeam.id !== ARSENAL_TEAM_ID && (
                <span
                  style={{
                    fontFamily: 'ars-reg',
                    fontWeight: 400,
                    fontSize: localSize * 0.75,
                    letterSpacing: -(localSize * 0.75 * 0.03),
                  }}
                >
                  {'vs'}
                </span>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'baseline',
                gap: Math.round(visitorSize * 0.15),
                color: '#ffffff',
                lineHeight: 0.9,
                textShadow,
              }}
            >
              {visitorTeam.id !== ARSENAL_TEAM_ID && (
                <span
                  style={{
                    fontFamily: 'ars-reg',
                    fontWeight: 400,
                    fontSize: visitorSize * 0.75,
                    letterSpacing: -(visitorSize * 0.75 * 0.03),
                  }}
                >
                  {'vs'}
                </span>
              )}
              <span
                style={{
                  fontFamily: 'ars-bold',
                  fontWeight: 700,
                  fontSize: visitorSize,
                  letterSpacing: -(visitorSize * 0.03),
                }}
              >
                {visitorTeam.name}
              </span>
            </div>
          </div>

          {/* Date and kickoff time */}
          <div
            style={{
              position: 'absolute',
              bottom: 86,
              left: CENTER_X,
              transform: 'translateX(-50%)',
              width: 432,
              display: 'flex',
              flexDirection: 'column',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                color: '#ffffff',
                fontFamily: 'ars-reg',
                fontWeight: 400,
                fontSize: dateSize,
                letterSpacing: -(dateSize * 0.03),
                lineHeight: 1,
                textShadow,
                textTransform: 'uppercase',
              }}
            >
              {fixtureDate}
            </div>
            <div
              style={{
                color: '#ffffff',
                fontFamily: 'ars-bold',
                fontWeight: 700,
                fontSize: timeSize,
                letterSpacing: -(timeSize * 0.03),
                lineHeight: 1,
                textShadow,
                textTransform: 'uppercase',
              }}
            >
              {`${fixtureTime} @ Doyle's`}
            </div>
          </div>
        </>
      )}
    </div>,
    {
      width: SIZE,
      height: SIZE,
      fonts,
      headers: {
        'Cache-Control':
          'public, max-age=45, s-maxage=45, stale-while-revalidate=120',
      },
    },
  );
}
