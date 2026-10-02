import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env, isProduction } from '@/lib/env';

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export class EmailNotConfiguredError extends Error {}

/**
 * Sends a transactional e-mail through Resend's HTTP API. The API key only
 * lives on the server. In development, e-mails can be written to
 * ./data/outbox instead (EMAIL_DEV_OUTBOX=1); this is disabled in production.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  const cfg = env();

  if (!isProduction() && cfg.EMAIL_DEV_OUTBOX === '1') {
    const dir = path.resolve('data/outbox');
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`);
    await writeFile(file, JSON.stringify(message, null, 2), { mode: 0o600 });
    return;
  }

  if (!cfg.RESEND_API_KEY) {
    throw new EmailNotConfiguredError('RESEND_API_KEY is not configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: cfg.EMAIL_FROM,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(message.replyTo ? { reply_to: message.replyTo } : {}),
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    // Log status only: the response body may echo addresses.
    throw new Error(`E-mail provider responded with HTTP ${response.status}`);
  }
}
