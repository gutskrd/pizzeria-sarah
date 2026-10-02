'use server';

import { and, eq, inArray, ne } from 'drizzle-orm';
import { z } from 'zod';
import { adminAction, UserError } from '@/lib/admin/action';
import { db, schema } from '@/lib/db';
import { MESSAGE_STATUSES } from '@/lib/db/schema';
import { sendEmail } from '@/lib/email';
import { replyEmail } from '@/lib/email/templates';
import { formatDateTime } from '@/lib/format';
import { logActivity } from '@/lib/security/events';
import { consumeRateLimit } from '@/lib/security/rate-limit';

const STATUS_MESSAGES = {
  new: 'Gemarkeerd als nieuw.',
  read: 'Gemarkeerd als gelezen.',
  replied: 'Gemarkeerd als beantwoord.',
  archived: 'Bericht gearchiveerd.',
} as const;

export const setMessageStatus = adminAction(z.object({ id: z.uuid(), status: z.enum(MESSAGE_STATUSES) }), async ({ id, status }) => {
  const rows = await db()
    .update(schema.messages)
    .set({ status, ...(status === 'read' ? { readAt: new Date() } : {}) })
    .where(eq(schema.messages.id, id))
    .returning({ id: schema.messages.id });
  if (!rows.length) throw new UserError('Dit bericht bestaat niet meer.');
  return { ok: true, message: STATUS_MESSAGES[status] };
});

export const replyToMessage = adminAction(
  z.object({
    id: z.uuid(),
    body: z.string().trim().min(2, 'Schrijf eerst je antwoord.').max(10000, 'Je antwoord is te lang (maximaal 10.000 tekens).'),
  }),
  async ({ id, body }, ctx) => {
    const limit = await consumeRateLimit(`reply:${ctx.user.id}`, 30, 60 * 60);
    if (!limit.ok) throw new UserError('Je hebt veel berichten achter elkaar verstuurd. Probeer het over een tijdje opnieuw.');
    const [message] = await db().select().from(schema.messages).where(eq(schema.messages.id, id)).limit(1);
    if (!message) throw new UserError('Dit bericht bestaat niet meer.');
    const [settings] = await db().select().from(schema.siteSettings).limit(1);
    const mail = replyEmail({
      businessName: settings?.businessName ?? 'Pizzeria Sarah',
      customerName: message.name,
      originalSubject: message.subject,
      originalBody: message.body,
      reply: body,
      sentAt: formatDateTime(message.createdAt),
    });
    try {
      await sendEmail({ to: message.email, replyTo: settings?.email, ...mail });
    } catch (error) {
      console.error('[reply] e-mail failed', error instanceof Error ? error.message : error);
      throw new UserError('Je antwoord kon niet worden verstuurd. Probeer het later opnieuw, of antwoord vanuit je eigen e-mail.');
    }
    await db().transaction(async (tx) => {
      await tx.insert(schema.messageReplies).values({ messageId: id, userId: ctx.user.id, body });
      await tx
        .update(schema.messages)
        .set({ status: 'replied', repliedAt: new Date(), readAt: message.readAt ?? new Date() })
        .where(eq(schema.messages.id, id));
    });
    await logActivity(ctx.user.id, 'berichten', `Bericht beantwoord: ${message.subject}`);
    return { ok: true, message: 'Je antwoord is verstuurd.' };
  },
);

export const deleteMessage = adminAction(z.object({ id: z.uuid() }), async ({ id }, ctx) => {
  const [row] = await db().delete(schema.messages).where(eq(schema.messages.id, id)).returning({ subject: schema.messages.subject });
  if (!row) throw new UserError('Dit bericht bestaat niet meer.');
  await logActivity(ctx.user.id, 'berichten', 'Bericht verwijderd');
  return { ok: true, message: 'Bericht verwijderd.' };
});

export const bulkMessageAction = adminAction(
  z.object({ ids: z.array(z.uuid()).min(1).max(500), action: z.enum(['read', 'new', 'archived', 'delete']) }),
  async ({ ids, action }, ctx) => {
    if (action === 'delete') {
      const rows = await db().delete(schema.messages).where(inArray(schema.messages.id, ids)).returning({ id: schema.messages.id });
      await logActivity(ctx.user.id, 'berichten', rows.length === 1 ? 'Bericht verwijderd' : `${rows.length} berichten verwijderd`);
      return { ok: true, message: rows.length === 1 ? 'Bericht verwijderd.' : `${rows.length} berichten verwijderd.` };
    }
    const rows = await db()
      .update(schema.messages)
      .set({ status: action, ...(action === 'read' ? { readAt: new Date() } : {}) })
      .where(and(inArray(schema.messages.id, ids), action === 'read' ? eq(schema.messages.status, 'new') : ne(schema.messages.status, action)))
      .returning({ id: schema.messages.id });
    const n = rows.length;
    const word = n === 1 ? 'bericht' : 'berichten';
    const message =
      action === 'read' ? `${n} ${word} gemarkeerd als gelezen.` : action === 'new' ? `${n} ${word} gemarkeerd als ongelezen.` : `${n} ${word} gearchiveerd.`;
    return { ok: true, message };
  },
);

export const markAllMessagesRead = adminAction(z.object({}), async () => {
  const rows = await db()
    .update(schema.messages)
    .set({ status: 'read', readAt: new Date() })
    .where(eq(schema.messages.status, 'new'))
    .returning({ id: schema.messages.id });
  return {
    ok: true,
    message: rows.length ? `${rows.length} ${rows.length === 1 ? 'bericht' : 'berichten'} gemarkeerd als gelezen.` : 'Er waren geen ongelezen berichten.',
  };
});
