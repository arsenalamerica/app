import { Heading } from '@ariakit/react';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Card, FixtureCard, Main, NextGame } from '@/components';
import { branchData, branchLogo } from '@/data';
import { getNextFixture } from '@/lib/data/fixtures';

export default async function Home(props: {
  params: Promise<{ domain: string }>;
}) {
  const params = await props.params;
  const branch = branchData[params.domain];
  // Layout also guards unknown domains, but layout and page render
  // concurrently in the App Router, so this page needs its own guard too.
  if (!branch) notFound();
  const Logo = branchLogo[branch.domain];

  const [nextFixture] = await getNextFixture();

  if (!nextFixture) {
    return (
      <Main>
        {Logo && <Logo title={branch.name} role='img' />}
        <Heading>Next Match</Heading>
        <Card as='div'>
          <p>
            No upcoming match scheduled. Check back once the next season&rsquo;s
            fixtures are announced.
          </p>
        </Card>
      </Main>
    );
  }

  const { id: _id, ...nextFixtureProps } = nextFixture;

  return (
    <Main>
      {Logo && <Logo title={branch.name} role='img' />}
      <Heading>Next Match</Heading>
      <Suspense>
        <FixtureCard {...nextFixtureProps} />
      </Suspense>
      <NextGame fixture={nextFixture} branch={branch} />
    </Main>
  );
}
