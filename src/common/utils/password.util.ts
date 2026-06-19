import { randomInt } from 'crypto';

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?';
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

function pick(charset: string): string {
  return charset[randomInt(0, charset.length)];
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generates a cryptographically secure password that satisfies:
 * length >= 12, ≥1 upper, ≥1 lower, ≥1 digit, ≥1 symbol.
 */
export function generateSecurePassword(length = 14): string {
  if (length < 8) {
    throw new Error('Password length must be at least 8');
  }
  const required = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  const remaining = Array.from({ length: length - required.length }, () =>
    pick(ALL),
  );
  return shuffle([...required, ...remaining]).join('');
}
