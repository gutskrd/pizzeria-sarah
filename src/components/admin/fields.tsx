'use client';

import { useId } from 'react';

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  optional,
  counter,
}: {
  label: string;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  htmlFor: string;
  optional?: boolean;
  counter?: { value: number; max: number; ideal?: number };
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="font-semibold">
          {label}
          {optional && <span className="ml-1.5 text-sm font-normal text-muted">(optioneel)</span>}
        </label>
        {counter && (
          <span
            className={`shrink-0 text-xs tabular-nums ${counter.value > counter.max ? 'font-semibold text-tomato-dark' : counter.ideal && counter.value > counter.ideal ? 'text-warning' : 'text-muted'}`}
          >
            {counter.value} / {counter.ideal ?? counter.max}
          </span>
        )}
      </div>
      {hint && (
        <p id={`${htmlFor}-hint`} className="-mt-0.5 mb-2 text-sm text-muted">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${htmlFor}-fout`} className="mt-1.5 text-sm font-medium text-tomato-dark" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Accessible on/off switch. */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="font-semibold">
          {label}
        </label>
        {description && (
          <p id={`${id}-d`} className="text-sm text-muted">
            {description}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-d` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-basil' : 'bg-line-strong'}`}
      >
        <span className={`inline-block size-6 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-7' : 'translate-x-1'}`} />
        <span className="sr-only">{checked ? 'Aan' : 'Uit'}</span>
      </button>
    </div>
  );
}

export function FormSection({ title, description, children, id }: { title: string; description?: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="admin-card scroll-mt-24 p-5 sm:p-6" aria-labelledby={id ? `${id}-titel` : undefined}>
      <h2 id={id ? `${id}-titel` : undefined} className="font-display text-2xl">
        {title}
      </h2>
      {description && <p className="mt-1 text-[0.95rem] text-muted">{description}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

export function EmptyState({ icon, title, children }: { icon?: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="admin-card flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-4 inline-flex size-14 items-center justify-center rounded-full bg-paper text-muted">{icon}</div>}
      <p className="font-display text-2xl">{title}</p>
      {children && <div className="mt-2 max-w-md text-muted">{children}</div>}
    </div>
  );
}
