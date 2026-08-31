import { render } from '@testing-library/react';

import { LocalDateTime } from './LocalDateTime';

describe('LocalDateTime', () => {
  it('should render the ISO dateTime attribute and formatted text content', () => {
    const epoch = 1_700_000_000;
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };

    const { container } = render(
      <LocalDateTime epoch={epoch} options={options} />,
    );

    const time = container.querySelector('time');
    expect(time).toHaveAttribute(
      'dateTime',
      new Date(epoch * 1000).toISOString(),
    );
    expect(time).toHaveTextContent(
      new Intl.DateTimeFormat(undefined, options).format(
        new Date(epoch * 1000),
      ),
    );
  });
});
