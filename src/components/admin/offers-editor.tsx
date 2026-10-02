'use client';

/* eslint-disable @next/next/no-img-element -- admin thumbnails */
import { useState } from 'react';
import { deleteOffer, saveOffer, setOfferVisible } from '@/app/admin/(panel)/aanbiedingen/actions';
import { useConfirm } from '@/components/admin/confirm';
import { Dialog } from '@/components/admin/dialog';
import { EmptyState, Field, Toggle } from '@/components/admin/fields';
import { PageTitle } from '@/components/admin/page-title';
import { ImagePicker, type PickedImage } from '@/components/admin/photos/image-picker';
import { useAdminAction } from '@/components/admin/use-admin-action';
import { EditIcon, EyeIcon, EyeOffIcon, PlusIcon, TagIcon, TrashIcon } from '@/components/ui/icons';
import { formatCalendarDate } from '@/lib/format';
import { useCleanUrl } from './use-clean-url';

export type AdminOffer = {
  id: string;
  title: string;
  description: string;
  priceText: string;
  image: PickedImage;
  startsOn: string | null;
  endsOn: string | null;
  isVisible: boolean;
};

function status(offer: AdminOffer, today: string): { label: string; className: string } {
  if (!offer.isVisible) return { label: 'Verborgen', className: 'bg-paper text-ink-soft' };
  if (offer.endsOn && offer.endsOn < today) return { label: 'Verlopen', className: 'bg-paper text-muted' };
  if (offer.startsOn && offer.startsOn > today) return { label: 'Gepland', className: 'bg-warning-soft text-warning' };
  return { label: 'Actief op de website', className: 'bg-basil-soft text-basil' };
}

function period(offer: AdminOffer): string {
  if (offer.startsOn && offer.endsOn) return `${formatCalendarDate(offer.startsOn)} t/m ${formatCalendarDate(offer.endsOn)}`;
  if (offer.startsOn) return `Vanaf ${formatCalendarDate(offer.startsOn)}`;
  if (offer.endsOn) return `T/m ${formatCalendarDate(offer.endsOn)}`;
  return 'Geen einddatum';
}

