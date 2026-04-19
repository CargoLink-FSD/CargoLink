import { describe, expect, it } from 'vitest';
import {
  REGEX,
  emailSchema,
  panSchema,
  passwordSchema,
  phoneSchema,
  pinSchema,
} from '../../src/utils/schemas';

describe('utils/schemas — REGEX patterns', () => {
  it('REGEX.EMAIL accepts valid email addresses', () => {
    expect(REGEX.EMAIL.test('user@example.com')).toBe(true);
    expect(REGEX.EMAIL.test('user.name+tag@sub.domain.org')).toBe(true);
  });

  it('REGEX.EMAIL rejects invalid email formats', () => {
    expect(REGEX.EMAIL.test('not-an-email')).toBe(false);
    expect(REGEX.EMAIL.test('@nodomain.com')).toBe(false);
    expect(REGEX.EMAIL.test('missing@tld.')).toBe(false);
  });

  it('REGEX.PHONE accepts Indian mobile numbers', () => {
    expect(REGEX.PHONE.test('9876543210')).toBe(true);
    expect(REGEX.PHONE.test('6123456789')).toBe(true);
  });

  it('REGEX.PHONE rejects invalid phone numbers', () => {
    expect(REGEX.PHONE.test('1234567890')).toBe(false); // starts with 1
    expect(REGEX.PHONE.test('98765')).toBe(false);      // too short
  });

  it('REGEX.PAN accepts valid PAN format', () => {
    expect(REGEX.PAN.test('ABCDE1234F')).toBe(true);
    expect(REGEX.PAN.test('XYZAB9876Z')).toBe(true);
  });

  it('REGEX.PAN rejects invalid PAN', () => {
    expect(REGEX.PAN.test('abcde1234f')).toBe(false); // lowercase not matched
    expect(REGEX.PAN.test('123AB4567C')).toBe(false); // starts with digits
    expect(REGEX.PAN.test('ABCDE123')).toBe(false);   // too short
  });

  it('REGEX.PIN accepts valid 6-digit Indian PIN codes', () => {
    expect(REGEX.PIN.test('400001')).toBe(true);  // Mumbai
    expect(REGEX.PIN.test('110001')).toBe(true);  // Delhi
  });

  it('REGEX.PIN rejects invalid PIN codes', () => {
    expect(REGEX.PIN.test('000000')).toBe(false); // starts with 0
    expect(REGEX.PIN.test('12345')).toBe(false);  // 5 digits
    expect(REGEX.PIN.test('1234567')).toBe(false); // 7 digits
  });
});

describe('utils/schemas — Zod schema validators', () => {
  it('emailSchema passes valid email and fails invalid email', () => {
    expect(emailSchema.safeParse('hello@world.com').success).toBe(true);
    expect(emailSchema.safeParse('bad-email').success).toBe(false);
    expect(emailSchema.safeParse('').success).toBe(false);
  });

  it('phoneSchema passes valid Indian number and fails invalid', () => {
    expect(phoneSchema.safeParse('9876543210').success).toBe(true);
    expect(phoneSchema.safeParse('1234567890').success).toBe(false);
    expect(phoneSchema.safeParse('98765').success).toBe(false);
  });

  it('panSchema passes valid PAN and fails invalid', () => {
    expect(panSchema.safeParse('ABCDE1234F').success).toBe(true);
    expect(panSchema.safeParse('invalid-pan').success).toBe(false);
    expect(panSchema.safeParse('').success).toBe(false);
  });

  it('pinSchema passes valid PIN and fails invalid', () => {
    expect(pinSchema.safeParse('400001').success).toBe(true);
    expect(pinSchema.safeParse('000001').success).toBe(false); // starts with 0
    expect(pinSchema.safeParse('40000').success).toBe(false);  // too short
  });
});
