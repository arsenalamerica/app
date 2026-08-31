import { describe, expect, it } from 'vitest';

import { shite } from './shite';

describe('shite', () => {
  it('returns an empty string for falsy input', () => {
    expect(shite('')).toBe('');
  });

  it('replaces Tottenham with Totnum', () => {
    expect(shite('Tottenham')).toBe('Totnum');
  });

  it('replaces lowercase tottenham with totnum', () => {
    expect(shite('tottenham')).toBe('totnum');
  });

  it('replaces Hotspur with Shitspur', () => {
    expect(shite('Hotspur')).toBe('Shitspur');
  });

  it('replaces lowercase hotspur with shitspur', () => {
    expect(shite('hotspur')).toBe('shitspur');
  });

  it('replaces Tottenham Hotspur end to end', () => {
    expect(shite('Tottenham Hotspur')).toBe('Totnum Shitspur');
  });

  it('strips a trailing (London) qualifier', () => {
    expect(shite('Tottenham Hotspur (London)')).toBe('Totnum Shitspur');
  });

  it('leaves unrelated names untouched', () => {
    expect(shite('Arsenal')).toBe('Arsenal');
  });
});
