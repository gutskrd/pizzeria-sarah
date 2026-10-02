import { and, desc, eq, sql } from 'drizzle-orm';
import Link from 'next/link';
import { EmptyState } from '@/components/admin/fields';
import { PageTitle } from '@/components/admin/page-title';
import { ActivityIcon, ClockIcon, GlobeIcon, ImageIcon, ListIcon, MailIcon, SettingsIcon, ShieldIcon, TagIcon } from '@/components/ui/icons';
import { requireAdmin } from '@/lib/auth/current';
import { db, schema } from '@/lib/db';
import { todayInAmsterdam } from '@/lib/format';
import { addDays, capitalize } from '@/lib/opening-hours';

export const metadata = { title: 'Activiteit – Beheer' };

const AREAS = [
  { key: 'website', label: 'Website', icon: GlobeIcon },
  { key: 'menukaart', label: 'Menukaart', icon: ListIcon },
  { key: 'fotos', label: "Foto's", icon: ImageIcon },
  { key: 'openingstijden', label: 'Openingstijden', icon: ClockIcon },
  { key: 'berichten', label: 'Berichten', icon: MailIcon },
  { key: 'aanbiedingen', label: 'Aanbiedingen', icon: TagIcon },
  { key: 'instellingen', label: 'Instellingen', icon: SettingsIcon },
  { key: 'beveiliging', label: 'Beveiliging', icon: ShieldIcon },
] as const;

const PAGE_SIZE = 50;
const dayFormat = new Intl.DateTimeFormat('nl-NL', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('nl-NL', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit' });
const dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam' });

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ gebied?: string; meer?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const area = AREAS.find((a) => a.key === params.gebied)?.key ?? null;
  const limit = Math.min(1000, PAGE_SIZE * Math.max(1, Number(params.meer ?? 1) || 1));

  const [rows, counts] = await Promise.all([
    db()
      .select({
        id: schema.activityLog.id,
        summary: schema.activityLog.summary,
        area: schema.activityLog.area,
        createdAt: schema.activityLog.createdAt,
        userName: schema.adminUsers.name,
      })
      .from(schema.activityLog)
      .leftJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.activityLog.userId))
      .where(area ? and(eq(schema.activityLog.area, area)) : undefined)
      .orderBy(desc(schema.activityLog.createdAt))
      .limit(limit + 1),
    db()
      .select({ area: schema.activityLog.area, count: sql<number>`count(*)::int` })
      .from(schema.activityLog)
      .groupBy(schema.activityLog.area),
  ]);
  const hasMore = rows.length > limit;
  const visible = rows.slice(0, limit);
  const total = counts.reduce((n, c) => n + c.count, 0);

  const today = todayInAmsterdam();
  const yesterday = addDays(today, -1);
  const groups: Array<{ key: string; label: string; items: typeof visible }> = [];
  for (const row of visible) {
    const key = dateKey.format(row.createdAt);
    const label = key === today ? 'Vandaag' : key === yesterday ? 'Gisteren' : capitalize(dayFormat.format(new Date(`${key}T12:00:00Z`)));
    const last = groups.at(-1);
    if (last && last.key === key) last.items.push(row);
    else groups.push({ key, label, items: [row] });
  }

  const href = (gebied: string | null, meer?: number) => {
    const q = new URLSearchParams();
    if (gebied) q.set('gebied', gebied);
    if (meer && meer > 1) q.set('meer', String(meer));
    const s = q.toString();
    return `/admin/activiteit${s ? `?${s}` : ''}`;
  };

  return (
    <>
      <PageTitle title="Activiteit" description="Alle wijzigingen aan de website, van nieuw naar oud. Wordt 12 maanden bewaard." />
      <nav aria-label="Filter op onderdeel" className="-mx-1 mb-6 overflow-x-auto px-1 pb-1">
        <ul className="flex gap-2">
          <li className="shrink-0">
            <Link
              href={href(null)}
              aria-current={!area ? 'page' : undefined}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line-strong bg-white px-4 text-[0.95rem] font-medium aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-paper"
            >
              Alles <span className="tabular-nums opacity-70">{total}</span>
            </Link>
          </li>
          {AREAS.filter((a) => counts.some((c) => c.area === a.key)).map((a) => (
            <li key={a.key} className="shrink-0">
              <Link
                href={href(a.key)}
                aria-current={area === a.key ? 'page' : undefined}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line-strong bg-white px-4 text-[0.95rem] font-medium aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-paper"
              >
                {a.label} <span className="tabular-nums opacity-70">{counts.find((c) => c.area === a.key)?.count ?? 0}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {groups.length === 0 ? (
        <EmptyState icon={<ActivityIcon size={28} />} title="Nog geen activiteit">
          <p>Zodra je iets aanpast aan de website, zie je het hier terug.</p>
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.key} aria-labelledby={`dag-${g.key}`}>
              <h2
                id={`dag-${g.key}`}
                className="sticky top-16 z-10 mb-2 bg-[#f6f3ee] py-1 text-sm font-semibold uppercase tracking-wider text-muted lg:top-[4.5rem]"
              >
                {g.label}
              </h2>
              <ol className="admin-card divide-y divide-line">
                {g.items.map((item) => {
                  const meta = AREAS.find((a) => a.key === item.area);
                  const Icon = meta?.icon ?? ActivityIcon;
                  return (
                    <li key={item.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                      <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-paper text-ink-soft">
                        <Icon size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block">{item.summary}</span>
                        <span className="text-sm text-muted">
                          {meta?.label ?? 'Website'}
                          {item.userName ? ` · ${item.userName}` : ''}
                        </span>
                      </span>
                      <time dateTime={item.createdAt.toISOString()} className="shrink-0 pt-0.5 text-sm tabular-nums text-muted">
                        {timeFormat.format(item.createdAt)}
                      </time>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          {hasMore && (
            <div className="text-center">
              <Link href={href(area, Number(params.meer ?? 1) + 1)} scroll={false} className="admin-btn admin-btn-secondary">
                Meer laden
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}
