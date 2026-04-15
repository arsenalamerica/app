import { render } from '@testing-library/react';

import { TeamLogo } from './TeamLogo';

describe('TeamLogo', () => {
  it('should render successfully', () => {
    const { baseElement } = render(
      <TeamLogo teamId={19} name='Team Name' fallback='img_path' />,
    );
    expect(baseElement).toBeTruthy();
  });
});
