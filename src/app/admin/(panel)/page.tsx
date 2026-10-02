import { desc, eq, isNull, sql } from 'drizzle-orm';
import Link from 'next/link';
import { PageTitle } from '@/components/admin/page-title';
import { AlertIcon, ArrowRightIcon, CheckIcon, ClockIcon, ExternalIcon, ListIcon, MailIcon, PlusIcon } from '@/components/ui/icons';
import { requireAdmin } from '@/lib/auth/current';
import { getSchedule } from '@/lib/content/queries';
import { db, schema } from '@/lib/db';
import { env, isProduction } from '@/lib/env';
import { formatShortDateTime, timeAgo } from '@/lib/format';
import { computeStatus, upcomingExceptions } from '@/lib/opening-hours';

export const metadata = { title: 'Dashboard – Beheer' };

type Check = { tone: 'ok' | 'warn' | 'error'; title: string; detail?: string; href?: string; action?: string };

function greeting(now: Date): string {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', hour: '2-digit', hourCycle: 'h23' }).format(now));
  if (hour < 6) return 'Goedenacht';
  if (hour < 12) return 'Goedemorgen';
  if (hour < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

export default async function DashboardPage() {
  const ctx = await requireAdmin();
  const d = db();
  const now = new Date();
  const [schedule, [settings], [menu], [photos], [unread], recentMessages, activity] = await Promise.all([
    getSchedule(),
    d.select().from(schema.siteSettings).limit(1),
    d
      .select({ items: sql<number>`count(*)::int`, categories: sql<number>`count(distinct ${schema.menuItems.categoryId})::int` })
      .from(schema.menuItems)
      .where(eq(schema.menuItems.isVisible, true)),
    d
      .select({ total: sql<number>`count(*)::int`, visible: sql<number>`count(*) filter (where ${schema.images.isVisible})::int` })
      .from(schema.images)
      .where(isNull(schema.images.deletedAt)),
    d
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.messages)
      .where(eq(schema.messages.status, 'new')),
    d.select().from(schema.messages).orderBy(desc(schema.messages.createdAt)).limit(3),
    d.select().from(schema.activityLog).orderBy(desc(schema.activityLog.createdAt)).limit(8),
  ]);
  const status = computeStatus(schedule, now);
  const exceptions = upcomingExceptions(schedule, now, 21);

  const checks: Check[] = [];
  checks.push({ tone: 'ok', title: 'De website is online', detail: 'Bezoekers kunnen de website gewoon bekijken.' });
  checks.push({
    tone: 'ok',
    title: `${status.headline} · ${status.detail}`,
    detail: `Vandaag: ${status.todayHours}`,
    href: '/admin/openingstijden',
    action: 'Openingstijden',
  });
  for (const e of exceptions.slice(0, 2)) {
    checks.push({
      tone: 'warn',
      title: `Let op: ${e.when} ${e.isClosed ? 'gesloten' : `open ${e.hours}`}`,
      detail: e.label,
      href: '/admin/openingstijden',
      action: 'Bekijken',
    });
  }
  const unreadCount = unread?.count ?? 0;
  checks.push(
    unreadCount > 0
      ? { tone: 'warn', title: `${unreadCount} ${unreadCount === 1 ? 'nieuw bericht' : 'nieuwe berichten'}`, href: '/admin/berichten', action: 'Lezen' }
      : { tone: 'ok', title: 'Geen nieuwe berichten' },
  );
  checks.push(
    (menu?.items ?? 0) > 0
      ? {
          tone: 'ok',
          title: `Menukaart: ${menu!.items} ${menu!.items === 1 ? 'gerecht' : 'gerechten'} zichtbaar`,
          href: '/admin/menukaart',
          action: 'Aanpassen',
        }
      : {
          tone: 'warn',
          title: 'De menukaart is nog leeg',
          detail: 'Voeg je categorieën en gerechten toe, of upload de menukaart als PDF.',
          href: '/admin/menukaart',
          action: 'Menukaart invullen',
        },
  );
  checks.push(
    (photos?.visible ?? 0) > 0
      ? { tone: 'ok', title: `${photos!.visible} ${photos!.visible === 1 ? 'foto' : "foto's"} in de galerij`, href: '/admin/fotos', action: "Foto's" }
      : {
          tone: 'warn',
          title: "Nog geen foto's in de galerij",
          detail: "Foto's van je zaak en gerechten maken de website veel aantrekkelijker.",
          href: '/admin/fotos?toevoegen=1',
          action: 'Foto toevoegen',
        },
  );
  if (!settings?.heroImageId) {
    checks.push({
      tone: 'warn',
      title: 'Nog geen hoofdfoto op de homepage',
      detail: 'De homepage toont nu alleen tekst.',
      href: '/admin/website#hoofdfoto',
      action: 'Foto kiezen',
    });
  }
  if (isProduction() && !env().RESEND_API_KEY) {
    checks.push({
      tone: 'error',
      title: 'E-mail versturen is nog niet ingesteld',
      detail: 'Inlogcodes en berichten kunnen niet worden verstuurd. Neem contact op met je websitebeheerder.',
    });
  }
  const allGood = checks.every((c) => c.tone === 'ok');

  const quick = [
    { href: '/admin/fotos?toevoegen=1', label: 'Foto toevoegen', icon: PlusIcon },
    { href: '/admin/menukaart', label: 'Menukaart aanpassen', icon: ListIcon },
    { href: '/admin/openingstijden', label: 'Openingstijden wijzigen', icon: ClockIcon },
    { href: '/admin/berichten', label: 'Bericht bekijken', icon: MailIcon },
  ];

  return (
    <>
      <PageTitle
        title={`${greeting(now)}, ${ctx.user.name.split(' ')[0]}`}
        description={allGood ? 'Alles is in orde.' : 'Er zijn een paar dingen die je aandacht verdienen.'}
      />

      <section className="admin-card overflow-hidden" aria-labelledby="status-titel">
        <h2 id="status-titel" className="border-b border-line px-5 py-4 font-display text-2xl">
          Is alles goed?
        </h2>
        <ul className="divide-y divide-line">
          {checks.map((c, i) => (
            <li key={i} className="flex items-start gap-3 px-5 py-3.5">
              <span
                className={`mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full ${
                  c.tone === 'ok' ? 'bg-basil-soft text-basil' : c.tone === 'warn' ? 'bg-warning-soft text-warning' : 'bg-tomato-soft text-tomato-dark'
                }`}
              >
                {c.tone === 'ok' ? <CheckIcon size={16} /> : <AlertIcon size={16} />}
                <span className="sr-only">{c.tone === 'ok' ? 'In orde' : 'Let op'}</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{c.title}</p>
                {c.detail && <p className="text-[0.95rem] text-muted">{c.detail}</p>}
              </div>
              {c.href && c.action && (
                <Link href={c.href} className="admin-btn admin-btn-ghost admin-btn-sm shrink-0">
                  {c.action} <ArrowRightIcon size={16} />
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8" aria-labelledby="snel-titel">
        <h2 id="snel-titel" className="mb-3 font-display text-2xl">
          Snel naar
        </h2>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {quick.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="admin-card flex h-full min-h-24 flex-col justify-between gap-3 p-4 font-semibold transition-colors hover:border-tomato"
              >
                <Icon size={24} className="text-tomato" />
                {label}
              </Link>
            </li>
          ))}
          <li>
            <a
              href="/"
              target="_blank"
              rel="noopener"
              className="admin-card flex h-full min-h-24 flex-col justify-between gap-3 p-4 font-semibold transition-colors hover:border-tomato"
            >
              <ExternalIcon size={24} className="text-tomato" />
              Website bekijken
            </a>
          </li>
        </ul>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="admin-card" aria-labelledby="berichten-titel">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 id="berichten-titel" className="font-display text-2xl">
              Laatste berichten
            </h2>
            <Link href="/admin/berichten" className="text-[0.95rem] font-semibold text-tomato underline-offset-2 hover:underline">
              Alle berichten
            </Link>
          </div>
          {recentMessages.length === 0 ? (
            <p className="px-5 py-5 text-muted">Nog geen berichten ontvangen.</p>
          ) : (
            <ul className="divide-y divide-line">
              {recentMessages.map((m) => (
                <li key={m.id}>
                  <Link href={`/admin/berichten/${m.id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-paper/60">
                    <span className={`mt-2 size-2.5 shrink-0 rounded-full ${m.status === 'new' ? 'bg-tomato' : 'bg-line'}`} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate ${m.status === 'new' ? 'font-bold' : 'font-medium'}`}>{m.subject}</span>
                      <span className="block truncate text-sm text-muted">
                        {m.name} · {timeAgo(m.createdAt, now)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-card" aria-labelledby="wijzigingen-titel">
          <h2 id="wijzigingen-titel" className="border-b border-line px-5 py-4 font-display text-2xl">
            Recente wijzigingen
          </h2>
          {activity.length === 0 ? (
            <p className="px-5 py-5 text-muted">Nog geen wijzigingen.</p>
          ) : (
            <ul className="divide-y divide-line">
              {activity.map((a) => (
                <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-x-4 px-5 py-3">
                  <span className="min-w-0">{a.summary}</span>
                  <time dateTime={a.createdAt.toISOString()} title={formatShortDateTime(a.createdAt)} className="text-sm text-muted">
                    {timeAgo(a.createdAt, now)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
