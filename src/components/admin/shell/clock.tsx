'use client';

import { createContext, useContext, useSyncExternalStore } from 'react';
import { capitalize, computeStatus, formatCountdown, nextChange, weekdayName, type Schedule } from '@/lib/opening-hours';

const listeners = new Set<() => void>();
let timer: number | undefined;

function subscribe(callback: () => void) {
  listeners.add(callback);
  if (timer === undefined) timer = window.setInterval(() => listeners.forEach((l) => l()), 1000);
  return () => {
    listeners.delete(callback);
    if (listeners.size === 0 && timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };
}

/** Time of the server render, so the first paint already shows the clock (no flash, no hydration mismatch). */
export const ServerNowContext = createContext<number | null>(null);

/** The current minute (as a timestamp), updated live. */
export function useNowMinute(): number | null {
  const serverNow = useContext(ServerNowContext);
  return useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / 60_000) * 60_000,
    () => (serverNow === null ? null : Math.floor(serverNow / 60_000) * 60_000),
  );
}

const timeFormat = new Intl.DateTimeFormat('nl-NL', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const dateFormat = new Intl.DateTimeFormat('nl-NL', { timeZone: 'Europe/Amsterdam', weekday: 'long', day: 'numeric', month: 'long' });

export function formatClock(ms: number): { hours: string; minutes: string; date: string } {
  const [hours = '', minutes = ''] = timeFormat.format(ms).split(':');
  return { hours, minutes, date: dateFormat.format(ms) };
}

export type LiveOpenState = { isOpen: boolean; headline: string; countdown: string };

/** "Open · sluit over 1 u 12 min" / "Gesloten · opent morgen om 16:00" */
export function liveOpenState(schedule: Schedule, ms: number): LiveOpenState {
  const now = new Date(ms);
  const status = computeStatus(schedule, now);
  const change = nextChange(schedule, now);
  if (!change) return { isOpen: false, headline: 'Gesloten', countdown: 'geen openingstijden gepland' };
  if (change.type === 'closes') return { isOpen: true, headline: 'Nu open', countdown: `sluit ${formatCountdown(change.minutes)} (${change.time})` };
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam' }).format(now);
  const tomorrow = new Date(`${todayStr}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const when =
    change.date === todayStr
      ? change.minutes <= 180
        ? `opent ${formatCountdown(change.minutes)} (${change.time})`
        : `opent vandaag om ${change.time}`
      : change.date === tomorrow.toISOString().slice(0, 10)
        ? `opent morgen om ${change.time}`
        : `opent ${weekdayName(new Date(`${change.date}T12:00:00Z`).getUTCDay() || 7)} om ${change.time}`;
  return { isOpen: false, headline: status.today.exception ? `Gesloten (${status.today.exception.label})` : 'Nu gesloten', countdown: when };
}

/** Compact live clock + open/closed indicator for the admin top bar. */
export function TopbarClock({ schedule }: { schedule: Schedule }) {
  const now = useNowMinute();
  if (now === null) return <div className="h-10 w-48" aria-hidden="true" />;
  const clock = formatClock(now);
  const open = liveOpenState(schedule, now);
  return (
    <div className="flex items-center gap-3" aria-live="off">
      <div className="text-right leading-tight">
        <p className="font-display text-xl tabular-nums" aria-label={`Het is ${clock.hours}:${clock.minutes}`}>
          {clock.hours}
          <span className="clock-colon motion-reduce:animate-none">:</span>
          {clock.minutes}
        </p>
        <p className="text-xs text-muted">{capitalize(clock.date)}</p>
      </div>
      <span className="h-8 w-px bg-line" aria-hidden="true" />
      <div className="leading-tight" title={`${open.headline}, ${open.countdown}`}>
        <p className={`flex items-center gap-1.5 text-sm font-semibold ${open.isOpen ? 'text-basil' : 'text-tomato-dark'}`}>
          <span className={`relative inline-flex size-2 rounded-full ${open.isOpen ? 'bg-[#43a047]' : 'bg-tomato'}`}>
            {open.isOpen && <span className="absolute inset-0 animate-ping rounded-full bg-[#43a047] opacity-60 motion-reduce:hidden" />}
          </span>
          {open.headline}
        </p>
        <p className="max-w-[13rem] truncate text-xs text-muted">{capitalize(open.countdown)}</p>
      </div>
    </div>
  );
}
