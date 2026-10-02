'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { forgotPasswordAction, loginAction, resendCodeAction, resetPasswordAction, verifyCodeAction, type FormState } from '@/app/admin/(auth)/actions';
import { PasswordInput } from './password-input';

function Notice({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.error)
    return (
      <div role="alert" className="mb-5 rounded-md border border-tomato/40 bg-tomato-soft px-4 py-3 text-[0.97rem] text-tomato-dark">
        {state.error}
      </div>
    );
  if (state.message)
    return (
      <div role="status" className="mb-5 rounded-md border border-basil/30 bg-basil-soft px-4 py-3 text-[0.97rem] text-basil">
        {state.message}
      </div>
    );
  return null;
}

export function LoginForm({ next, info }: { next: string; info?: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-5" noValidate>
      <h1 className="font-display text-3xl">Inloggen</h1>
      {info && !state && (
        <div role="status" className="rounded-md border border-basil/30 bg-basil-soft px-4 py-3 text-[0.97rem] text-basil">
          {info}
        </div>
      )}
      <Notice state={state} />
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="mb-1.5 block font-semibold">
          E-mailadres
        </label>
        <input id="email" name="email" type="email" inputMode="email" autoComplete="username" required defaultValue={state?.email} className="admin-input" />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block font-semibold">
          Wachtwoord
        </label>
        <PasswordInput id="password" name="password" autoComplete="current-password" required />
      </div>
      <label className="flex min-h-11 cursor-pointer items-start gap-3">
        <input type="checkbox" name="remember" defaultChecked className="mt-1 size-5 shrink-0 accent-tomato" />
        <span>
          <span className="font-semibold">Dit apparaat onthouden</span>
          <span className="block text-sm text-muted">
            Je blijft ingelogd en hoeft hier geen code meer in te vullen. Niet aanvinken op een gedeelde computer.
          </span>
        </span>
      </label>
      <button type="submit" disabled={pending} className="admin-btn admin-btn-primary w-full">
        {pending ? 'Bezig met inloggen…' : 'Inloggen'}
      </button>
      <p className="text-center">
        <Link href="/admin/wachtwoord-vergeten" className="inline-flex min-h-11 items-center text-[0.97rem] underline underline-offset-2 hover:text-tomato">
          Wachtwoord vergeten?
        </Link>
      </p>
    </form>
  );
}

export function CodeForm({ next, email }: { next: string; email: string }) {
  const [state, action, pending] = useActionState(verifyCodeAction, undefined);
  const [resendState, resend, resending] = useActionState(resendCodeAction, undefined);
  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl">Vul je code in</h1>
      <p className="text-ink-soft">
        We hebben een e-mail met een code van 6 cijfers gestuurd naar <strong className="font-semibold text-ink">{email}</strong>. De code is 10 minuten geldig.
      </p>
      <Notice state={state ?? resendState} />
      <form action={action} className="space-y-5" noValidate>
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="code" className="mb-1.5 block font-semibold">
            Code
          </label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={7}
            required
            autoFocus
            placeholder="123456"
            className="admin-input text-center font-mono text-2xl tracking-[0.4em] placeholder:tracking-[0.4em] placeholder:text-line-strong"
          />
        </div>
        <button type="submit" disabled={pending} className="admin-btn admin-btn-primary w-full">
          {pending ? 'Bezig met controleren…' : 'Bevestigen'}
        </button>
      </form>
      <div className="flex flex-col items-center gap-1 border-t border-line pt-4 text-[0.97rem]">
        <p className="text-muted">Geen e-mail ontvangen? Kijk ook in je map met ongewenste e-mail.</p>
        <form action={resend}>
          <button
            type="submit"
            disabled={resending}
            className="inline-flex min-h-11 items-center font-semibold text-tomato underline underline-offset-2 disabled:opacity-50"
          >
            {resending ? 'Bezig met versturen…' : 'Stuur een nieuwe code'}
          </button>
        </form>
        <Link href="/admin/inloggen" className="inline-flex min-h-11 items-center underline underline-offset-2 hover:text-tomato">
          Opnieuw inloggen
        </Link>
      </div>
    </div>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, undefined);
  return (
    <form action={action} className="space-y-5" noValidate>
      <h1 className="font-display text-3xl">Wachtwoord vergeten</h1>
      <p className="text-ink-soft">Vul het e-mailadres in waarmee je inlogt. Je ontvangt een e-mail met een link om een nieuw wachtwoord te kiezen.</p>
      <Notice state={state} />
      {!state?.message && (
        <>
          <div>
            <label htmlFor="email" className="mb-1.5 block font-semibold">
              E-mailadres
            </label>
            <input id="email" name="email" type="email" inputMode="email" autoComplete="username" required className="admin-input" />
          </div>
          <button type="submit" disabled={pending} className="admin-btn admin-btn-primary w-full">
            {pending ? 'Bezig met versturen…' : 'Stuur link'}
          </button>
        </>
      )}
      <p className="text-center">
        <Link href="/admin/inloggen" className="inline-flex min-h-11 items-center underline underline-offset-2 hover:text-tomato">
          Terug naar inloggen
        </Link>
      </p>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, undefined);
  return (
    <form action={action} className="space-y-5" noValidate>
      <h1 className="font-display text-3xl">Nieuw wachtwoord</h1>
      <p className="text-ink-soft">
        Kies een nieuw wachtwoord van minimaal 10 tekens. Een zin van een paar woorden is makkelijk te onthouden en lastig te raden.
      </p>
      <Notice state={state} />
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="password" className="mb-1.5 block font-semibold">
          Nieuw wachtwoord
        </label>
        <PasswordInput id="password" name="password" autoComplete="new-password" minLength={10} required />
      </div>
      <div>
        <label htmlFor="confirm" className="mb-1.5 block font-semibold">
          Herhaal nieuw wachtwoord
        </label>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" minLength={10} required />
      </div>
      <button type="submit" disabled={pending} className="admin-btn admin-btn-primary w-full">
        {pending ? 'Bezig met opslaan…' : 'Wachtwoord opslaan'}
      </button>
      <p className="text-sm text-muted">Na het opslaan word je op alle apparaten uitgelogd. Log daarna opnieuw in met je nieuwe wachtwoord.</p>
    </form>
  );
}
