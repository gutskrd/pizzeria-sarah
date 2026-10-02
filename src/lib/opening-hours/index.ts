/**
 * Opening-hours engine. Pure functions only, so it runs on the server and in
 * the browser, and is unit-tested. All times are in Europe/Amsterdam.
 */

export const TIME_ZONE = 'Europe/Amsterdam';

export type Period = { opens: string; closes: string }; // 'HH:MM'

export type WeekDay = {
  /** ISO weekday: 1 = maandag … 7 = zondag. */
  weekday: number;
  periods: Period[];
  note: string;
};

export type ScheduleException = {
  startsOn: string; // YYYY-MM-DD
  endsOn: string; // YYYY-MM-DD (inclusive)
  isClosed: boolean;
  label: string;
  periods: Period[];
};

export type Schedule = {
  weekly: WeekDay[];
  exceptions: ScheduleException[];
};

export const WEEKDAY_NAMES = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'] as const;

export function weekdayName(weekday: number): string {
  return WEEKDAY_NAMES[(weekday - 1 + 7) % 7] ?? '';
}

export const capitalize = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

/* ───────────── Date helpers (calendar dates as YYYY-MM-DD strings) ───────────── */

const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export type LocalMoment = { date: string; minutes: number; weekday: number };

/** The current calendar date, minute-of-day and ISO weekday in Amsterdam. */
export function toLocalMoment(instant: Date): LocalMoment {
  const parts = Object.fromEntries(partsFormatter.formatToParts(instant).map((p) => [p.type, p.value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  return { date, minutes, weekday: isoWeekday(date) };
}

function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function addDays(date: string, days: number): string {
  const d = parseDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isoWeekday(date: string): number {
  const day = parseDate(date).getUTCDay(); // 0 = zondag
  return day === 0 ? 7 : day;
}

const longDateFormatter = new Intl.DateTimeFormat('nl-NL', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
const shortDateFormatter = new Intl.DateTimeFormat('nl-NL', { timeZone: 'UTC', day: 'numeric', month: 'long' });
const yearDateFormatter = new Intl.DateTimeFormat('nl-NL', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });

/** "maandag 3 november" */
export function formatLongDate(date: string): string {
  return longDateFormatter.format(parseDate(date));
}

/** "3 november" or "3 november 2027" when not in the given year. */
export function formatShortDate(date: string, currentYear?: string): string {
  const d = parseDate(date);
  return currentYear && date.slice(0, 4) !== currentYear ? yearDateFormatter.format(d) : shortDateFormatter.format(d);
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(':');
  return Number(h) * 60 + Number(m);
}

/** Normalizes '16:00:00' → '16:00'. */
export function normalizeTime(time: string): string {
  return time.slice(0, 5);
}

export function formatPeriods(periods: Period[]): string {
  return periods.map((p) => `${p.opens} – ${p.closes}`).join(' en ');
}

/* ───────────── Resolution ───────────── */

export type DayResolution = {
  date: string;
  weekday: number;
  periods: Period[];
  /** Exception that applies to this date, if any. */
  exception: ScheduleException | null;
  note: string;
};

export function resolveDay(schedule: Schedule, date: string): DayResolution {
  const weekday = isoWeekday(date);
  const exception = schedule.exceptions.find((e) => e.startsOn <= date && date <= e.endsOn) ?? null;
  const regular = schedule.weekly.find((d) => d.weekday === weekday);
  const periods = exception ? (exception.isClosed ? [] : exception.periods) : (regular?.periods ?? []);
  return {
    date,
    weekday,
    periods: [...periods].sort((a, b) => toMinutes(a.opens) - toMinutes(b.opens)),
    exception,
    note: exception ? '' : (regular?.note ?? ''),
  };
}

export type OpeningStatus = {
  isOpenNow: boolean;
  /** Short badge text, e.g. "Nu geopend", "Vandaag gesloten". */
  headline: string;
  /** Supporting sentence, e.g. "Vandaag geopend tot 20:00". */
  detail: string;
  /** Today's hours, e.g. "16:00 – 20:00" or "Gesloten". */
  todayHours: string;
  today: DayResolution;
};

const LOOKAHEAD_DAYS = 90;

function describeNextOpening(schedule: Schedule, from: LocalMoment): string {
  for (let offset = 1; offset <= LOOKAHEAD_DAYS; offset++) {
    const date = addDays(from.date, offset);
    const day = resolveDay(schedule, date);
    const first = day.periods[0];
    if (!first) continue;
    if (offset === 1) return `Morgen geopend vanaf ${first.opens}`;
    if (offset <= 6) return `${capitalize(weekdayName(day.weekday))} weer geopend vanaf ${first.opens}`;
    return `Weer geopend op ${formatLongDate(date)} vanaf ${first.opens}`;
  }
  return 'Bel ons voor de actuele openingstijden';
}

export function computeStatus(schedule: Schedule, instant: Date): OpeningStatus {
  const now = toLocalMoment(instant);
  const today = resolveDay(schedule, now.date);
  const todayHours = today.periods.length ? formatPeriods(today.periods) : 'Gesloten';
  const reason = today.exception ? ` (${today.exception.label})` : '';

  if (today.periods.length === 0) {
    return {
      isOpenNow: false,
      headline: `Vandaag gesloten${reason}`,
      detail: describeNextOpening(schedule, now),
      todayHours,
      today,
    };
  }

  const current = today.periods.find((p) => now.minutes >= toMinutes(p.opens) && now.minutes < toMinutes(p.closes));
  if (current) {
    return {
      isOpenNow: true,
      headline: 'Nu geopend',
      detail: `Vandaag geopend tot ${current.closes}`,
      todayHours,
      today,
    };
  }

  const later = today.periods.find((p) => now.minutes < toMinutes(p.opens));
  if (later) {
    const isFirst = later === today.periods[0];
    return {
      isOpenNow: false,
      headline: isFirst ? 'Vandaag geopend' : 'Nu gesloten',
      detail: isFirst ? `Vandaag geopend van ${later.opens} tot ${later.closes}` : `Vandaag weer geopend vanaf ${later.opens}`,
      todayHours,
      today,
    };
  }

  return {
    isOpenNow: false,
    headline: 'Nu gesloten',
    detail: describeNextOpening(schedule, now),
    todayHours,
    today,
  };
}

/* ───────────── Display helpers ───────────── */

export type WeekRow = { weekday: number; name: string; hours: string; note: string; isToday: boolean };

export function weekRows(schedule: Schedule, instant: Date): WeekRow[] {
  const today = toLocalMoment(instant).weekday;
  return [1, 2, 3, 4, 5, 6, 7].map((weekday) => {
    const day = schedule.weekly.find((d) => d.weekday === weekday);
    const periods = day?.periods ?? [];
    return {
      weekday,
      name: capitalize(weekdayName(weekday)),
      hours: periods.length ? formatPeriods(periods) : 'Gesloten',
      note: day?.note ?? '',
      isToday: weekday === today,
    };
  });
}

export type UpcomingException = { label: string; when: string; hours: string; isClosed: boolean };

/** Exceptions that end today or later and start within `days` days. */
export function upcomingExceptions(schedule: Schedule, instant: Date, days = 45): UpcomingException[] {
  const today = toLocalMoment(instant).date;
  const horizon = addDays(today, days);
  const year = today.slice(0, 4);
  return schedule.exceptions
    .filter((e) => e.endsOn >= today && e.startsOn <= horizon)
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn))
    .map((e) => ({
      label: e.label,
      when: e.startsOn === e.endsOn ? capitalize(formatLongDate(e.startsOn)) : `${formatShortDate(e.startsOn, year)} t/m ${formatShortDate(e.endsOn, year)}`,
      hours: e.isClosed || e.periods.length === 0 ? 'Gesloten' : formatPeriods(e.periods),
      isClosed: e.isClosed || e.periods.length === 0,
    }));
}

/** Compact public summary for structured data (schema.org openingHoursSpecification). */
export function toSchemaOrgHours(schedule: Schedule) {
  const names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return schedule.weekly.flatMap((d) =>
    d.periods.map((p) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${names[d.weekday - 1]}`,
      opens: p.opens,
      closes: p.closes,
    })),
  );
}

/** Validates a set of periods: HH:MM, closes after opens, no overlaps. Returns a Dutch error or null. */
export function validatePeriods(periods: Period[]): string | null {
  const re = /^([01]\d|2[0-3]):[0-5]\d$/;
  for (const p of periods) {
    if (!re.test(p.opens) || !re.test(p.closes)) return 'Vul een geldige tijd in, bijvoorbeeld 16:00.';
    if (toMinutes(p.closes) <= toMinutes(p.opens)) return `De sluitingstijd (${p.closes}) moet na de openingstijd (${p.opens}) liggen.`;
  }
  const sorted = [...periods].sort((a, b) => toMinutes(a.opens) - toMinutes(b.opens));
  for (let i = 1; i < sorted.length; i++) {
    if (toMinutes(sorted[i]!.opens) < toMinutes(sorted[i - 1]!.closes)) return 'Twee tijdvakken op dezelfde dag overlappen elkaar.';
  }
  return null;
}

export type StatusSnapshot = { isOpenNow: boolean; headline: string; detail: string; todayHours: string };

/** Serializable subset of the status, safe to pass from server to client components. */
export function statusSnapshot(schedule: Schedule, at: Date): StatusSnapshot {
  const s = computeStatus(schedule, at);
  return { isOpenNow: s.isOpenNow, headline: s.headline, detail: s.detail, todayHours: s.todayHours };
}

/* ───────────── Live countdown (admin clock) ───────────── */

export type NextChange = {
  /** What happens next: the shop closes, or opens. */
  type: 'closes' | 'opens';
  /** Minutes from now until that moment. */
  minutes: number;
  /** "20:00" */
  time: string;
  /** Calendar date of the change (YYYY-MM-DD). */
  date: string;
};

/** The next opening or closing moment, looking ahead up to 90 days. */
export function nextChange(schedule: Schedule, instant: Date): NextChange | null {
  const now = toLocalMoment(instant);
  for (let offset = 0; offset <= LOOKAHEAD_DAYS; offset++) {
    const date = addDays(now.date, offset);
    const day = resolveDay(schedule, date);
    for (const p of day.periods) {
      const opens = toMinutes(p.opens) + offset * 1440;
      const closes = toMinutes(p.closes) + offset * 1440;
      if (offset === 0 && now.minutes >= toMinutes(p.opens) && now.minutes < toMinutes(p.closes)) {
        return { type: 'closes', minutes: closes - now.minutes, time: p.closes, date };
      }
      if (opens > now.minutes) return { type: 'opens', minutes: opens - now.minutes, time: p.opens, date };
    }
  }
  return null;
}

/** "zo meteen", "over 35 min", "over 1 u 5 min", "over 3 dagen" */
export function formatCountdown(minutes: number): string {
  if (minutes <= 1) return 'zo meteen';
  if (minutes < 60) return `over ${minutes} min`;
  if (minutes < 24 * 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `over ${h} uur` : `over ${h} u ${m} min`;
  }
  const days = Math.round(minutes / 1440);
  return days === 1 ? 'over 1 dag' : `over ${days} dagen`;
}

export type DayPlan = { date: string; weekday: number; periods: Period[]; label: string | null; isToday: boolean };

/** The coming `count` days, including today, with exceptions applied. */
export function upcomingDays(schedule: Schedule, instant: Date, count = 7): DayPlan[] {
  const today = toLocalMoment(instant).date;
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(today, i);
    const day = resolveDay(schedule, date);
    return { date, weekday: day.weekday, periods: day.periods, label: day.exception?.label ?? null, isToday: i === 0 };
  });
}
