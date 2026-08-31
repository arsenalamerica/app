import { render, screen } from '@testing-library/react';

import { GameCardBilling } from './GameCardBilling';

// happy-dom reports zero height for every element, which makes react-textfit
// warn that it "can not process element without height." Render children
// directly instead of exercising its resize-measurement logic.
vi.mock('react-textfit', () => ({
  Textfit: ({ children }: { children: React.ReactNode }) => children,
}));

describe('GameCardBilling', () => {
  it('omits " vs" after the local team name when the local team is Arsenal', () => {
    render(
      <GameCardBilling
        localTeam={{ id: 19, name: 'Arsenal', image_path: 'arsenal.png' }}
        visitorTeam={{ id: 1, name: 'West Ham', image_path: 'westham.png' }}
      />,
    );

    const [localHeading, visitorHeading] = screen.getAllByRole('heading', {
      level: 2,
    });
    expect(localHeading).toHaveTextContent('Arsenal');
    expect(visitorHeading).toHaveTextContent('vs West Ham');
  });

  it('shows " vs" after the local team name when the visitor team is Arsenal', () => {
    render(
      <GameCardBilling
        localTeam={{ id: 1, name: 'West Ham', image_path: 'westham.png' }}
        visitorTeam={{ id: 19, name: 'Arsenal', image_path: 'arsenal.png' }}
      />,
    );

    const [localHeading, visitorHeading] = screen.getAllByRole('heading', {
      level: 2,
    });
    expect(localHeading).toHaveTextContent('West Ham vs');
    expect(visitorHeading).toHaveTextContent('Arsenal');
  });
});
