'use client';

import { useState } from 'react';
import { deleteMenuItem, saveMenuItem } from '@/app/admin/(panel)/menukaart/actions';
import { useConfirm } from '@/components/admin/confirm';
import { Dialog } from '@/components/admin/dialog';
import { Field, Toggle } from '@/components/admin/fields';
import { ImagePicker, type PickedImage } from '@/components/admin/photos/image-picker';
import { useAdminAction } from '@/components/admin/use-admin-action';
import { PlusIcon, TrashIcon } from '@/components/ui/icons';
import type { AdminMenuCategory, AdminMenuItem } from '@/lib/admin/types';
import { centsToInput } from '@/lib/format';

type Values = {
  categoryId: string;
  number: string;
  name: string;
  description: string;
  price: string;
  variants: Array<{ label: string; price: string }>;
  allergens: string;
  image: PickedImage;
  isVisible: boolean;
  isFeatured: boolean;
};

const fromItem = (item: AdminMenuItem | null, categoryId: string): Values => ({
  categoryId: item?.categoryId ?? categoryId,
  number: item?.number ?? '',
  name: item?.name ?? '',
  description: item?.description ?? '',
  price: centsToInput(item?.priceCents),
  variants: item?.variants.map((v) => ({ label: v.label, price: centsToInput(v.priceCents) })) ?? [],
  allergens: item?.allergens ?? '',
  image: item?.image ?? null,
  isVisible: item?.isVisible ?? true,
  isFeatured: item?.isFeatured ?? false,
});

export function MenuItemDialog({
  open,
  item,
  categoryId,
  categories,
  onClose,
}: {
  open: boolean;
  item: AdminMenuItem | null;
  categoryId: string;
  categories: AdminMenuCategory[];
  onClose: () => void;
}) {
  if (!open) return null;
  return <Inner key={item?.id ?? `nieuw-${categoryId}`} item={item} categoryId={categoryId} categories={categories} onClose={onClose} />;
}

