import { Heading } from '@ariakit/react';
import { Suspense } from 'react';
import { FixtureCard, Main, NextGame } from '@/components';
import { branchData, branchLogo } from '@/data';
import { getNextFixture } from '@/lib/data/fixtures';

export default async function Home(props: {
  params: Promise<{ domain: string }>;
}) {
  const params = await props.params;
  const branch = branchData[params.domain];
  const Logo = branchLogo[branch.domain];

  const [nextFixture] = await getNextFixture();

  return (
    <Main>
      {Logo && <Logo title={branch.name} role='img' />}
      <Heading>Next Match</Heading>
      <Suspense>
        <FixtureCard {...nextFixture} />
      </Suspense>
      <NextGame fixture={nextFixture} branch={branch} />
    </Main>
  );
}
