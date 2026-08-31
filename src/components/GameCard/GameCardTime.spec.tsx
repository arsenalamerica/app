import { render, screen } from '@testing-library/react';

import { dateFromEpoch, epochToTime } from '@/lib/utils';
import { GameCardTime } from './GameCardTime';

// happy-dom reports zero height for every element, which makes react-textfit
// warn that it "can not process element without height." Render children
// directly instead of exercising its resize-measurement logic.
vi.mock('react-textfit', () => ({
  Textfit: ({ children }: { children: React.ReactNode }) => children,
}));

describe('GameCardTime', () => {
  it('renders the fixture date and time in the given timezone', () => {
    const starting_at_timestamp = 1_700_000_000;
    const timeZone = 'America/Los_Angeles';

    render(
      <GameCardTime
        starting_at_timestamp={starting_at_timestamp}
        timeZone={timeZone}
      />,
    );

    const expectedDate = dateFromEpoch(starting_at_timestamp, timeZone);
    const expectedTime = new Date(
      epochToTime(starting_at_timestamp),
    ).toLocaleTimeString('en-US', { timeZone, timeStyle: 'short' });

    expect(screen.getByText(expectedDate)).toBeInTheDocument();
    expect(screen.getByText(`${expectedTime} @ Doyle's`)).toBeInTheDocument();
  });
});
