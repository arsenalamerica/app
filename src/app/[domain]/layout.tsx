import './global.scss';

import { Heading, HeadingLevel, VisuallyHidden } from '@ariakit/react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import {
  FathomNext,
  NavBar,
  PWAInstallPrompt,
  SocialLinks,
} from '@/components';
import { branchData } from '@/data';

export interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ domain: string }>;
}

export async function generateMetadata(props: LayoutProps): Promise<Metadata> {
  const params = await props.params;
  const branch = branchData[params.domain];
  if (!branch) return {};

  return {
    title: branch.name,
    description: `Welcome to ${branch.name}!`,
  };
}

export default async function Layout(props: LayoutProps) {
  const params = await props.params;
  const branch = branchData[params.domain];
  if (!branch) notFound();

  const { children } = props;

  return (
    <HeadingLevel>
      <PWAInstallPrompt />
      <Suspense>
        <FathomNext fathomId='RFIYDIHQ' />
        <header>
          <VisuallyHidden>
            <Heading>{branch.name}</Heading>
          </VisuallyHidden>
          <NavBar />
        </header>
        <HeadingLevel>{children}</HeadingLevel>
        <HeadingLevel level={3}>
          <footer>
            <Heading>Socials</Heading>
            {branch.social && <SocialLinks links={branch.social} />}
            {branch.footer && <p>{branch.footer}</p>}
          </footer>
        </HeadingLevel>
      </Suspense>
    </HeadingLevel>
  );
}
