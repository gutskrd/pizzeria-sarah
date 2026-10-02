import { asc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { MessageView } from '@/components/admin/messages/message-view';
import { requireAdmin } from '@/lib/auth/current';
import { db, schema } from '@/lib/db';

export const metadata = { title: 'Bericht – Beheer' };

export default async function MessagePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [message] = await db().select().from(schema.messages).where(eq(schema.messages.id, id)).limit(1);
  if (!message) notFound();

  // Opening a new message marks it as read.
  if (message.status === 'new') {
    await db().update(schema.messages).set({ status: 'read', readAt: new Date() }).where(eq(schema.messages.id, id));
    message.status = 'read';
  }
  const [replies, [settings]] = await Promise.all([
    db().select().from(schema.messageReplies).where(eq(schema.messageReplies.messageId, id)).orderBy(asc(schema.messageReplies.createdAt)),
    db().select({ name: schema.siteSettings.businessName }).from(schema.siteSettings).limit(1),
  ]);
  return (
    <MessageView
      message={{ ...message, createdAt: message.createdAt.toISOString() }}
      replies={replies.map((r) => ({ id: r.id, body: r.body, createdAt: r.createdAt.toISOString() }))}
      businessName={settings?.name ?? 'Pizzeria Sarah'}
    />
  );
}
