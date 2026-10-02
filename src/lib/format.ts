const TZ = 'Europe/Amsterdam';

const dateTime = new Intl.DateTimeFormat('nl-NL', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const dateOnly = new Intl.DateTimeFormat('nl-NL', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' });
const shortDateTime = new Intl.DateTimeFormat('nl-NL', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const euro = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' });

/** "3 november 2026 om 16:05" */
export function formatDateTime(date: Date): string {
  return dateTime.format(date).replace(/,?\s(?:om\s)?(\d{2}:\d{2})$/, ' om $1');
}

export function formatDate(date: Date): string {
  return dateOnly.format(date);
}

export function formatShortDateTime(date: Date): string {
  return shortDateTime.format(date);
}

/** Formats a calendar date string (YYYY-MM-DD) as "3 november 2026". */
export function formatCalendarDate(date: string): string {
  return new Intl.DateTimeFormat('nl-NL', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T00:00:00Z`));
}

/** "€ 12,50" */
export function formatPrice(cents: number): string {
  return euro.format(cents / 100);
}

/** Parses "12,50", "12.50", "€ 12,5" or "12" into cents. Returns null when invalid. */
export function parsePrice(input: string): number | null {
  const cleaned = input.replace(/€|\s/g, '').replace(',', '.');
  if (cleaned === '') return null;
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(cleaned)) return Number.NaN;
  return Math.round(Number(cleaned) * 100);
}

/** Cents → "12,50" for form fields. */
export function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}

/** "zojuist", "12 minuten geleden", "gisteren", "3 dagen geleden" */
export function timeAgo(date: Date, now = new Date()): string {
  const seconds = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (seconds < 60) return 'zojuist';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return minutes === 1 ? '1 minuut geleden' : `${minutes} minuten geleden`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 uur geleden' : `${hours} uur geleden`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'gisteren';
  if (days < 30) return `${days} dagen geleden`;
  const months = Math.round(days / 30);
  if (months < 12) return months === 1 ? '1 maand geleden' : `${months} maanden geleden`;
  return formatDate(date);
}

/** Amsterdam calendar date of an instant, as YYYY-MM-DD. */
export function todayInAmsterdam(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function telHref(e164: string): string {
  return `tel:${e164.replace(/[^+\d]/g, '')}`;
}
