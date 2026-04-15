import { headers } from 'next/headers';
import { ImageResponse } from 'next/og';

import { branchData, branchLogo, branchLogoSrc } from '@/data';

const DOMAINS = Object.keys(branchData);
const PREVIEW_FALLBACK = DOMAINS[0];

export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  const host = (await headers()).get('host') ?? '';
  const isLocal = host.startsWith('localhost');
  const domain = isLocal
    ? 'tacomagooners.com'
    : host in branchData
      ? host
      : PREVIEW_FALLBACK;

  const Logo = branchLogo[domain];
  const rasterSrc = branchLogoSrc[domain];

  return new ImageResponse(
    <div
      style={{
        ...size,
        backgroundColor: '#da1f26',
        backgroundImage:
          'linear-gradient(180deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.25))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {rasterSrc ? (
        // biome-ignore lint/performance/noImgElement: <img> required inside ImageResponse — Next/Image is not compatible with next/og
        // biome-ignore lint/a11y/useAltText: rendered to PNG via Satori, not served to browsers
        <img
          src={rasterSrc}
          height={String(size.height * 0.9)}
          style={{ objectFit: 'contain' }}
        />
      ) : (
        <Logo
          height={String(size.height * 0.9)}
          preserveAspectRatio='xMidYMid meet'
        />
      )}
    </div>,
    { ...size },
  );
}
