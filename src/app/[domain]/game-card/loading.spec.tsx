import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import GameCardPageLoading from './loading';

describe('game-card/loading', () => {
  it('renders a Loading placeholder', async () => {
    const ui = await GameCardPageLoading();
    const { getByText } = render(ui);

    expect(getByText('Loading')).toBeInTheDocument();
  });
});
