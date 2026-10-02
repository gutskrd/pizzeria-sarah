import { and, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import Link from 'next/link';
import { MessageChart, type DayCount } from '@/components/admin/dashboard/message-chart';
import { TodayCard } from '@/components/admin/dashboard/today-card';
import { AlertIcon, ArrowRightIcon, CheckIcon, ClockIcon, ExternalIcon, ImageIcon, ListIcon, MailIcon, PlusIcon, TagIcon } from '@/components/ui/icons';
import { requireAdmin } from '@/lib/auth/current';
import { getSchedule } from '@/lib/content/queries';
import { db, schema } from '@/lib/db';
import { env, isProduction } from '@/lib/env';
import { formatShortDateTime, timeAgo, todayInAmsterdam } from '@/lib/format';
import { addDays, capitalize, formatPeriods, upcomingDays, weekdayName } from '@/lib/opening-hours';

export const metadata = { title: 'Dashboard – Beheer' };

type Check = { tone: 'ok' | 'warn' | 'error'; title: string; detail?: string; href?: string; action?: string };

function greeting(now: Date): string {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', hour: '2-digit', hourCycle: 'h23' }).format(now));
  if (hour < 6) return 'Goedenacht';
  if (hour < 12) return 'Goedemorgen';
  if (hour < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

const shortDay = new Intl.DateTimeFormat('nl-NL', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });

export default async function DashboardPage() {
  const ctx = await requireAdmin();
  const d = db();
  const now = new Date();
  const today = todayInAmsterdam(now);

  const [schedule, [settings], [msg], [menu], [photos], [offers], series, recentMessages, activity, [todayException]] = await Promise.all([
    getSchedule(),
    d.select().from(schema.siteSettings).limit(1),
    d
      .select({
        unread: sql<number>`count(*) filter (where ${schema.messages.status} = 'new')::int`,
        week: sql<number>`count(*) filter (where ${schema.messages.createdAt} > now() - interval '7 days')::int`,
      })
      .from(schema.messages),
    d
      .select({
        items: sql<number>`count(*) filter (where ${schema.menuItems.isVisible})::int`,
        categories: sql<number>`count(distinct ${schema.menuItems.categoryId})::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(schema.menuItems),
    d
      .select({
        visible: sql<number>`count(*) filter (where ${schema.images.isVisible})::int`,
        featured: sql<number>`count(*) filter (where ${schema.images.isVisible} and ${schema.images.isFeatured})::int`,
      })
      .from(schema.images)
      .where(isNull(schema.images.deletedAt)),
    d
      .select({
        active: sql<number>`count(*) filter (where (${schema.offers.startsOn} is null or ${schema.offers.startsOn} <= ${today}) and (${schema.offers.endsOn} is null or ${schema.offers.endsOn} >= ${today}))::int`,
        planned: sql<number>`count(*) filter (where ${schema.offers.startsOn} > ${today})::int`,
      })
      .from(schema.offers)
      .where(eq(schema.offers.isVisible, true)),
    d.execute<{ day: string; count: number }>(sql`
      select to_char(created_at at time zone 'Europe/Amsterdam', 'YYYY-MM-DD') as day, count(*)::int as count
      from messages where created_at > now() - interval '15 days' group by 1`),
    d.select().from(schema.messages).orderBy(desc(schema.messages.createdAt)).limit(4),
    d.select().from(schema.activityLog).orderBy(desc(schema.activityLog.createdAt)).limit(6),
    d
      .select()
      .from(schema.openingExceptions)
      .where(and(lte(schema.openingExceptions.startsOn, today), gte(schema.openingExceptions.endsOn, today)))
      .limit(1),
  ]);

  const byDay = new Map(Array.from(series).map((r) => [r.day, Number(r.count)]));
  const chart: DayCount[] = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(today, i - 13);
    return { date, label: shortDay.format(new Date(`${date}T12:00:00Z`)), count: byDay.get(date) ?? 0 };
  });

  const quickCloseId =
    todayException && todayException.isClosed && todayException.startsOn === today && todayException.endsOn === today ? todayException.id : null;
  const week = upcomingDays(schedule, now, 7);

  const checks: Check[] = [{ tone: 'ok', title: 'De website is online', detail: 'Bezoekers kunnen de website gewoon bekijken.' }];
  if (isProduction() && !env().RESEND_API_KEY) {
    checks.push({
      tone: 'error',
      title: 'E-mail versturen is nog niet ingesteld',
      detail: 'Inlogcodes en berichten kunnen niet worden verstuurd. Neem contact op met je websitebeheerder.',
    });
  }
  const unread = msg?.unread ?? 0;
  checks.push(
    unread > 0
      ? { tone: 'warn', title: `${unread} ${unread === 1 ? 'nieuw bericht' : 'nieuwe berichten'}`, href: '/admin/berichten?status=new', action: 'Lezen' }
      : { tone: 'ok', title: 'Geen nieuwe berichten' },
  );
  checks.push(
    (menu?.total ?? 0) > 0
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
  if (!settings?.heroImageId)
    checks.push({
      tone: 'warn',
      title: 'Nog geen hoofdfoto op de homepage',
      detail: 'De homepage toont nu alleen tekst.',
      href: '/admin/website#hoofdfoto',
      action: 'Foto kiezen',
    });
  const attention = checks.filter((c) => c.tone !== 'ok').length;

  const tiles = [
    { href: '/admin/berichten', label: 'Nieuwe berichten', value: unread, sub: `${msg?.week ?? 0} deze week`, icon: MailIcon, alert: unread > 0 },
    {
      href: '/admin/menukaart',
      label: 'Gerechten online',
      value: menu?.items ?? 0,
      sub: `in ${menu?.categories ?? 0} ${(menu?.categories ?? 0) === 1 ? 'categorie' : 'categorieën'}`,
      icon: ListIcon,
      alert: false,
    },
    {
      href: '/admin/fotos',
      label: "Foto's in de galerij",
      value: photos?.visible ?? 0,
      sub: `${photos?.featured ?? 0} uitgelicht`,
      icon: ImageIcon,
      alert: false,
    },
    {
      href: '/admin/aanbiedingen',
      label: 'Actieve aanbiedingen',
      value: offers?.active ?? 0,
      sub: `${offers?.planned ?? 0} gepland`,
      icon: TagIcon,
      alert: false,
    },
  ];

  const quick = [
    { href: '/admin/fotos?toevoegen=1', label: 'Foto toevoegen', icon: PlusIcon },
    { href: '/admin/menukaart', label: 'Menukaart aanpassen', icon: ListIcon },
    { href: '/admin/openingstijden', label: 'Openingstijden wijzigen', icon: ClockIcon },
    { href: '/admin/berichten', label: 'Bericht bekijken', icon: MailIcon },
  ];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[2rem] leading-tight sm:text-4xl">
            {greeting(now)}, {ctx.user.name.split(' ')[0]}
          </h1>
          <p className="mt-1 text-muted">
            {attention === 0 ? 'Alles is in orde.' : `${attention} ${attention === 1 ? 'punt vraagt' : 'punten vragen'} je aandacht.`}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TodayCard schedule={schedule} quickCloseId={quickCloseId} todayLabel={todayException?.label ?? null} />
        </div>
        <section className="admin-card p-5" aria-label="Berichten per dag">
          <MessageChart data={chart} />
          <Link href="/admin/berichten" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-tomato hover:underline">
            Naar berichten <ArrowRightIcon size={16} />
          </Link>
        </section>
      </div>

      <ul className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Kerncijfers">
        {tiles.map(({ href, label, value, sub, icon: Icon, alert }) => (
          <li key={href}>
            <Link href={href} className="admin-card group flex h-full flex-col gap-3 p-4 transition-colors hover:border-line-strong">
              <span className="flex items-center justify-between">
                <span className={`inline-flex size-9 items-center justify-center rounded-lg ${alert ? 'bg-tomato text-white' : 'bg-paper text-ink-soft'}`}>
                  <Icon size={18} />
                </span>
                <ArrowRightIcon size={16} className="text-muted opacity-0 transition-opacity group-hover:opacity-100" />
              </span>
              <span>
                <span className="block font-display text-3xl tabular-nums leading-none">{value}</span>
                <span className="mt-1.5 block text-sm font-medium">{label}</span>
                <span className="block text-xs text-muted">{sub}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="admin-card mt-5 p-4 sm:p-5" aria-labelledby="week-titel">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="week-titel" className="font-display text-2xl">
            De komende 7 dagen
          </h2>
          <Link href="/admin/openingstijden" className="text-sm font-semibold text-tomato hover:underline">
            Aanpassen
          </Link>
        </div>
        <ol className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
          {week.map((day) => (
            <li
              key={day.date}
              className={`flex min-w-[6.5rem] flex-1 snap-start flex-col rounded-xl border p-3 ${
                day.isToday ? 'border-tomato bg-tomato-soft/50' : day.label ? 'border-[#f0b13c] bg-[#fdf6e7]' : 'border-line bg-white'
              }`}
            >
              <span className={`text-xs font-semibold uppercase tracking-wider ${day.isToday ? 'text-tomato-dark' : 'text-muted'}`}>
                {day.isToday ? 'Vandaag' : capitalize(weekdayName(day.weekday)).slice(0, 2)}
              </span>
              <span className="text-sm text-muted">
                {new Intl.DateTimeFormat('nl-NL', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(`${day.date}T12:00:00Z`))}
              </span>
              <span className={`mt-2 text-sm font-semibold tabular-nums ${day.periods.length ? '' : 'text-tomato-dark'}`}>
                {day.periods.length ? formatPeriods(day.periods).replace(/ – /g, '–') : 'Gesloten'}
              </span>
              {day.label && <span className="mt-1 line-clamp-2 text-xs text-[#8a5a00]">{day.label}</span>}
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <section className="admin-card overflow-hidden lg:col-span-3" aria-labelledby="status-titel">
          <h2 id="status-titel" className="border-b border-line px-5 py-4 font-display text-2xl">
            Is alles goed?
          </h2>
          <ul className="divide-y divide-line">
            {checks.map((c) => (
              <li key={c.title} className="flex items-start gap-3 px-5 py-3.5">
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

        <section className="lg:col-span-2" aria-labelledby="snel-titel">
          <h2 id="snel-titel" className="mb-3 font-display text-2xl">
            Snel naar
          </h2>
          <ul className="grid grid-cols-2 gap-3">
            {quick.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="admin-card flex h-full min-h-24 flex-col justify-between gap-3 p-4 font-semibold transition-colors hover:border-tomato"
                >
                  <Icon size={22} className="text-tomato" />
                  {label}
                </Link>
              </li>
            ))}
            <li className="col-span-2">
              <a
                href="/"
                target="_blank"
                rel="noopener"
                className="admin-card flex items-center justify-between gap-3 p-4 font-semibold transition-colors hover:border-tomato"
              >
                <span className="flex items-center gap-3">
                  <ExternalIcon size={22} className="text-tomato" /> Website bekijken
                </span>
                <ArrowRightIcon size={18} className="text-muted" />
              </a>
            </li>
          </ul>
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="admin-card" aria-labelledby="berichten-titel">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 id="berichten-titel" className="font-display text-2xl">
              Laatste berichten
            </h2>
            <Link href="/admin/berichten" className="text-sm font-semibold text-tomato hover:underline">
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
                    <span
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-paper text-sm font-semibold text-ink-soft"
                      aria-hidden="true"
                    >
                      {m.name.trim()[0]?.toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={`truncate ${m.status === 'new' ? 'font-bold' : 'font-medium'}`}>{m.name}</span>
                        <span className="shrink-0 text-xs text-muted">{timeAgo(m.createdAt, now)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        {m.status === 'new' && <span className="size-2 shrink-0 rounded-full bg-tomato" aria-label="Nieuw" />}
                        <span className="truncate text-sm text-muted">{m.subject}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-card" aria-labelledby="wijzigingen-titel">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 id="wijzigingen-titel" className="font-display text-2xl">
              Recente wijzigingen
            </h2>
            <Link href="/admin/activiteit" className="text-sm font-semibold text-tomato hover:underline">
              Alle activiteit
            </Link>
          </div>
          {activity.length === 0 ? (
            <p className="px-5 py-5 text-muted">Nog geen wijzigingen.</p>
          ) : (
            <ol className="px-5 py-3">
              {activity.map((a, i) => (
                <li key={a.id} className="relative flex gap-3 pb-3 last:pb-0">
                  {i < activity.length - 1 && <span className="absolute left-[5px] top-4 h-full w-px bg-line" aria-hidden="true" />}
                  <span className="relative mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-tomato bg-white" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.95rem]">{a.summary}</span>
                    <time dateTime={a.createdAt.toISOString()} title={formatShortDateTime(a.createdAt)} className="text-xs text-muted">
                      {timeAgo(a.createdAt, now)}
                    </time>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}
