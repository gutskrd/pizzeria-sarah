'use server';

import { z } from 'zod';
import { and, eq, gt } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { notifyOwnerOfMessage } from '@/lib/messages/notify';
import { keyedHash, verifySigned } from '@/lib/security/crypto';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import { getRequestInfo } from '@/lib/security/request-info';
import { messageFingerprintSource, scoreMessage } from '@/lib/security/spam';
import { verifyTurnstile } from '@/lib/security/turnstile';

export type ContactState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Partial<Record<'name' | 'email' | 'subject' | 'message', string>>;
  values?: { name: string; email: string; subject: string; message: string };
};

// Removes control characters (except newlines/tabs) that have no place in a message.
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();

const contactSchema = z.object({
  name: z.string().transform(clean).pipe(z.string().min(1, 'Vul je naam in.').max(100, 'Je naam is te lang (maximaal 100 tekens).')),
  email: z
    .string()
    .transform((s) => clean(s).toLowerCase())
    .pipe(z.email('Vul een geldig e-mailadres in, bijvoorbeeld naam@voorbeeld.nl.').max(254, 'Dit e-mailadres is te lang.')),
  subject: z.string().transform(clean).pipe(z.string().min(1, 'Vul een onderwerp in.').max(150, 'Het onderwerp is te lang (maximaal 150 tekens).')),
  message: z
    .string()
    .transform(clean)
    .pipe(z.string().min(10, 'Je bericht is wat kort. Schrijf minimaal 10 tekens.').max(5000, 'Je bericht is te lang (maximaal 5000 tekens).')),
});

const SUCCESS = 'Bedankt voor je bericht! We hebben het goed ontvangen en reageren zo snel mogelijk.';

export async function sendContactMessage(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const values = {
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? ''),
    subject: String(formData.get('subject') ?? ''),
    message: String(formData.get('message') ?? ''),
  };

  // Honeypot: real visitors never see or fill this field.
  if (String(formData.get('website') ?? '') !== '') return { status: 'success', message: SUCCESS };

  // Bots submit instantly; people need at least a few seconds to write something.
  const issued = Number(verifySigned(String(formData.get('formToken') ?? '')) ?? 0);
  const age = Date.now() - issued;
  if (!issued) return { status: 'error', message: 'Het formulier is verlopen. Vernieuw de pagina en probeer het opnieuw.', values };
  if (age < 3000) return { status: 'success', message: SUCCESS };
  if (age > 24 * 60 * 60 * 1000) return { status: 'error', message: 'Het formulier is verlopen. Vernieuw de pagina en probeer het opnieuw.', values };

  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: ContactState['fieldErrors'] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<ContactState['fieldErrors']>;
      fieldErrors[key] ??= issue.message;
    }
    return { status: 'error', message: 'Controleer de gemarkeerde velden.', fieldErrors, values };
  }

  const info = await getRequestInfo();
  const short = await consumeRateLimit(`contact:ip:${info.ip ?? 'unknown'}`, 5, 10 * 60);
  const daily = await consumeRateLimit(`contact:day:${info.ip ?? 'unknown'}`, 20, 24 * 60 * 60);
  if (!short.ok || !daily.ok) {
    return { status: 'error', message: 'Je hebt al een paar berichten gestuurd. Probeer het later opnieuw, of bel ons.', values };
  }
  // Also per e-mail address, so changing internet connection does not help a spammer.
  const perAddress = await consumeRateLimit(`contact:email:${parsed.data.email}`, 3, 24 * 60 * 60);
  if (!perAddress.ok) {
    return {
      status: 'error',
      message: 'Je hebt vandaag al een paar berichten gestuurd. We reageren zo snel mogelijk; bel ons gerust als het dringend is.',
      values,
    };
  }

  if (!(await verifyTurnstile(String(formData.get('cf-turnstile-response') ?? '') || null, info.ip, 'contact'))) {
    return { status: 'error', message: 'We konden niet controleren of je een mens bent. Probeer het opnieuw.', values };
  }

  try {
    // The same message twice (double click, page refresh): keep one.
    const fingerprint = keyedHash(messageFingerprintSource(parsed.data.email, parsed.data.message), 'message');
    const [duplicate] = await db()
      .select({ id: schema.messages.id })
      .from(schema.messages)
      .where(and(eq(schema.messages.fingerprint, fingerprint), gt(schema.messages.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))))
      .limit(1);
    if (duplicate) return { status: 'success', message: SUCCESS };

    const verdict = scoreMessage({ ...parsed.data, secondsToSubmit: age / 1000 });
    const reasons = [...verdict.reasons];
    let isSpam = verdict.isSpam;
    // A sudden flood (many messages from many places at once) goes to the spam folder, not to the owner.
    if (!isSpam && !(await consumeRateLimit('contact:global:hour', 30, 60 * 60)).ok) {
      isSpam = true;
      reasons.push('Ongewoon veel berichten tegelijk');
    }

    const [saved] = await db()
      .insert(schema.messages)
      .values({
        name: parsed.data.name,
        email: parsed.data.email,
        subject: parsed.data.subject,
        body: parsed.data.message,
        status: isSpam ? 'spam' : 'new',
        spamScore: Math.min(verdict.score, 100),
        spamReasons: reasons.join('; ').slice(0, 500),
        fingerprint,
      })
      .returning({ id: schema.messages.id });

    if (!isSpam) {
      await notifyOwnerOfMessage({ ...parsed.data, body: parsed.data.message, id: saved!.id }).catch((error) =>
        console.error('[contact] notification failed', error instanceof Error ? error.message : error),
      );
    }
  } catch (error) {
    console.error('[contact] failed to store message', error);
    return { status: 'error', message: 'Je bericht kon niet worden verstuurd. Probeer het later opnieuw, of bel ons.', values };
  }

  return { status: 'success', message: SUCCESS };
}
