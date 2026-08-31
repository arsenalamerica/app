import { branchData, branchLogo, branchLogoSrc } from './index';

const domains = [
  'boisegooners.com',
  'cascadiagooners.com',
  'eastlagooners.com',
  'pdxgooners.com',
  'tacomagooners.com',
  'vancouverarsenal.com',
];

describe('branches', () => {
  describe('branchData', () => {
    it('contains an entry for every branch domain', () => {
      expect(Object.keys(branchData).sort()).toEqual(domains.sort());
    });

    it('keys each entry by its own domain and includes required fields', () => {
      for (const [domain, data] of Object.entries(branchData)) {
        expect(data.domain).toBe(domain);
        expect(typeof data.name).toBe('string');
        expect(data.name.length).toBeGreaterThan(0);
        expect(typeof data.timezone).toBe('string');
      }
    });
  });

  describe('branchLogo', () => {
    it('contains a logo component for every branch domain', () => {
      expect(Object.keys(branchLogo).sort()).toEqual(domains.sort());
    });

    it('maps each domain to a function component', () => {
      for (const Logo of Object.values(branchLogo)) {
        expect(typeof Logo).toBe('function');
      }
    });
  });

  describe('branchLogoSrc', () => {
    it('only includes branches that define a logoSrc', () => {
      // Only boisegooners exports a logoSrc string; the rest fall through the
      // `logoSrc ? {...} : {}` branch in exportLogoSrcHelper.
      expect(Object.keys(branchLogoSrc)).toEqual(['boisegooners.com']);
    });

    it('exposes the logoSrc string for the branch that defines one', () => {
      expect(typeof branchLogoSrc['boisegooners.com']).toBe('string');
      expect(branchLogoSrc['boisegooners.com']?.length).toBeGreaterThan(0);
    });

    it('does not include a key for branches without a logoSrc', () => {
      expect(branchLogoSrc['cascadiagooners.com']).toBeUndefined();
    });
  });
});
