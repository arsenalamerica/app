import { branchData } from '@/data';
import { ICON_SIZES } from '../icon-sizes';
import Icon from './icon';

const domains = Object.keys(branchData);

describe('Icon route handler', () => {
  it.each(
    domains.flatMap((domain) => ICON_SIZES.map((size) => ({ domain, size }))),
  )('returns a Response for domain=$domain size=$size', async ({
    domain,
    size,
  }) => {
    const response = await Icon({
      id: String(size),
      params: Promise.resolve({ domain }),
    });
    expect(response).toBeInstanceOf(Response);
  });
});
