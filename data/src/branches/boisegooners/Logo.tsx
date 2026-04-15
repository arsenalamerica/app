import type { SVGProps } from 'react';
import logoSrc from './logoSrc';

const SvgLogo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    xmlnsXlink='http://www.w3.org/1999/xlink'
    xmlSpace='preserve'
    viewBox='0 0 870 870'
    {...props}
  >
    <defs>
      <circle id='logo_svg__a' cx={435} cy={435} r={435} />
    </defs>
    <clipPath id='logo_svg__b'>
      <use xlinkHref='#logo_svg__a' overflow='visible' />
    </clipPath>
    <g clipPath='url(#logo_svg__b)'>
      <image
        xlinkHref={logoSrc}
        width={1080}
        height={1080}
        overflow='visible'
        transform='matrix(.99 0 0 .99 -99.6 -99.6)'
      />
    </g>
  </svg>
);
export default SvgLogo;

export { logoSrc };
