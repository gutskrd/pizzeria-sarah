'use client';

import { useState } from 'react';
import type { ActionResult } from '@/lib/admin/action';
import { useAdminAction } from './use-admin-action';
import { useUnsavedChanges } from './use-unsaved-changes';

type Setter<T> = <K extends keyof T>(key: K, value: T[K]) => void;

/**
 * A card with its own Opslaan button. Tracks unsaved changes, shows Dutch
 * feedback and field errors, and offers to undo unsaved edits.
 */
export function SectionForm<T extends Record<string, unknown>>({
  id,
  title,
  description,
  initial,
  save,
  success = 'Wijzigingen opgeslagen.',
  children,
  extraActions,
  resetAfterSave = false,
}: {
  id?: string;
  title: string;
  description?: React.ReactNode;
  initial: T;
  save: (values: T) => Promise<ActionResult<unknown>>;
  success?: string;
  children: (values: T, set: Setter<T>, errors: Record<string, string>) => React.ReactNode;
  extraActions?: React.ReactNode;
  /** Clear the fields after saving (e.g. password forms). */
  resetAfterSave?: boolean;
}) {
  const [values, setValues] = useState<T>(initial);
  const [base, setBase] = useState<T>(initial);
  const [syncedFrom, setSyncedFrom] = useState(initial);
  const [saving, setSaving] = useState(false);
  const { run, fieldErrors } = useAdminAction();

  // Accept fresh server values after a save/refresh (unless the owner is editing).
  if (initial !== syncedFrom && JSON.stringify(initial) !== JSON.stringify(syncedFrom)) {
    setSyncedFrom(initial);
    if (JSON.stringify(values) === JSON.stringify(base)) setValues(initial);
    setBase(initial);
  }

  const dirty = JSON.stringify(values) !== JSON.stringify(base);
  useUnsavedChanges(dirty);

  const set: Setter<T> = (key, value) => setValues((v) => ({ ...v, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const result = await run(() => save(values), { success });
    setSaving(false);
    if (result.ok && resetAfterSave) {
      setValues(initial);
      setBase(initial);
    } else if (result.ok) setBase(values);
  };

  return (
    <form id={id} onSubmit={submit} noValidate className="admin-card scroll-mt-24 p-5 sm:p-6" aria-labelledby={id ? `${id}-titel` : undefined}>
      <h2 id={id ? `${id}-titel` : undefined} className="font-display text-2xl">
        {title}
      </h2>
      {description && <div className="mt-1 text-[0.95rem] text-muted">{description}</div>}
      <div className="mt-5 space-y-5">{children(values, set, fieldErrors)}</div>
      <div className="mt-6 flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-end">
        {extraActions}
        {dirty && (
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setValues(base)}>
            Wijzigingen ongedaan maken
          </button>
        )}
        <button type="submit" className="admin-btn admin-btn-primary" disabled={!dirty || saving}>
          {saving ? 'Bezig met opslaan…' : dirty ? 'Opslaan' : 'Opgeslagen'}
        </button>
      </div>
    </form>
  );
}
