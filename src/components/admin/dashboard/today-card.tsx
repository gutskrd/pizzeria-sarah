'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { closeToday, reopenToday } from '@/app/admin/(panel)/openingstijden/actions';
import { Dialog } from '@/components/admin/dialog';
import { Field } from '@/components/admin/fields';
import { formatClock, liveOpenState, useNowMinute } from '@/components/admin/shell/clock';
import { useAdminAction } from '@/components/admin/use-admin-action';
import { ArrowRightIcon, DoorIcon, UndoIcon } from '@/components/ui/icons';
import { capitalize, resolveDay, toLocalMoment, toMinutes, type Schedule } from '@/lib/opening-hours';

const REASONS = ['Tijdelijk gesloten', 'Onverwacht gesloten', 'Vakantie', 'Feestdag'];

/** Today's status: live clock, open/closed with countdown, a timeline of the day and a one-tap closure. */
export function TodayCard({ schedule, quickCloseId, todayLabel }: { schedule: Schedule; quickCloseId: string | null; todayLabel: string | null }) {
  const now = useNowMinute();
  const search = useSearchParams();
  const router = useRouter();
  const { run } = useAdminAction();
  const [dialog, setDialog] = useState(false);
  const [reason, setReason] = useState(REASONS[0]!);
  const [busy, setBusy] = useState(false);

  // Opened from the command palette: /admin?vandaag=sluiten
  useEffect(() => {
    if (search.get('vandaag') === 'sluiten') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDialog(true);
      window.history.replaceState(null, '', '/admin');
    }
  }, [search]);

  const instant = now === null ? null : new Date(now);
  const local = instant ? toLocalMoment(instant) : null;
  const day = local ? resolveDay(schedule, local.date) : null;
  const open = now === null ? null : liveOpenState(schedule, now);
  const clock = now === null ? null : formatClock(now);

  // Timeline window: a little before opening until a little after closing.
  const periods = day?.periods ?? [];
  const first = periods.length ? Math.min(...periods.map((p) => toMinutes(p.opens))) : 10 * 60;
  const last = periods.length ? Math.max(...periods.map((p) => toMinutes(p.closes))) : 22 * 60;
  const start = Math.max(0, Math.floor((first - 120) / 120) * 120);
  const end = Math.min(24 * 60, Math.ceil((last + 120) / 120) * 120);
  const span = end - start;
  const pct = (m: number) => `${((Math.min(Math.max(m, start), end) - start) / span) * 100}%`;
  const ticks = Array.from({ length: Math.floor(span / 120) + 1 }, (_, i) => start + i * 120);
  const nowMinutes = local?.minutes ?? null;
  const canQuickClose = periods.length > 0 && !day?.exception;

  return (
    <section aria-labelledby="vandaag-titel" className="on-dark relative overflow-hidden rounded-2xl bg-char p-5 text-paper sm:p-7">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[radial-gradient(circle,rgba(179,48,29,0.45),rgba(29,21,17,0)_70%)]"
      />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="vandaag-titel" className="text-sm font-semibold uppercase tracking-[0.16em] text-[#f0b48a]">
            Vandaag{clock ? ` · ${clock.date}` : ''}
          </h2>
          <p className="mt-3 flex items-center gap-3 font-display text-4xl leading-none sm:text-5xl">
            {open && (
              <span className={`relative inline-flex size-3.5 rounded-full ${open.isOpen ? 'bg-[#4caf50]' : 'bg-[#e57359]'}`}>
                {open.isOpen && <span className="absolute inset-0 animate-ping rounded-full bg-[#4caf50] opacity-60 motion-reduce:hidden" />}
              </span>
            )}
            {open ? open.headline : <span className="skeleton inline-block h-10 w-48 opacity-20" />}
          </p>
          <p className="mt-2 text-lg text-paper/80">{open ? capitalize(open.countdown) : ' '}</p>
        </div>
        {clock && (
          <p className="font-display text-5xl tabular-nums text-paper/90 sm:text-6xl" aria-label={`Het is nu ${clock.hours}:${clock.minutes}`}>
            {clock.hours}
            <span className="clock-colon motion-reduce:animate-none">:</span>
            {clock.minutes}
          </p>
        )}
      </div>

      {/* Day timeline */}
      <div className="relative mt-7" aria-hidden="true">
        <div className="relative h-3 rounded-full bg-white/10">
          {periods.map((p) => (
            <div
              key={p.opens}
              className="absolute inset-y-0 rounded-full bg-[#4caf50]/80"
              style={{ left: pct(toMinutes(p.opens)), right: `calc(100% - ${pct(toMinutes(p.closes))})` }}
            />
          ))}
          {nowMinutes !== null && nowMinutes >= start && nowMinutes <= end && (
            <div
              className="absolute -top-1.5 h-6 w-0.5 -translate-x-1/2 rounded-full bg-white shadow-[0_0_0_3px_rgba(29,21,17,1)]"
              style={{ left: pct(nowMinutes) }}
            />
          )}
        </div>
        <div className="relative mt-2 h-4 text-[0.7rem] tabular-nums text-paper/55">
          {ticks.map((t) => (
            <span key={t} className="absolute -translate-x-1/2" style={{ left: pct(t) }}>
              {String(Math.floor(t / 60)).padStart(2, '0')}:00
            </span>
          ))}
        </div>
      </div>
      <p className="sr-only">Openingstijden vandaag: {periods.length ? periods.map((p) => `${p.opens} tot ${p.closes}`).join(' en ') : 'gesloten'}.</p>

      <div className="relative mt-6 flex flex-wrap items-center gap-2">
        {quickCloseId ? (
          <>
            <p className="mr-2 rounded-full bg-white/10 px-3 py-1.5 text-sm">Vandaag gesloten: {todayLabel}</p>
            <button
              type="button"
              disabled={busy}
              className="btn btn-outline !min-h-11 !px-4 !text-sm"
              onClick={async () => {
                setBusy(true);
                await run(() => reopenToday({ id: quickCloseId }));
                setBusy(false);
              }}
            >
              <UndoIcon size={16} /> Toch open vandaag
            </button>
          </>
        ) : canQuickClose ? (
          <button type="button" className="btn btn-outline !min-h-11 !px-4 !text-sm" onClick={() => setDialog(true)}>
            <DoorIcon size={16} /> Vandaag sluiten
          </button>
        ) : day?.exception ? (
          <p className="rounded-full bg-white/10 px-3 py-1.5 text-sm">Afwijking vandaag: {day.exception.label}</p>
        ) : null}
        <Link href="/admin/openingstijden" className="link-arrow !min-h-11 px-2 text-sm">
          Openingstijden <ArrowRightIcon size={16} />
        </Link>
      </div>

      <Dialog
        open={dialog}
        onClose={() => setDialog(false)}
        size="sm"
        title="Vandaag sluiten?"
        description="Op de website staat dan meteen dat je vandaag gesloten bent. Morgen gelden weer de vaste openingstijden."
        footer={
          <>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setDialog(false)}>
              Annuleren
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const result = await run(() => closeToday({ label: reason }));
                setBusy(false);
                if (result.ok) {
                  setDialog(false);
                  router.refresh();
                }
              }}
            >
              {busy ? 'Bezig…' : 'Vandaag sluiten'}
            </button>
          </>
        }
      >
        <Field label="Wat zien bezoekers?" htmlFor="sluit-reden" hint="Bijvoorbeeld: Vandaag gesloten (Tijdelijk gesloten).">
          <input id="sluit-reden" className="admin-input" value={reason} maxLength={80} onChange={(e) => setReason(e.target.value)} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={reason === r}
                className="rounded-full border border-line-strong px-3 py-1.5 text-sm aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
                onClick={() => setReason(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </Field>
      </Dialog>
    </section>
  );
}
