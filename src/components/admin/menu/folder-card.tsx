'use client';

/* eslint-disable @next/next/no-img-element -- admin previews of uploaded sheets */
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { removeFolder, updateFolder } from '@/app/admin/(panel)/menukaart/actions';
import { useConfirm } from '@/components/admin/confirm';
import { Field, Toggle } from '@/components/admin/fields';
import { useToast } from '@/components/admin/toast';
import { uploadWithProgress } from '@/components/admin/upload';
import { useAdminAction } from '@/components/admin/use-admin-action';
import { ExternalIcon, UploadIcon } from '@/components/ui/icons';
import type { AdminFolder } from '@/lib/admin/types';

type Side = 'binnen' | 'buiten';
type Cuts = AdminFolder['cuts'];

// Same limits as the server (src/lib/images/folder.ts).
const MIN_CUT = 0.15;
const MAX_CUT = 0.85;
const MIN_PANEL = 0.15;

const SIDES: Array<{ side: Side; title: string; hint: string }> = [
  { side: 'binnen', title: 'Binnenkant', hint: 'De kant die je ziet als de folder helemaal open ligt.' },
  { side: 'buiten', title: 'Buitenkant', hint: 'De kant met de voorkant. De voorkant (met het logo) staat rechts.' },
];

const pct = (n: number) => `${(n * 100).toFixed(1).replace('.', ',')}%`;
const sameCuts = (a: Cuts, b: Cuts) => (['binnen', 'buiten'] as const).every((s) => Math.abs(a[s][0] - b[s][0]) < 1e-4 && Math.abs(a[s][1] - b[s][1]) < 1e-4);

export function FolderCard({ folder }: { folder: AdminFolder }) {
  const [cuts, setCuts] = useState<Cuts>(folder.cuts);
  const [label, setLabel] = useState(folder.label);
  const [visible, setVisible] = useState(folder.visible);
  const { run, fieldErrors } = useAdminAction();
  const [pending, setPending] = useState(false);
  const confirm = useConfirm();

  const complete = Boolean(folder.sheets.binnen && folder.sheets.buiten);
  const cutsChanged = !sameCuts(cuts, folder.cuts);
  const dirty = cutsChanged || label.trim() !== folder.label || visible !== folder.visible;
  const hasAny = Boolean(folder.sheets.binnen || folder.sheets.buiten);

  const status = !complete
    ? { text: hasAny ? 'Nog niet compleet' : 'Nog geen folder', className: 'bg-warning-soft text-warning' }
    : folder.visible
      ? { text: 'Op de website', className: 'bg-basil-soft text-basil' }
      : { text: 'Verborgen', className: 'bg-paper text-muted' };

  return (
    <section className="admin-card mt-8 p-5 sm:p-6" aria-labelledby="folder-titel">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id="folder-titel" className="font-display text-2xl">
          Folder
        </h2>
        <span className={`admin-badge ${status.className}`}>{status.text}</span>
      </div>
      <p className="mt-1 max-w-3xl text-muted">
        De gedrukte menukaart. Op de homepage en bij Menukaart vouwt hij open als bezoekers erop klikken. Voeg beide kanten van de open folder toe als liggende
        foto of scan, met de drie delen naast elkaar. Controleer daarna of de vouwlijnen goed staan.
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        {SIDES.map(({ side, title, hint }) => (
          <SideEditor
            key={side}
            side={side}
            title={title}
            hint={hint}
            src={folder.sheets[side]}
            cuts={cuts[side]}
            onCuts={(pair) => setCuts((c) => ({ ...c, [side]: pair }))}
          />
        ))}
      </div>

      <div className="mt-8 grid gap-5 border-t border-line pt-6 md:grid-cols-2">
        <Field
          label="Naam of datum van de folder"
          htmlFor="folder-naam"
          optional
          hint="Bijvoorbeeld: november 2025. Staat boven de geopende folder."
          error={fieldErrors.label}
        >
          <input id="folder-naam" className="admin-input" maxLength={60} value={label} onChange={(e) => setLabel(e.target.value)} />
        </Field>
        <div className="md:pt-7">
          <Toggle
            checked={visible}
            onChange={setVisible}
            label="Folder tonen op de website"
            description={complete ? undefined : 'Zodra beide kanten er zijn.'}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          disabled={!dirty || pending}
          onClick={async () => {
            setPending(true);
            await run(() => updateFolder({ label: label.trim(), visible, cuts: cutsChanged ? cuts : undefined }));
            setPending(false);
          }}
        >
          {pending ? (cutsChanged ? 'Folder wordt opnieuw gesneden…' : 'Bezig met opslaan…') : 'Folder opslaan'}
        </button>
        {complete && folder.visible && (
          <a href="/menukaart" target="_blank" rel="noopener" className="admin-btn admin-btn-secondary">
            <ExternalIcon size={18} /> Bekijk op de website
          </a>
        )}
        {cutsChanged && (
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setCuts(folder.cuts)}>
            Vouwlijnen terugzetten
          </button>
        )}
        {hasAny && (
          <button
            type="button"
            className="admin-btn admin-btn-ghost ml-auto"
            onClick={async () => {
              if (
                await confirm({
                  title: 'Folder verwijderen?',
                  message: 'Beide kanten worden verwijderd en de folder verdwijnt van de website. De menukaart zelf blijft staan.',
                  confirmLabel: 'Verwijderen',
                  tone: 'danger',
                })
              )
                await run(() => removeFolder({}));
            }}
          >
            Folder verwijderen
          </button>
        )}
      </div>
      {folder.updatedAt && (
        <p className="mt-3 text-sm text-muted">
          Bijgewerkt op {new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(folder.updatedAt))}
        </p>
      )}
    </section>
  );
}

