import { describe, expect, it } from 'vitest';
import { centsToInput, formatDateTime, formatPrice, parsePrice, timeAgo } from './format';

describe('format', () => {
  it('formats prices in Dutch', () => {
    expect(formatPrice(1250).replace(/\s/g, ' ')).toBe('€ 12,50');
    expect(formatPrice(800).replace(/\s/g, ' ')).toBe('€ 8,00');
  });
  it('parses price input', () => {
    expect(parsePrice('12,50')).toBe(1250);
    expect(parsePrice('€ 9.5')).toBe(950);
    expect(parsePrice('7')).toBe(700);
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('abc')).toBeNaN();
    expect(parsePrice('1,234')).toBeNaN();
  });
  it('round-trips form values', () => expect(centsToInput(1250)).toBe('12,50'));
  it('formats relative time', () => {
    const now = new Date('2026-10-06T12:00:00Z');
    expect(timeAgo(new Date('2026-10-06T11:59:30Z'), now)).toBe('zojuist');
    expect(timeAgo(new Date('2026-10-06T11:48:00Z'), now)).toBe('12 minuten geleden');
    expect(timeAgo(new Date('2026-10-03T12:00:00Z'), now)).toBe('3 dagen geleden');
  });
  it('formats date and time', () => {
    expect(formatDateTime(new Date('2026-11-03T15:05:00Z'))).toBe('3 november 2026 om 16:05');
  });
});
