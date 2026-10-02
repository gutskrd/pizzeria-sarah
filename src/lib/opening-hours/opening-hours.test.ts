import { describe, expect, it } from 'vitest';
import { computeStatus, isoWeekday, resolveDay, toLocalMoment, upcomingExceptions, validatePeriods, weekRows, type Schedule } from './index';

const regular: Schedule = {
  weekly: [
    { weekday: 1, periods: [], note: 'Gesloten, behalve op feestdagen' },
    ...[2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, periods: [{ opens: '16:00', closes: '20:00' }], note: '' })),
  ],
  exceptions: [],
};

// 2026-10-06 is a Tuesday. CEST = UTC+2 in October (before the 25th).
const at = (iso: string) => new Date(iso);

describe('local time', () => {
  it('converts to Amsterdam time including DST', () => {
    expect(toLocalMoment(at('2026-10-06T14:30:00Z'))).toEqual({ date: '2026-10-06', minutes: 16 * 60 + 30, weekday: 2 });
    // Winter time (UTC+1)
    expect(toLocalMoment(at('2026-12-01T23:30:00Z'))).toMatchObject({ date: '2026-12-02', minutes: 30 });
  });
  it('computes ISO weekdays', () => {
    expect(isoWeekday('2026-10-05')).toBe(1);
    expect(isoWeekday('2026-10-11')).toBe(7);
  });
});

describe('computeStatus', () => {
  it('is open during opening hours', () => {
    const s = computeStatus(regular, at('2026-10-06T15:00:00Z')); // 17:00 local
    expect(s.isOpenNow).toBe(true);
    expect(s.headline).toBe('Nu geopend');
    expect(s.detail).toBe('Vandaag geopend tot 20:00');
  });
  it('announces later opening today', () => {
    const s = computeStatus(regular, at('2026-10-06T10:00:00Z')); // 12:00 local
    expect(s.isOpenNow).toBe(false);
    expect(s.headline).toBe('Vandaag geopend');
    expect(s.detail).toBe('Vandaag geopend van 16:00 tot 20:00');
  });
  it('closes exactly at closing time', () => {
    const s = computeStatus(regular, at('2026-10-06T18:00:00Z')); // 20:00 local
    expect(s.isOpenNow).toBe(false);
    expect(s.headline).toBe('Nu gesloten');
    expect(s.detail).toBe('Morgen geopend vanaf 16:00');
  });
  it('handles a closed Monday', () => {
    const s = computeStatus(regular, at('2026-10-05T12:00:00Z'));
    expect(s.headline).toBe('Vandaag gesloten');
    expect(s.detail).toBe('Morgen geopend vanaf 16:00');
    expect(s.todayHours).toBe('Gesloten');
  });
  it('after Sunday closing, skips the closed Monday', () => {
    const s = computeStatus(regular, at('2026-10-11T19:00:00Z')); // Sunday 21:00
    expect(s.detail).toBe('Dinsdag weer geopend vanaf 16:00');
  });
  it('applies a holiday opening on a Monday', () => {
    const schedule: Schedule = {
      ...regular,
      exceptions: [{ startsOn: '2026-12-28', endsOn: '2026-12-28', isClosed: false, label: 'Feestdag', periods: [{ opens: '16:00', closes: '21:00' }] }],
    };
    const s = computeStatus(schedule, at('2026-12-28T16:00:00Z')); // 17:00 CET
    expect(s.isOpenNow).toBe(true);
    expect(s.detail).toBe('Vandaag geopend tot 21:00');
  });
  it('applies a temporary closure with a label', () => {
    const schedule: Schedule = {
      ...regular,
      exceptions: [{ startsOn: '2026-10-06', endsOn: '2026-10-20', isClosed: true, label: 'Vakantie', periods: [] }],
    };
    const s = computeStatus(schedule, at('2026-10-06T15:00:00Z'));
    expect(s.isOpenNow).toBe(false);
    expect(s.headline).toBe('Vandaag gesloten (Vakantie)');
    expect(s.detail).toBe('Weer geopend op woensdag 21 oktober vanaf 16:00');
  });
  it('handles split periods', () => {
    const schedule: Schedule = {
      weekly: [
        {
          weekday: 2,
          periods: [
            { opens: '17:00', closes: '21:00' },
            { opens: '11:30', closes: '14:00' },
          ],
          note: '',
        },
      ],
      exceptions: [],
    };
    expect(resolveDay(schedule, '2026-10-06').periods[0]?.opens).toBe('11:30');
    const s = computeStatus(schedule, at('2026-10-06T13:00:00Z')); // 15:00
    expect(s.headline).toBe('Nu gesloten');
    expect(s.detail).toBe('Vandaag weer geopend vanaf 17:00');
    expect(s.todayHours).toBe('11:30 – 14:00 en 17:00 – 21:00');
  });
  it('falls back when never open', () => {
    const s = computeStatus({ weekly: [], exceptions: [] }, at('2026-10-06T15:00:00Z'));
    expect(s.detail).toBe('Bel ons voor de actuele openingstijden');
  });
});

describe('display helpers', () => {
  it('marks today in the week overview', () => {
    const rows = weekRows(regular, at('2026-10-06T15:00:00Z'));
    expect(rows).toHaveLength(7);
    expect(rows[0]).toMatchObject({ name: 'Maandag', hours: 'Gesloten', note: 'Gesloten, behalve op feestdagen' });
    expect(rows[1]?.isToday).toBe(true);
  });
  it('lists upcoming exceptions', () => {
    const schedule: Schedule = {
      ...regular,
      exceptions: [
        { startsOn: '2026-12-25', endsOn: '2026-12-26', isClosed: true, label: 'Kerst', periods: [] },
        { startsOn: '2026-10-01', endsOn: '2026-10-02', isClosed: true, label: 'Voorbij', periods: [] },
      ],
    };
    const list = upcomingExceptions(schedule, at('2026-12-01T12:00:00Z'));
    expect(list).toEqual([{ label: 'Kerst', when: '25 december t/m 26 december', hours: 'Gesloten', isClosed: true }]);
  });
});

describe('validatePeriods', () => {
  it('accepts valid periods', () => expect(validatePeriods([{ opens: '16:00', closes: '20:00' }])).toBeNull());
  it('rejects reversed periods', () => expect(validatePeriods([{ opens: '20:00', closes: '16:00' }])).toMatch(/na de openingstijd/));
  it('rejects overlap', () =>
    expect(
      validatePeriods([
        { opens: '12:00', closes: '15:00' },
        { opens: '14:00', closes: '18:00' },
      ]),
    ).toMatch(/overlappen/));
  it('rejects bad format', () => expect(validatePeriods([{ opens: '25:00', closes: '26:00' }])).toMatch(/geldige tijd/));
});
