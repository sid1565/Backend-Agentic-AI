import { generateSecurePassword } from '../src/common/utils/password.util';

describe('generateSecurePassword', () => {
  it('AC-SEC-1: generates passwords of requested length', () => {
    expect(generateSecurePassword(14)).toHaveLength(14);
  });

  it('AC-SEC-2: contains upper, lower, digit, and symbol', () => {
    for (let i = 0; i < 50; i++) {
      const pw = generateSecurePassword(12);
      expect(pw).toMatch(/[A-Z]/);
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/[0-9]/);
      expect(pw).toMatch(/[^A-Za-z0-9]/);
    }
  });

  it('AC-SEC-3: rejects too-short lengths', () => {
    expect(() => generateSecurePassword(4)).toThrow();
  });
});
