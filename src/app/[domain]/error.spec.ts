import { describe, expect, it } from 'vitest';
import { RouteError } from '@/components';

import RouteErrorPage from './error';

describe('[domain]/error', () => {
  it('re-exports RouteError as the route error boundary', () => {
    expect(RouteErrorPage).toBe(RouteError);
  });
});
