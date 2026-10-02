'use server';

import { z } from 'zod';
import { getSettings } from '@/lib/content/queries';
import { db, schema } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { contactNotificationEmail } from '@/lib/email/templates';
import { verifySigned } from '@/lib/security/crypto';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import { getRequestInfo } from '@/lib/security/request-info';
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

  if (!(await verifyTurnstile(String(formData.get('cf-turnstile-response') ?? '') || null, info.ip))) {
    return { status: 'error', message: 'We konden niet controleren of je een mens bent. Probeer het opnieuw.', values };
  }

  try {
    const [saved] = await db()
      .insert(schema.messages)
      .values({ name: parsed.data.name, email: parsed.data.email, subject: parsed.data.subject, body: parsed.data.message })
      .returning({ id: schema.messages.id });

    const settings = await getSettings();
    if (settings.messageAlerts) {
      await sendEmail({
        to: settings.email,
        replyTo: parsed.data.email,
        ...contactNotificationEmail({ ...parsed.data, body: parsed.data.message, id: saved!.id }),
      }).catch((error) => console.error('[contact] notification failed', error instanceof Error ? error.message : error));
    }
  } catch (error) {
    console.error('[contact] failed to store message', error);
    return { status: 'error', message: 'Je bericht kon niet worden verstuurd. Probeer het later opnieuw, of bel ons.', values };
  }

  return { status: 'success', message: SUCCESS };
}