function Inner({
  item,
  categoryId,
  categories,
  onClose,
}: {
  item: AdminMenuItem | null;
  categoryId: string;
  categories: AdminMenuCategory[];
  onClose: () => void;
}) {
  const initial = fromItem(item, categoryId);
  const [v, setV] = useState<Values>(initial);
  const [saving, setSaving] = useState(false);
  const { run, fieldErrors } = useAdminAction();
  const confirm = useConfirm();
  const set = <K extends keyof Values>(key: K, value: Values[K]) => setV((prev) => ({ ...prev, [key]: value }));
  const dirty = JSON.stringify(v) !== JSON.stringify(initial);

  const close = async () => {
    if (
      dirty &&
      !(await confirm({
        title: 'Wijzigingen niet opgeslagen',
        message: 'Je hebt wijzigingen die nog niet zijn opgeslagen. Toch sluiten?',
        confirmLabel: 'Sluiten zonder opslaan',
        tone: 'danger',
      }))
    )
      return;
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const result = await run(() =>
      saveMenuItem({
        id: item?.id,
        categoryId: v.categoryId,
        number: v.number,
        name: v.name,
        description: v.description,
        price: v.price,
        variants: v.variants,
        allergens: v.allergens,
        imageId: v.image?.id ?? null,
        isVisible: v.isVisible,
        isFeatured: v.isFeatured,
      }),
    );
    setSaving(false);
    if (result.ok) onClose();
  };

  return (
    <Dialog
      open
      onClose={close}
      size="lg"
      title={item ? 'Gerecht bewerken' : 'Gerecht toevoegen'}
      footer={
        <>
          {item && (
            <button
              type="button"
              className="admin-btn admin-btn-danger sm:mr-auto"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Gerecht verwijderen?',
                  message: (
                    <p>
                      <strong>{item.name}</strong> wordt van de menukaart verwijderd.
                    </p>
                  ),
                  confirmLabel: 'Verwijderen',
                  tone: 'danger',
                });
                if (ok && (await run(() => deleteMenuItem({ id: item.id }))).ok) onClose();
              }}
            >
              <TrashIcon size={18} /> Verwijderen
            </button>
          )}
          <button type="button" className="admin-btn admin-btn-secondary" onClick={close}>
            Annuleren
          </button>
          <button type="submit" form="gerecht-form" className="admin-btn admin-btn-primary" disabled={saving}>
            {saving ? 'Bezig met opslaan…' : 'Opslaan'}
          </button>
        </>
      }
    >
      <form id="gerecht-form" onSubmit={submit} className="space-y-5" noValidate>
        <div className="grid gap-5 sm:grid-cols-[1fr_7rem]">
          <Field label="Naam" htmlFor="g-naam" error={fieldErrors.name}>
            <input
              id="g-naam"
              className="admin-input"
              value={v.name}
              maxLength={120}
              required
              aria-invalid={!!fieldErrors.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </Field>
          <Field label="Nummer" htmlFor="g-nummer" optional error={fieldErrors.number}>
            <input id="g-nummer" className="admin-input" value={v.number} maxLength={10} onChange={(e) => set('number', e.target.value)} />
          </Field>
        </div>
        <Field label="Categorie" htmlFor="g-cat" error={fieldErrors.categoryId}>
          <select id="g-cat" className="admin-input" value={v.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Beschrijving" htmlFor="g-beschrijving" optional error={fieldErrors.description} counter={{ value: v.description.length, max: 600 }}>
          <textarea
            id="g-beschrijving"
            className="admin-input"
            rows={3}
            value={v.description}
            maxLength={600}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>

        <div className="rounded-md border border-line p-4">
          <Field label="Prijs" htmlFor="g-prijs" hint="Bijvoorbeeld 12,50. Laat leeg als je hieronder prijzen per formaat invult." error={fieldErrors.price}>
            <div className="relative max-w-[12rem]">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">€</span>
              <input
                id="g-prijs"
                className="admin-input pl-8 tabular-nums"
                inputMode="decimal"
                value={v.price}
                aria-invalid={!!fieldErrors.price}
                onChange={(e) => set('price', e.target.value)}
                placeholder="0,00"
              />
            </div>
          </Field>
          <div className="mt-5">
            <p className="font-semibold">
              Prijzen per formaat <span className="text-sm font-normal text-muted">(optioneel)</span>
            </p>
            <p className="text-sm text-muted">Bijvoorbeeld Klein en Groot, of Los en Met friet.</p>
            {v.variants.length > 0 && (
              <ul className="mt-3 space-y-2">
                {v.variants.map((variant, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <label className="sr-only" htmlFor={`v-label-${i}`}>
                        Naam van prijs {i + 1}
                      </label>
                      <input
                        id={`v-label-${i}`}
                        className="admin-input"
                        placeholder="Klein"
                        maxLength={40}
                        value={variant.label}
                        aria-invalid={!!fieldErrors[`variants.${i}.label`]}
                        onChange={(e) =>
                          set(
                            'variants',
                            v.variants.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                          )
                        }
                      />
                    </div>
                    <div className="relative w-28 shrink-0">
                      <label className="sr-only" htmlFor={`v-prijs-${i}`}>
                        Prijs {i + 1}
                      </label>
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">€</span>
                      <input
                        id={`v-prijs-${i}`}
                        className="admin-input pl-7 tabular-nums"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={variant.price}
                        aria-invalid={!!fieldErrors[`variants.${i}.price`]}
                        onChange={(e) =>
                          set(
                            'variants',
                            v.variants.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)),
                          )
                        }
                      />
                    </div>
                    <button
                      type="button"
                      className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted hover:bg-paper hover:text-tomato-dark"
                      aria-label={`Prijs ${variant.label || i + 1} verwijderen`}
                      onClick={() =>
                        set(
                          'variants',
                          v.variants.filter((_, j) => j !== i),
                        )
                      }
                    >
                      <TrashIcon size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {Object.entries(fieldErrors)
              .filter(([k]) => k.startsWith('variants'))
              .slice(0, 1)
              .map(([k, msg]) => (
                <p key={k} className="mt-1.5 text-sm font-medium text-tomato-dark" role="alert">
                  {msg}
                </p>
              ))}
            {v.variants.length < 8 && (
              <button
                type="button"
                className="admin-btn admin-btn-ghost admin-btn-sm mt-2 -ml-2"
                onClick={() => set('variants', [...v.variants, { label: '', price: '' }])}
              >
                <PlusIcon size={16} /> Prijs per formaat toevoegen
              </button>
            )}
          </div>
        </div>

        <Field
          label="Allergeneninformatie"
          htmlFor="g-allergenen"
          optional
          hint="Vul alleen in wat je zeker weet, bijvoorbeeld: Bevat gluten, melk."
          error={fieldErrors.allergens}
        >
          <textarea id="g-allergenen" className="admin-input" rows={2} maxLength={400} value={v.allergens} onChange={(e) => set('allergens', e.target.value)} />
        </Field>

        <div>
          <p className="mb-2 font-semibold">
            Foto <span className="text-sm font-normal text-muted">(optioneel)</span>
          </p>
          <ImagePicker label="Foto bij dit gerecht" value={v.image} onChange={(img) => set('image', img)} />
        </div>

        <div className="space-y-4 rounded-md bg-paper p-4">
          <Toggle
            checked={v.isVisible}
            onChange={(x) => set('isVisible', x)}
            label="Zichtbaar op de menukaart"
            description="Uitzetten als een gerecht tijdelijk niet leverbaar is."
          />
          <Toggle
            checked={v.isFeatured}
            onChange={(x) => set('isFeatured', x)}
            label="Uitgelicht op de homepage"
            description="Komt in het blok ‘Uit onze menukaart’ op de homepage."
          />
        </div>
      </form>
    </Dialog>
  );
}
