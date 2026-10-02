'use client';

import { useMemo, useState } from 'react';
import { deleteException, saveException, saveWeeklyHours } from '@/app/admin/(panel)/openingstijden/actions';
import { useConfirm } from '@/components/admin/confirm';
import { Dialog } from '@/components/admin/dialog';
import { Field } from '@/components/admin/fields';
import { PageTitle } from '@/components/admin/page-title';
import { useAdminAction } from '@/components/admin/use-admin-action';
import { useUnsavedChanges } from '@/components/admin/use-unsaved-changes';
import { CalendarIcon, EditIcon, PlusIcon, TrashIcon } from '@/components/ui/icons';
import { formatCalendarDate } from '@/lib/format';
import { capitalize, computeStatus, formatPeriods, validatePeriods, weekdayName, type Period, type ScheduleException, type WeekDay } from '@/lib/opening-hours';

export type AdminException = ScheduleException & { id: string };

const DEFAULT_PERIOD: Period = { opens: '16:00', closes: '20:00' };

export function HoursEditor({ weekly, exceptions, today }: { weekly: WeekDay[]; exceptions: AdminException[]; today: string }) {
  const [days, setDays] = useState<WeekDay[]>(weekly);
  const [syncedFrom, setSyncedFrom] = useState(weekly);
  const [saving, setSaving] = useState(false);
  const [exceptionDialog, setExceptionDialog] = useState<{ exception: AdminException | null } | null>(null);
  const { run } = useAdminAction();
  const confirm = useConfirm();

  if (weekly !== syncedFrom) {
    setSyncedFrom(weekly);
    setDays(weekly);
  }

  const dirty = JSON.stringify(days) !== JSON.stringify(weekly);
  useUnsavedChanges(dirty);

  const errors = useMemo(() => Object.fromEntries(days.map((d) => [d.weekday, validatePeriods(d.periods)])), [days]);
  const hasErrors = Object.values(errors).some(Boolean);
  const preview = useMemo(() => computeStatus({ weekly: days, exceptions }, new Date()), [days, exceptions]);

  const update = (weekday: number, fn: (d: WeekDay) => WeekDay) => setDays((list) => list.map((d) => (d.weekday === weekday ? fn(d) : d)));

  const copyToOpenDays = (source: WeekDay) =>
    setDays((list) => list.map((d) => (d.weekday !== source.weekday && d.periods.length > 0 ? { ...d, periods: source.periods.map((p) => ({ ...p })) } : d)));

  const save = async () => {
    setSaving(true);
    await run(() => saveWeeklyHours({ days: days.map((d) => ({ weekday: d.weekday, periods: d.periods, note: d.note })) }), {
      success: 'Openingstijden bijgewerkt.',
    });
    setSaving(false);
  };

  const current = exceptions.filter((e) => e.endsOn >= today).sort((a, b) => a.startsOn.localeCompare(b.startsOn));

  return (
    <>
      <PageTitle title="Openingstijden" description="Pas de vaste openingstijden aan, of voeg feestdagen, vakanties en andere afwijkingen toe." />

      <div className="mb-6 rounded-lg border border-line bg-white p-4" aria-live="polite">
        <p className="text-sm font-semibold uppercase tracking-wider text-muted">Zo staat het nu op de website</p>
        <p className="mt-1 text-lg">
          <span className={`font-semibold ${preview.isOpenNow ? 'text-basil' : 'text-tomato-dark'}`}>{preview.headline}</span>
          <span className="text-muted"> · {preview.detail}</span>
        </p>
        {dirty && <p className="mt-1 text-sm text-warning">Dit voorbeeld toont je wijzigingen. Vergeet niet op te slaan.</p>}
      </div>

      <section className="admin-card" aria-labelledby="vaste-tijden">
        <div className="border-b border-line px-5 py-4">
          <h2 id="vaste-tijden" className="font-display text-2xl">
            Vaste openingstijden
          </h2>
        </div>
        <ul className="divide-y divide-line">
          {days.map((day) => {
            const open = day.periods.length > 0;
            const name = capitalize(weekdayName(day.weekday));
            return (
              <li key={day.weekday} className="px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="w-28 font-semibold">{name}</h3>
                  <div role="radiogroup" aria-label={`${name}: open of gesloten`} className="inline-flex rounded-md border border-line-strong p-0.5">
                    {[
                      { value: true, label: 'Open' },
                      { value: false, label: 'Gesloten' },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        role="radio"
                        aria-checked={open === opt.value}
                        onClick={() =>
                          update(day.weekday, (d) => ({ ...d, periods: opt.value ? (d.periods.length ? d.periods : [{ ...DEFAULT_PERIOD }]) : [] }))
                        }
                        className="min-h-10 rounded-[5px] px-4 text-[0.95rem] font-semibold text-ink-soft aria-checked:bg-ink aria-checked:text-paper"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {open && (
                  <div className="mt-3 space-y-2 sm:pl-28">
                    {day.periods.map((p, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-2">
                        <label className="sr-only" htmlFor={`open-${day.weekday}-${i}`}>
                          {name} open vanaf
                        </label>
                        <input
                          id={`open-${day.weekday}-${i}`}
                          type="time"
                          step={300}
                          className="admin-input w-32 tabular-nums"
                          value={p.opens}
                          onChange={(e) =>
                            update(day.weekday, (d) => ({ ...d, periods: d.periods.map((x, j) => (j === i ? { ...x, opens: e.target.value } : x)) }))
                          }
                        />
                        <span className="text-muted" aria-hidden="true">
                          tot
                        </span>
                        <label className="sr-only" htmlFor={`dicht-${day.weekday}-${i}`}>
                          {name} open tot
                        </label>
                        <input
                          id={`dicht-${day.weekday}-${i}`}
                          type="time"
                          step={300}
                          className="admin-input w-32 tabular-nums"
                          value={p.closes}
                          onChange={(e) =>
                            update(day.weekday, (d) => ({ ...d, periods: d.periods.map((x, j) => (j === i ? { ...x, closes: e.target.value } : x)) }))
                          }
                        />
                        {day.periods.length > 1 && (
                          <button
                            type="button"
                            className="inline-flex size-11 items-center justify-center rounded-md text-muted hover:bg-paper hover:text-tomato-dark"
                            aria-label={`Tijdvak ${i + 1} van ${name} verwijderen`}
                            onClick={() => update(day.weekday, (d) => ({ ...d, periods: d.periods.filter((_, j) => j !== i) }))}
                          >
                            <TrashIcon size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                    {errors[day.weekday] && (
                      <p className="text-sm font-medium text-tomato-dark" role="alert">
                        {errors[day.weekday]}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-2">
                      {day.periods.length < 4 && (
                        <button
                          type="button"
                          className="admin-btn admin-btn-ghost admin-btn-sm -ml-2"
                          onClick={() =>
                            update(day.weekday, (d) => ({ ...d, periods: [...d.periods, { opens: d.periods.at(-1)?.closes ?? '17:00', closes: '22:00' }] }))
                          }
                        >
                          <PlusIcon size={16} /> Extra tijdvak
                        </button>
                      )}
                      <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => copyToOpenDays(day)}>
                        Zelfde tijden voor alle open dagen
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-3 sm:pl-28">
                  <label htmlFor={`notitie-${day.weekday}`} className="sr-only">
                    Opmerking bij {name}
                  </label>
                  <input
                    id={`notitie-${day.weekday}`}
                    className="admin-input text-[0.95rem]"
                    placeholder="Opmerking (optioneel), bijvoorbeeld: Gesloten, behalve op feestdagen"
                    maxLength={120}
                    value={day.note}
                    onChange={(e) => update(day.weekday, (d) => ({ ...d, note: e.target.value }))}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex justify-end border-t border-line px-5 py-3">
          <button type="button" className="admin-btn admin-btn-primary" disabled={!dirty || saving || hasErrors} onClick={save}>
            {saving ? 'Bezig met opslaan…' : 'Openingstijden opslaan'}
          </button>
        </div>
      </section>

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur lg:left-64">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
            <p className="text-[0.95rem] font-medium">Je hebt wijzigingen die nog niet zijn opgeslagen.</p>
            <div className="flex gap-2">
              <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setDays(weekly)}>
                Annuleren
              </button>
              <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" disabled={saving || hasErrors} onClick={save}>
                {saving ? 'Bezig…' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="admin-card mt-8" aria-labelledby="afwijkingen">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 id="afwijkingen" className="font-display text-2xl">
              Feestdagen en afwijkingen
            </h2>
            <p className="text-[0.95rem] text-muted">Voor vakanties, tijdelijke sluiting of andere tijden op een speciale dag.</p>
          </div>
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => setExceptionDialog({ exception: null })}>
            <PlusIcon size={18} /> Afwijking toevoegen
          </button>
        </div>
        {current.length === 0 ? (
          <p className="px-5 py-6 text-muted">Er zijn geen afwijkingen gepland. De vaste openingstijden gelden.</p>
        ) : (
          <ul className="divide-y divide-line">
            {current.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <CalendarIcon className="shrink-0 text-muted" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{e.label}</p>
                  <p className="text-[0.95rem] text-ink-soft">
                    {e.startsOn === e.endsOn ? formatCalendarDate(e.startsOn) : `${formatCalendarDate(e.startsOn)} t/m ${formatCalendarDate(e.endsOn)}`} ·{' '}
                    <span className={e.isClosed ? 'font-medium text-tomato-dark' : 'font-medium text-basil'}>
                      {e.isClosed ? 'Gesloten' : `Open ${formatPeriods(e.periods)}`}
                    </span>
                  </p>
                </div>
                {e.startsOn <= today && <span className="admin-badge bg-warning-soft text-warning">Nu van kracht</span>}
                <div className="flex">
                  <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setExceptionDialog({ exception: e })}>
                    <EditIcon size={16} /> Bewerken
                  </button>
                  <button
                    type="button"
                    className="inline-flex size-10 items-center justify-center rounded-md text-muted hover:bg-paper hover:text-tomato-dark"
                    aria-label={`${e.label} verwijderen`}
                    onClick={async () => {
                      if (
                        await confirm({
                          title: 'Afwijking verwijderen?',
                          message: `‘${e.label}’ wordt verwijderd. Op die dagen gelden weer de vaste openingstijden.`,
                          confirmLabel: 'Verwijderen',
                          tone: 'danger',
                        })
                      )
                        await run(() => deleteException({ id: e.id }));
                    }}
                  >
                    <TrashIcon size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {exceptionDialog && <ExceptionDialog exception={exceptionDialog.exception} today={today} onClose={() => setExceptionDialog(null)} />}
    </>
  );
}

const LABEL_SUGGESTIONS = ['Feestdag', 'Vakantie', 'Tijdelijk gesloten', 'Aangepaste openingstijden'];

function ExceptionDialog({ exception, today, onClose }: { exception: AdminException | null; today: string; onClose: () => void }) {
  const [isClosed, setClosed] = useState(exception?.isClosed ?? true);
  const [label, setLabel] = useState(exception?.label ?? '');
  const [startsOn, setStartsOn] = useState(exception?.startsOn ?? today);
  const [endsOn, setEndsOn] = useState(exception?.endsOn ?? today);
  const [multiDay, setMultiDay] = useState(exception ? exception.startsOn !== exception.endsOn : false);
  const [periods, setPeriods] = useState<Period[]>(exception?.periods.length ? exception.periods : [{ ...DEFAULT_PERIOD }]);
  const [saving, setSaving] = useState(false);
  const { run, fieldErrors } = useAdminAction();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const result = await run(() =>
      saveException({ id: exception?.id, startsOn, endsOn: multiDay ? endsOn : startsOn, isClosed, label, periods: isClosed ? [] : periods }),
    );
    setSaving(false);
    if (result.ok) onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={exception ? 'Afwijking bewerken' : 'Afwijking toevoegen'}
      footer={
        <>
          <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>
            Annuleren
          </button>
          <button type="submit" form="afwijking-form" className="admin-btn admin-btn-primary" disabled={saving}>
            {saving ? 'Bezig met opslaan…' : 'Opslaan'}
          </button>
        </>
      }
    >
      <form id="afwijking-form" onSubmit={submit} className="space-y-5" noValidate>
        <fieldset>
          <legend className="mb-2 font-semibold">Wat is er anders?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { value: true, title: 'Gesloten', text: 'Bijvoorbeeld een feestdag of vakantie' },
              { value: false, title: 'Andere openingstijden', text: 'Bijvoorbeeld open op een feestdag' },
            ].map((opt) => (
              <label
                key={opt.title}
                className={`flex cursor-pointer gap-3 rounded-md border p-3 ${isClosed === opt.value ? 'border-ink bg-paper' : 'border-line-strong'}`}
              >
                <input type="radio" name="soort" className="mt-1 size-5 accent-tomato" checked={isClosed === opt.value} onChange={() => setClosed(opt.value)} />
                <span>
                  <span className="block font-semibold">{opt.title}</span>
                  <span className="block text-sm text-muted">{opt.text}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Omschrijving" htmlFor="a-label" hint="Dit zien bezoekers op de website." error={fieldErrors.label}>
          <input
            id="a-label"
            className="admin-input"
            value={label}
            maxLength={80}
            onChange={(e) => setLabel(e.target.value)}
            aria-invalid={!!fieldErrors.label}
            placeholder="Bijvoorbeeld: Tweede Kerstdag"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {LABEL_SUGGESTIONS.map((s) => (
              <button key={s} type="button" className="rounded-full border border-line-strong px-3 py-1.5 text-sm hover:border-ink" onClick={() => setLabel(s)}>
                {s}
              </button>
            ))}
          </div>
        </Field>

        <div>
          <label className="mb-3 flex min-h-11 cursor-pointer items-center gap-3">
            <input type="checkbox" className="size-5 accent-tomato" checked={multiDay} onChange={(e) => setMultiDay(e.target.checked)} />
            <span className="font-semibold">Meerdere dagen achter elkaar</span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={multiDay ? 'Van' : 'Datum'} htmlFor="a-van" error={fieldErrors.startsOn}>
              <input id="a-van" type="date" className="admin-input" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
            </Field>
            {multiDay && (
              <Field label="Tot en met" htmlFor="a-tot" error={fieldErrors.endsOn}>
                <input id="a-tot" type="date" className="admin-input" min={startsOn} value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
              </Field>
            )}
          </div>
        </div>

        {!isClosed && (
          <div>
            <p className="mb-2 font-semibold">Openingstijden op deze {multiDay ? 'dagen' : 'dag'}</p>
            <div className="space-y-2">
              {periods.map((p, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor={`a-open-${i}`}>
                    Open vanaf
                  </label>
                  <input
                    id={`a-open-${i}`}
                    type="time"
                    step={300}
                    className="admin-input w-32"
                    value={p.opens}
                    onChange={(e) => setPeriods(periods.map((x, j) => (j === i ? { ...x, opens: e.target.value } : x)))}
                  />
                  <span className="text-muted">tot</span>
                  <label className="sr-only" htmlFor={`a-dicht-${i}`}>
                    Open tot
                  </label>
                  <input
                    id={`a-dicht-${i}`}
                    type="time"
                    step={300}
                    className="admin-input w-32"
                    value={p.closes}
                    onChange={(e) => setPeriods(periods.map((x, j) => (j === i ? { ...x, closes: e.target.value } : x)))}
                  />
                  {periods.length > 1 && (
                    <button
                      type="button"
                      className="inline-flex size-11 items-center justify-center rounded-md text-muted hover:bg-paper"
                      aria-label={`Tijdvak ${i + 1} verwijderen`}
                      onClick={() => setPeriods(periods.filter((_, j) => j !== i))}
                    >
                      <TrashIcon size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {fieldErrors.periods && (
              <p className="mt-1.5 text-sm font-medium text-tomato-dark" role="alert">
                {fieldErrors.periods}
              </p>
            )}
            {periods.length < 4 && (
              <button
                type="button"
                className="admin-btn admin-btn-ghost admin-btn-sm mt-2 -ml-2"
                onClick={() => setPeriods([...periods, { opens: periods.at(-1)?.closes ?? '17:00', closes: '22:00' }])}
              >
                <PlusIcon size={16} /> Extra tijdvak
              </button>
            )}
          </div>
        )}
      </form>
    </Dialog>
  );
}
