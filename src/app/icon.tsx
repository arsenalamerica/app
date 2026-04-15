import { headers } from 'next/headers';
import { ImageResponse } from 'next/og';

import { branchData, branchLogo } from '@/data';

import { ICON_SIZES } from './icon-sizes';

const DOMAINS = Object.keys(branchData);
const PREVIEW_FALLBACK = DOMAINS[0];

export function generateImageMetadata() {
  return ICON_SIZES.map((size) => ({
    contentType: 'image/png',
    size: { width: size, height: size },
    id: size,
  }));
}

export default async function Icon({ id }: { id: string }) {
  const host = (await headers()).get('host') ?? '';
  const isLocal = host.startsWith('localhost');
  const domain = isLocal
    ? 'tacomagooners.com'
    : host in branchData
      ? host
      : PREVIEW_FALLBACK;

  const Logo = branchLogo[domain];
  const size = parseInt(id, 10);

  const isFavicon = size === 32;
  const logoSize = isFavicon ? size : Math.floor(size * 0.9);
  const backgroundImage = isFavicon
    ? 'none'
    : 'linear-gradient(0deg, rgba(163,22,27,1) 0%, rgba(218,31,38,1) 100%)';

  return new ImageResponse(
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage,
      }}
    >
      <Logo width={String(logoSize)} preserveAspectRatio='xMidYMid meet' />
    </div>,
    { width: size, height: size },
  );
}
