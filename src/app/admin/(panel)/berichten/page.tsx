import { and, desc, eq, ilike, ne, or, sql } from 'drizzle-orm';
import Link from 'next/link';
import { EmptyState } from '@/components/admin/fields';
import { MessageList } from '@/components/admin/messages/message-list';
import { PageTitle } from '@/components/admin/page-title';
import { MailIcon } from '@/components/ui/icons';
import { requireAdmin } from '@/lib/auth/current';
import { db, schema } from '@/lib/db';
import { MESSAGE_STATUSES, type MessageStatus } from '@/lib/db/schema';
import { formatShortDateTime, timeAgo } from '@/lib/format';

export const metadata = { title: 'Berichten – Beheer' };

const FILTERS: Array<{ key: 'inbox' | MessageStatus; label: string }> = [
  { key: 'inbox', label: 'Inbox' },
  { key: 'new', label: 'Nieuw' },
  { key: 'read', label: 'Gelezen' },
  { key: 'replied', label: 'Beantwoord' },
  { key: 'archived', label: 'Gearchiveerd' },
];

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ status?: string; zoek?: string }> }) {
  await requireAdmin();
  const { status, zoek } = await searchParams;
  const filter = (MESSAGE_STATUSES as readonly string[]).includes(status ?? '') ? (status as MessageStatus) : 'inbox';
  const query = (zoek ?? '').trim().slice(0, 80);
  const statusWhere = filter === 'inbox' ? ne(schema.messages.status, 'archived') : eq(schema.messages.status, filter);
  const like = `%${escapeLike(query)}%`;
  const where = query
    ? and(
        statusWhere,
        or(ilike(schema.messages.name, like), ilike(schema.messages.email, like), ilike(schema.messages.subject, like), ilike(schema.messages.body, like)),
      )
    : statusWhere;

  const [messages, counts] = await Promise.all([
    db().select().from(schema.messages).where(where).orderBy(desc(schema.messages.createdAt)).limit(300),
    db()
      .select({ status: schema.messages.status, count: sql<number>`count(*)::int` })
      .from(schema.messages)
      .groupBy(schema.messages.status),
  ]);
  const count = (key: 'inbox' | MessageStatus) =>
    key === 'inbox' ? counts.filter((c) => c.status !== 'archived').reduce((n, c) => n + c.count, 0) : (counts.find((c) => c.status === key)?.count ?? 0);
  const unread = count('new');
  const total = counts.reduce((n, c) => n + c.count, 0);
  const now = new Date();

  return (
    <>
      <PageTitle
        title="Berichten"
        description={unread ? `${unread} ${unread === 1 ? 'nieuw bericht' : 'nieuwe berichten'}` : 'Berichten die via het contactformulier binnenkomen.'}
      />
      <nav aria-label="Filter berichten" className="-mx-1 mb-4 overflow-x-auto px-1 pb-1">
        <ul className="flex gap-2">
          {FILTERS.map((f) => {
            const n = count(f.key);
            return (
              <li key={f.key} className="shrink-0">
                <Link
                  href={f.key === 'inbox' ? '/admin/berichten' : `/admin/berichten?status=${f.key}`}
                  aria-current={filter === f.key ? 'page' : undefined}
                  className="group inline-flex min-h-10 items-center gap-2 rounded-full border border-line-strong bg-white px-4 text-[0.95rem] font-medium aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-paper"
                >
                  {f.label}
                  {f.key === 'new' && n > 0 ? (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-tomato px-1.5 text-[0.7rem] font-bold text-white">
                      {n}
                    </span>
                  ) : (
                    <span className="tabular-nums opacity-70">{n}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {total === 0 ? (
        <EmptyState icon={<MailIcon size={28} />} title="Geen berichten">
          <p>Als iemand het contactformulier op de website invult, zie je het bericht hier. Je krijgt ook een e-mail.</p>
        </EmptyState>
      ) : (
        <MessageList
          key={filter}
          unread={unread}
          query={query}
          messages={messages.map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            subject: m.subject,
            body: m.body,
            status: m.status,
            createdAt: m.createdAt.toISOString(),
            ago: timeAgo(m.createdAt, now),
            when: formatShortDateTime(m.createdAt),
          }))}
        />
      )}
    </>
  );
}