function SideEditor({
  side,
  title,
  hint,
  src,
  cuts,
  onCuts,
}: {
  side: Side;
  title: string;
  hint: string;
  src: string | null;
  cuts: [number, number];
  onCuts: (pair: [number, number]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const toast = useToast();
  const router = useRouter();

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setProgress(0);
    const form = new FormData();
    form.set('side', side);
    form.set('file', file);
    const res = await uploadWithProgress<null>('/api/admin/menu-folder', form, setProgress);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = '';
    if (res.ok) {
      toast.success(res.message ?? 'Opgeslagen.');
      router.refresh();
    } else {
      toast.error(res.error);
      if (res.loggedOut) router.push(`/admin/inloggen?next=${encodeURIComponent(window.location.pathname)}`);
    }
  };

  const setCut = (index: 0 | 1, value: number) => {
    const next: [number, number] = [...cuts];
    next[index] = value;
    // Keep both lines inside the sheet and at least one panel width apart.
    if (index === 0) next[0] = Math.min(Math.max(value, MIN_CUT), next[1] - MIN_PANEL);
    else next[1] = Math.max(Math.min(value, MAX_CUT), next[0] + MIN_PANEL);
    onCuts([Math.round(next[0] * 1000) / 1000, Math.round(next[1] * 1000) / 1000]);
  };

  const drag = (index: 0 | 1) => (e: React.PointerEvent<HTMLDivElement>) => {
    const frame = frameRef.current;
    if (!frame) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const rect = frame.getBoundingClientRect();
      setCut(index, (ev.clientX - rect.left) / rect.width);
    };
    const target = e.currentTarget;
    const stop = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', stop);
      target.removeEventListener('pointercancel', stop);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', stop);
    target.addEventListener('pointercancel', stop);
  };

  const busy = progress !== null;
  const panels = [cuts[0], cuts[1] - cuts[0], 1 - cuts[1]];
  const names = side === 'buiten' ? ['1', '2', 'Voorkant'] : ['1', '2', '3'];

  return (
    <div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted">{hint}</p>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => upload(e.target.files?.[0])} />

      {src ? (
        <>
          <div ref={frameRef} className="relative mt-3 select-none overflow-hidden rounded-md border border-line bg-char">
            <img src={src} alt={`${title} van de folder`} className="block h-auto w-full" draggable={false} />
            {/* Panel labels */}
            <div className="pointer-events-none absolute inset-x-0 top-2 flex" aria-hidden="true">
              {panels.map((w, i) => (
                <span key={i} style={{ width: `${w * 100}%` }} className="flex justify-center">
                  <span className="rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">{names[i]}</span>
                </span>
              ))}
            </div>
            {/* Fold lines (also adjustable with the sliders below) */}
            {([0, 1] as const).map((i) => (
              <div
                key={i}
                aria-hidden="true"
                onPointerDown={drag(i)}
                className="group absolute inset-y-0 -ml-3 flex w-6 cursor-ew-resize touch-none justify-center"
                style={{ left: `${cuts[i] * 100}%` }}
              >
                <span className="w-0.5 bg-[#ffd400] shadow-[0_0_0_1px_rgba(0,0,0,0.6)]" />
                <span className="absolute top-1/2 size-5 -translate-y-1/2 rounded-full border-2 border-black/60 bg-[#ffd400] transition-transform group-hover:scale-110" />
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {([0, 1] as const).map((i) => (
              <label key={i} className="block text-sm">
                <span className="flex justify-between font-medium">
                  <span>Vouwlijn {i === 0 ? 'links' : 'rechts'}</span>
                  <span className="tabular-nums text-muted">{pct(cuts[i])}</span>
                </span>
                <input
                  type="range"
                  min={MIN_CUT * 100}
                  max={MAX_CUT * 100}
                  step={0.1}
                  value={cuts[i] * 100}
                  onChange={(e) => setCut(i, Number(e.target.value) / 100)}
                  className="mt-1 w-full accent-tomato"
                  aria-label={`${title}: vouwlijn ${i === 0 ? 'links' : 'rechts'}`}
                />
              </label>
            ))}
          </div>
          <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm mt-3" disabled={busy} onClick={() => inputRef.current?.click()}>
            <UploadIcon size={16} /> {busy ? `Bezig… ${Math.round(progress * 100)}%` : 'Andere afbeelding'}
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="mt-3 flex aspect-[1.41] w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-line-strong bg-paper/50 text-muted transition-colors hover:border-ink hover:text-ink"
        >
          <UploadIcon size={26} />
          <span className="font-semibold">{busy ? `Bezig met uploaden… ${Math.round(progress * 100)}%` : `${title} uploaden`}</span>
          <span className="text-sm">JPG, PNG of WebP, liggend</span>
        </button>
      )}
    </div>
  );
}
