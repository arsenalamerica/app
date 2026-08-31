import logoSrc from './logoSrc';

describe('boisegooners logoSrc', () => {
  it('is a base64-encoded PNG data URI', () => {
    expect(logoSrc).toMatch(/^data:image\/png;base64,/);
  });
});
