import 'server-only';
import { and, desc, eq, gt, isNull, lt, or, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { contactDigestEmail, contactNotificationEmail } from '@/lib/email/templates';
import { consumeRateLimit } from '@/lib/security/rate-limit';

/**
 * E-mails to the owner about new contact messages, without flooding the inbox:
 * - at most one e-mail per 15 minutes; messages that arrive in between are
 *   bundled into one e-mail when the 15 minutes are over;
 * - at most 20 of these e-mails per day (the admin always shows everything);
 * - spam and double submissions never send an e-mail.
 */
const WINDOW_MS = 15 * 60 * 1000;
const DAILY_CAP = 20;

type Pending = { timer: ReturnType<typeof setTimeout> | null };
const pending = ((globalThis as unknown as { __messageDigest?: Pending }).__messageDigest ??= { timer: null });

/** Takes the e-mail "slot" if the last e-mail was 15+ minutes ago. Atomic, so two messages at once give one e-mail. */
async function claimSlot(): Promise<{ claimed: boolean; previous: Date | null }> {
  const windowStart = new Date(Date.now() - WINDOW_MS);
  const [before] = await db().select({ last: schema.siteSettings.lastMessageAlertAt }).from(schema.siteSettings).where(eq(schema.siteSettings.id, 1));
  const rows = await db()
    .update(schema.siteSettings)
    .set({ lastMessageAlertAt: new Date() })
    .where(and(eq(schema.siteSettings.id, 1), or(isNull(schema.siteSettings.lastMessageAlertAt), lt(schema.siteSettings.lastMessageAlertAt, windowStart))))
    .returning({ id: schema.siteSettings.id });
  return { claimed: rows.length > 0, previous: before?.last ?? null };
}

async function alertsWanted(): Promise<{ to: string } | null> {
  const [row] = await db()
    .select({ email: schema.siteSettings.email, on: schema.siteSettings.messageAlerts })
    .from(schema.siteSettings)
    .where(eq(schema.siteSettings.id, 1));
  return row?.on ? { to: row.email } : null;
}

function scheduleDigest(delayMs: number) {
  if (pending.timer) return;
  pending.timer = setTimeout(
    () => {
      pending.timer = null;
      void sendDigest().catch((error) => console.error('[messages] digest failed', error instanceof Error ? error.message : error));
    },
    Math.max(1000, delayMs),
  );
  pending.timer.unref?.();
}

async function sendDigest() {
  const wanted = await alertsWanted();
  if (!wanted) return;
  const { claimed, previous } = await claimSlot();
  if (!claimed) return;
  const since = previous ?? new Date(0);
  const fresh = await db()
    .select({ id: schema.messages.id, name: schema.messages.name, subject: schema.messages.subject })
    .from(schema.messages)
    .where(and(eq(schema.messages.status, 'new'), gt(schema.messages.createdAt, since)))
    .orderBy(desc(schema.messages.createdAt))
    .limit(10);
  if (!fresh.length) return;
  const [{ total }] = (await db()
    .select({ total: sql<number>`count(*)::int` })
    .from(schema.messages)
    .where(and(eq(schema.messages.status, 'new'), gt(schema.messages.createdAt, since)))) as [{ total: number }];
  if (!(await consumeRateLimit('alerts:messages:day', DAILY_CAP, 24 * 60 * 60)).ok) return;
  await sendEmail({ to: wanted.to, ...contactDigestEmail(fresh, total) });
}

export async function notifyOwnerOfMessage(message: { id: string; name: string; email: string; subject: string; body: string }): Promise<void> {
  const wanted = await alertsWanted();
  if (!wanted) return;
  const { claimed, previous } = await claimSlot();
  if (!claimed) {
    // An e-mail went out less than 15 minutes ago: bundle this one into the next e-mail.
    const last = previous?.getTime() ?? Date.now();
    scheduleDigest(last + WINDOW_MS - Date.now() + 1000);
    return;
  }
  if (!(await consumeRateLimit('alerts:messages:day', DAILY_CAP, 24 * 60 * 60)).ok) return;
  const [{ others }] = (await db()
    .select({ others: sql<number>`count(*)::int` })
    .from(schema.messages)
    .where(and(eq(schema.messages.status, 'new'), sql`${schema.messages.id} <> ${message.id}`))) as [{ others: number }];
  await sendEmail({ to: wanted.to, replyTo: message.email, ...contactNotificationEmail({ ...message, othersWaiting: others }) });
}
