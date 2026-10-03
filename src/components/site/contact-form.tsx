'use client';

import Script from 'next/script';
import { useActionState, useEffect, useRef } from 'react';
import { sendContactMessage, type ContactState } from '@/app/(site)/contact/actions';
import { CheckIcon } from '@/components/ui/icons';

const fieldClass =
  'block w-full rounded-sm border bg-cream px-3.5 py-3 text-base text-ink placeholder:text-muted/80 focus:outline-none focus:ring-2 focus:ring-tomato/40 aria-[invalid=true]:border-tomato border-line-strong';

export function ContactForm({ formToken, turnstileSiteKey, nonce }: { formToken: string; turnstileSiteKey: string; nonce?: string }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContactMessage, { status: 'idle' });
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status !== 'idle') statusRef.current?.focus();
  }, [state]);

  if (state.status === 'success') {
    return (
      <div ref={statusRef} tabIndex={-1} role="status" className="rounded-md border border-basil/30 bg-basil-soft p-6 outline-none">
        <p className="flex items-center gap-2 font-display text-2xl text-basil">
          <CheckIcon size={26} /> Bericht verstuurd
        </p>
        <p className="mt-2 text-ink-soft">{state.message}</p>
      </div>
    );
  }

  const v = state.values;
  const err = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="space-y-5">
      {state.status === 'error' && (
        <div ref={statusRef} tabIndex={-1} role="alert" className="rounded-sm border border-tomato/40 bg-tomato-soft px-4 py-3 text-tomato-dark outline-none">
          {state.message}
        </div>
      )}
      <input type="hidden" name="formToken" value={formToken} />
      {/* Honeypot: hidden from people, tempting for bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Laat dit veld leeg
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="naam" label="Naam" error={err.name}>
          <input
            id="naam"
            name="name"
            type="text"
            autoComplete="name"
            required
            maxLength={100}
            defaultValue={v?.name}
            aria-invalid={!!err.name}
            aria-describedby={err.name ? 'naam-fout' : undefined}
            className={fieldClass}
          />
        </Field>
        <Field id="email" label="E-mailadres" error={err.email}>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            maxLength={254}
            defaultValue={v?.email}
            aria-invalid={!!err.email}
            aria-describedby={err.email ? 'email-fout' : undefined}
            className={fieldClass}
          />
        </Field>
      </div>
      <Field id="onderwerp" label="Onderwerp" error={err.subject}>
        <input
          id="onderwerp"
          name="subject"
          type="text"
          required
          maxLength={150}
          defaultValue={v?.subject}
          aria-invalid={!!err.subject}
          aria-describedby={err.subject ? 'onderwerp-fout' : undefined}
          className={fieldClass}
        />
      </Field>
      <Field id="bericht" label="Bericht" error={err.message}>
        <textarea
          id="bericht"
          name="message"
          rows={6}
          required
          maxLength={5000}
          defaultValue={v?.message}
          aria-invalid={!!err.message}
          aria-describedby={err.message ? 'bericht-fout' : undefined}
          className={`${fieldClass} min-h-40 resize-y`}
        />
      </Field>

      {turnstileSiteKey && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" nonce={nonce} />
          <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-action="contact" data-language="nl" data-theme="light" />
        </>
      )}

      <p className="text-sm text-muted">
        We gebruiken je gegevens alleen om je bericht te beantwoorden. Lees meer in onze{' '}
        <a href="/privacy" className="underline underline-offset-2 hover:text-ink">
          privacyverklaring
        </a>
        .
      </p>
      <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
        {pending ? 'Bezig met versturen…' : 'Bericht versturen'}
      </button>
    </form>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-fout`} className="mt-1.5 text-sm font-medium text-tomato-dark">
          {error}
        </p>
      )}
    </div>
  );
}