export function OffersEditor({ offers, today, openOffer }: { offers: AdminOffer[]; today: string; openOffer?: string }) {
  const [editing, setEditing] = useState<{ offer: AdminOffer | null } | null>(() => {
    if (openOffer === 'nieuw') return { offer: null };
    const offer = offers.find((o) => o.id === openOffer);
    return offer ? { offer } : null;
  });
  useCleanUrl(['aanbieding']);
  const { run } = useAdminAction();
  const confirm = useConfirm();
  const active = offers.filter((o) => status(o, today).label.startsWith('Actief')).length;

  return (
    <>
      <PageTitle
        title="Aanbiedingen"
        description={
          offers.length
            ? `${active} ${active === 1 ? 'aanbieding staat' : 'aanbiedingen staan'} nu op de website.`
            : 'Actieve aanbiedingen verschijnen op de homepage en de menukaart.'
        }
        actions={
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => setEditing({ offer: null })}>
            <PlusIcon size={18} /> Aanbieding toevoegen
          </button>
        }
      />
      {offers.length === 0 ? (
        <EmptyState icon={<TagIcon size={28} />} title="Nog geen aanbiedingen">
          <p>Heb je een actie? Voeg hem hier toe. Je bepaalt zelf vanaf en tot wanneer hij op de website staat.</p>
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {offers.map((o) => {
            const s = status(o, today);
            return (
              <li key={o.id} className="admin-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                {o.image ? (
                  <img src={o.image.thumbUrl} alt="" className="aspect-[4/3] w-full rounded-md object-cover sm:w-32" />
                ) : (
                  <div className="hidden aspect-[4/3] w-32 items-center justify-center rounded-md bg-paper text-muted sm:flex">
                    <TagIcon size={28} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-xl">{o.title}</h2>
                    <span className={`admin-badge ${s.className}`}>{s.label}</span>
                  </div>
                  {o.priceText && <p className="font-semibold text-tomato">{o.priceText}</p>}
                  <p className="text-sm text-muted">{period(o)}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setEditing({ offer: o })}>
                    <EditIcon size={16} /> Bewerken
                  </button>
                  <button
                    type="button"
                    className="inline-flex size-10 items-center justify-center rounded-md text-muted hover:bg-paper hover:text-ink"
                    aria-label={o.isVisible ? `${o.title} verbergen` : `${o.title} zichtbaar maken`}
                    onClick={() => run(() => setOfferVisible({ id: o.id, isVisible: !o.isVisible }))}
                  >
                    {o.isVisible ? <EyeIcon size={19} /> : <EyeOffIcon size={19} />}
                  </button>
                  <button
                    type="button"
                    className="inline-flex size-10 items-center justify-center rounded-md text-muted hover:bg-paper hover:text-tomato-dark"
                    aria-label={`${o.title} verwijderen`}
                    onClick={async () => {
                      if (
                        await confirm({
                          title: 'Aanbieding verwijderen?',
                          message: `‘${o.title}’ wordt verwijderd.`,
                          confirmLabel: 'Verwijderen',
                          tone: 'danger',
                        })
                      )
                        await run(() => deleteOffer({ id: o.id }));
                    }}
                  >
                    <TrashIcon size={19} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {editing && <OfferDialog offer={editing.offer} onClose={() => setEditing(null)} />}
    </>
  );
}

function OfferDialog({ offer, onClose }: { offer: AdminOffer | null; onClose: () => void }) {
  const [v, setV] = useState({
    title: offer?.title ?? '',
    description: offer?.description ?? '',
    priceText: offer?.priceText ?? '',
    image: offer?.image ?? null,
    startsOn: offer?.startsOn ?? '',
    endsOn: offer?.endsOn ?? '',
    isVisible: offer?.isVisible ?? true,
  });
  const [saving, setSaving] = useState(false);
  const { run, fieldErrors } = useAdminAction();
  const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) => setV((p) => ({ ...p, [k]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const result = await run(() =>
      saveOffer({
        id: offer?.id,
        title: v.title,
        description: v.description,
        priceText: v.priceText,
        imageId: v.image?.id ?? null,
        startsOn: v.startsOn,
        endsOn: v.endsOn,
        isVisible: v.isVisible,
      }),
    );
    setSaving(false);
    if (result.ok) onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={offer ? 'Aanbieding bewerken' : 'Aanbieding toevoegen'}
      footer={
        <>
          <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>
            Annuleren
          </button>
          <button type="submit" form="aanbieding-form" className="admin-btn admin-btn-primary" disabled={saving}>
            {saving ? 'Bezig met opslaan…' : 'Opslaan'}
          </button>
        </>
      }
    >
      <form id="aanbieding-form" onSubmit={submit} className="space-y-5" noValidate>
        <Field label="Titel" htmlFor="o-titel" error={fieldErrors.title}>
          <input
            id="o-titel"
            className="admin-input"
            maxLength={120}
            value={v.title}
            onChange={(e) => set('title', e.target.value)}
            aria-invalid={!!fieldErrors.title}
          />
        </Field>
        <Field label="Prijs of korting" htmlFor="o-prijs" optional hint="Bijvoorbeeld: € 10,00 of 2e pizza halve prijs." error={fieldErrors.priceText}>
          <input id="o-prijs" className="admin-input" maxLength={60} value={v.priceText} onChange={(e) => set('priceText', e.target.value)} />
        </Field>
        <Field label="Omschrijving" htmlFor="o-omschrijving" optional error={fieldErrors.description}>
          <textarea
            id="o-omschrijving"
            className="admin-input"
            rows={3}
            maxLength={1000}
            value={v.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vanaf" htmlFor="o-van" optional hint="Leeg = vanaf nu." error={fieldErrors.startsOn}>
            <input id="o-van" type="date" className="admin-input" value={v.startsOn} onChange={(e) => set('startsOn', e.target.value)} />
          </Field>
          <Field label="Tot en met" htmlFor="o-tot" optional hint="Leeg = geen einddatum." error={fieldErrors.endsOn}>
            <input
              id="o-tot"
              type="date"
              className="admin-input"
              min={v.startsOn || undefined}
              value={v.endsOn}
              onChange={(e) => set('endsOn', e.target.value)}
            />
          </Field>
        </div>
        <div>
          <p className="mb-2 font-semibold">
            Foto <span className="text-sm font-normal text-muted">(optioneel)</span>
          </p>
          <ImagePicker label="Foto bij de aanbieding" value={v.image} onChange={(img) => set('image', img)} />
        </div>
        <div className="rounded-md bg-paper p-4">
          <Toggle checked={v.isVisible} onChange={(x) => set('isVisible', x)} label="Zichtbaar op de website" description="Alleen binnen de gekozen periode." />
        </div>
      </form>
    </Dialog>
  );
}
