import { render, screen } from '@testing-library/react';

import type { BranchData } from '@/data';
import type { FixtureEntity } from '@/lib/sportmonks';
import { NextGame } from './NextGame';

function epochAt(hourUTC: number): number {
  return Date.UTC(2023, 10, 14, hourUTC, 0, 0) / 1000;
}

function fixtureAt(hourUTC: number): FixtureEntity {
  return {
    id: 1,
    name: 'Arsenal vs West Ham',
    starting_at: new Date(epochAt(hourUTC) * 1000).toISOString(),
    starting_at_timestamp: epochAt(hourUTC),
    state_id: 1,
    state: {
      id: 1,
      state: 'NS',
      name: 'Not Started',
      short_name: 'NS',
      developer_name: 'NS',
    },
    league: { id: 8, name: 'Premier League', image_path: 'league.png' },
    venue: { id: 1, name: 'Emirates Stadium', image_path: 'venue.png' },
    participants: [],
    scores: [],
    periods: [],
    tvstations: [],
  };
}

describe('NextGame', () => {
  it('renders the scheduled kickoff time and pub address', () => {
    const branch: BranchData = {
      domain: 'boisegooners.com',
      name: 'Boise Gooners',
      timezone: 'UTC',
      pub: {
        name: 'Test Pub',
        address: '123 Main St, Springfield',
        website: 'https://pub.example',
      },
    };

    render(<NextGame fixture={fixtureAt(22)} branch={branch} />);

    expect(screen.queryByText(/replay/)).not.toBeInTheDocument();
    const address = screen.getByRole('link', { name: /Test Pub/ });
    expect(address).toHaveAttribute('href', 'https://pub.example');
    expect(address.textContent).toContain('Springfield');
  });

  it('renders the replay time when it is later than kickoff', () => {
    const branch: BranchData = {
      domain: 'boisegooners.com',
      name: 'Boise Gooners',
      timezone: 'UTC',
      pub: {
        name: 'Test Pub',
        address: '123 Main St, Springfield',
        website: 'https://pub.example',
        replayTime: '11:00 PM',
      },
    };

    render(<NextGame fixture={fixtureAt(22)} branch={branch} />);

    expect(screen.getByText(/11:00 PM \(replay\)/)).toBeInTheDocument();
  });

  it('renders the kickoff time when the replay time is earlier than kickoff', () => {
    const branch: BranchData = {
      domain: 'boisegooners.com',
      name: 'Boise Gooners',
      timezone: 'UTC',
      pub: {
        name: 'Test Pub',
        address: '123 Main St, Springfield',
        website: 'https://pub.example',
        replayTime: '9:00 PM',
      },
    };

    const { container } = render(
      <NextGame fixture={fixtureAt(22)} branch={branch} />,
    );

    expect(screen.queryByText(/replay/)).not.toBeInTheDocument();
    // The kickoff LocalDateTime renders instead of the replay string.
    expect(container.querySelectorAll('time').length).toBeGreaterThan(1);
  });

  it('picks the first pub when the branch hour is 6 or later', () => {
    const condition = {
      'time-compare': '',
      time: '',
      weekend: false,
      weekday: true,
    };
    const branch: BranchData = {
      domain: 'boisegooners.com',
      name: 'Boise Gooners',
      timezone: 'UTC',
      pubs: [
        {
          condition,
          name: 'Day Pub',
          address: '1 Day St',
          website: 'https://day.example',
        },
        {
          condition,
          name: 'Night Pub',
          address: '1 Night St',
          website: 'https://night.example',
        },
      ],
    };

    render(<NextGame fixture={fixtureAt(22)} branch={branch} />);

    expect(screen.getByRole('link', { name: /Day Pub/ })).toBeInTheDocument();
  });

  it('picks the second pub when the branch hour is before 6', () => {
    const condition = {
      'time-compare': '',
      time: '',
      weekend: false,
      weekday: true,
    };
    const branch: BranchData = {
      domain: 'boisegooners.com',
      name: 'Boise Gooners',
      timezone: 'UTC',
      pubs: [
        {
          condition,
          name: 'Day Pub',
          address: '1 Day St',
          website: 'https://day.example',
        },
        {
          condition,
          name: 'Night Pub',
          address: '1 Night St',
          website: 'https://night.example',
        },
      ],
    };

    render(<NextGame fixture={fixtureAt(3)} branch={branch} />);

    expect(screen.getByRole('link', { name: /Night Pub/ })).toBeInTheDocument();
  });

  it('renders no address when the branch has no pub or pubs', () => {
    const branch: BranchData = {
      domain: 'boisegooners.com',
      name: 'Boise Gooners',
      timezone: 'UTC',
    };

    const { container } = render(
      <NextGame fixture={fixtureAt(22)} branch={branch} />,
    );

    expect(container.querySelector('address')).not.toBeInTheDocument();
  });
});
