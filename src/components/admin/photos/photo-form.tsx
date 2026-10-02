'use client';

import { useState } from 'react';
import { updateImageDetails } from '@/app/admin/(panel)/fotos/actions';
import { Field, Toggle } from '@/components/admin/fields';
import { useAdminAction } from '@/components/admin/use-admin-action';
import type { AdminImage } from '@/lib/admin/types';

export type PhotoFormValues = { title: string; altText: string; caption: string; isVisible: boolean; isFeatured: boolean };

export const toFormValues = (img: AdminImage): PhotoFormValues => ({
  title: img.title,
  altText: img.altText,
  caption: img.caption,
  isVisible: img.isVisible,
  isFeatured: img.isFeatured,
});

/** The understandable set of photo details: name, description, caption, visibility, featured. */
export function PhotoFields({
  values,
  onChange,
  errors = {},
}: {
  values: PhotoFormValues;
  onChange: (v: PhotoFormValues) => void;
  errors?: Record<string, string>;
}) {
  const set = <K extends keyof PhotoFormValues>(key: K, value: PhotoFormValues[K]) => onChange({ ...values, [key]: value });
  return (
    <div className="space-y-5">
      <Field label="Naam" htmlFor="foto-naam" optional hint="Alleen voor jezelf, zodat je de foto makkelijk terugvindt." error={errors.title}>
        <input
          id="foto-naam"
          className="admin-input"
          value={values.title}
          maxLength={120}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Bijvoorbeeld: Pizza uit de oven"
        />
      </Field>
      <Field
        label="Wat staat er op de foto?"
        htmlFor="foto-alt"
        hint="Korte beschrijving (alt-tekst). Wordt voorgelezen aan blinde bezoekers en helpt Google."
        error={errors.altText}
        counter={{ value: values.altText.length, max: 300, ideal: 125 }}
      >
        <input
          id="foto-alt"
          className="admin-input"
          value={values.altText}
          maxLength={300}
          aria-invalid={!!errors.altText}
          onChange={(e) => set('altText', e.target.value)}
          placeholder="Bijvoorbeeld: Verse pizza margherita op een houten plank"
        />
      </Field>
      <Field label="Bijschrift" htmlFor="foto-bijschrift" optional hint="Tekst die onder de foto staat in de galerij." error={errors.caption}>
        <input id="foto-bijschrift" className="admin-input" value={values.caption} maxLength={300} onChange={(e) => set('caption', e.target.value)} />
      </Field>
      <div className="space-y-4 rounded-md bg-paper p-4">
        <Toggle
          checked={values.isVisible}
          onChange={(v) => onChange({ ...values, isVisible: v, isFeatured: v ? values.isFeatured : false })}
          label="Zichtbaar in de galerij"
          description="Bezoekers zien deze foto op de pagina Foto's."
        />
        <Toggle
          checked={values.isFeatured}
          disabled={!values.isVisible}
          onChange={(v) => set('isFeatured', v)}
          label="Uitgelicht op de homepage"
          description={values.isVisible ? 'Komt vooraan in de foto-selectie op de homepage.' : 'Maak de foto eerst zichtbaar in de galerij.'}
        />
      </div>
    </div>
  );
}

export function usePhotoSave() {
  const { run, fieldErrors } = useAdminAction();
  const [saving, setSaving] = useState(false);
  const save = async (id: string, values: PhotoFormValues, success = 'Wijzigingen opgeslagen.') => {
    setSaving(true);
    const result = await run(() => updateImageDetails({ id, ...values }), { message: success });
    setSaving(false);
    return result.ok;
  };
  return { save, saving, fieldErrors };
}
