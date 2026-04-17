'use client';
import clsx from 'clsx';
import { trackEvent } from 'fathom-client';
import type React from 'react';
import ExternalLink from '../ExternalLink/ExternalLink';
import styles from './SocialLinks.module.scss';
import socialIcons from './socialIcons';

export interface SocialLinksProperties
  extends React.HTMLAttributes<HTMLUListElement> {
  links: {
    name: string;
    url?: string;
  }[];
}

const handleClick = () => {
  trackEvent('social');
};

export function SocialLinks({
  className,
  links,
  ...rest
}: SocialLinksProperties) {
  return (
    links && (
      <ul {...rest} className={clsx(styles._, className)}>
        {links.map(({ name, url }) => {
          const path = socialIcons.get(name);

          if (!path) {
            console.warn(`Social icon not found: ${name}`);
            return null;
          }

          return (
            <li key={name}>
              <ExternalLink onClick={handleClick} href={url}>
                <svg
                  role='img'
                  viewBox='0 0 24 24'
                  width='24'
                  height='24'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <title>{name}</title>
                  <path d={path} />
                </svg>
              </ExternalLink>
            </li>
          );
        })}
      </ul>
    )
  );
}
