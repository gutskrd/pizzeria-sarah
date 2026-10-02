import { desc, eq, ne, sql } from 'drizzle-orm';
import Link from 'next/link';
import { EmptyState } from '@/components/admin/fields';
import { StatusBadge } from '@/components/admin/messages/status-badge';
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

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status } = await searchParams;
  const filter = (MESSAGE_STATUSES as readonly string[]).includes(status ?? '') ? (status as MessageStatus) : 'inbox';
  const where = filter === 'inbox' ? ne(schema.messages.status, 'archived') : eq(schema.messages.status, filter);
  const [messages, counts] = await Promise.all([
    db().select().from(schema.messages).where(where).orderBy(desc(schema.messages.createdAt)).limit(200),
    db()
      .select({ status: schema.messages.status, count: sql<number>`count(*)::int` })
      .from(schema.messages)
      .groupBy(schema.messages.status),
  ]);
  const count = (key: 'inbox' | MessageStatus) =>
    key === 'inbox' ? counts.filter((c) => c.status !== 'archived').reduce((n, c) => n + c.count, 0) : (counts.find((c) => c.status === key)?.count ?? 0);
  const unread = count('new');

  return (
    <>
      <PageTitle
        title="Berichten"
        description={unread ? `${unread} ${unread === 1 ? 'nieuw bericht' : 'nieuwe berichten'}` : 'Berichten die via het contactformulier binnenkomen.'}
      />
      <nav aria-label="Filter berichten" className="-mx-1 mb-5 overflow-x-auto px-1">
        <ul className="flex gap-2">
          {FILTERS.map((f) => (
            <li key={f.key} className="shrink-0">
              <Link
                href={f.key === 'inbox' ? '/admin/berichten' : `/admin/berichten?status=${f.key}`}
                aria-current={filter === f.key ? 'page' : undefined}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line-strong bg-white px-4 text-[0.95rem] font-medium aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-paper"
              >
                {f.label} <span className="tabular-nums opacity-70">{count(f.key)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {messages.length === 0 ? (
        <EmptyState icon={<MailIcon size={28} />} title={filter === 'inbox' ? 'Geen berichten' : 'Geen berichten in deze map'}>
          {filter === 'inbox' && <p>Als iemand het contactformulier op de website invult, zie je het bericht hier. Je krijgt ook een e-mail.</p>}
        </EmptyState>
      ) : (
        <ul className="admin-card divide-y divide-line overflow-hidden">
          {messages.map((m) => {
            const isNew = m.status === 'new';
            return (
              <li key={m.id}>
                <Link href={`/admin/berichten/${m.id}`} className={`flex gap-3 px-4 py-3.5 hover:bg-paper/60 sm:px-5 ${isNew ? 'bg-tomato-soft/40' : ''}`}>
                  <span className={`mt-2 size-2.5 shrink-0 rounded-full ${isNew ? 'bg-tomato' : 'bg-transparent'}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className={`truncate ${isNew ? 'font-bold' : 'font-medium'}`}>{m.name}</span>
                      <time dateTime={m.createdAt.toISOString()} title={formatShortDateTime(m.createdAt)} className="shrink-0 text-sm text-muted">
                        {timeAgo(m.createdAt)}
                      </time>
                    </span>
                    <span className={`block truncate ${isNew ? 'font-semibold' : ''}`}>{m.subject}</span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm text-muted">{m.body}</span>
                      <StatusBadge status={m.status} />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
