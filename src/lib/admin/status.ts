import 'server-only';
import { and, desc, eq, gt, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { env, isProduction } from '@/lib/env';
import { formatCalendarDate, todayInAmsterdam } from '@/lib/format';
import { addDays, capitalize, formatLongDate, formatPeriods, normalizeTime } from '@/lib/opening-hours';
import type { AdminNotification, AdminStatus, NavBadge, NavKey } from './status-types';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Everything that deserves the owner's attention, computed fresh from the
 * database: unread messages, security warnings, upcoming closures, offers that
 * end soon, photos without a description, dishes without a price, setup gaps.
 */
export async function getAdminStatus(userId: string): Promise<AdminStatus> {
  const d = db();
  const today = todayInAmsterdam();
  const weekAhead = addDays(today, 7);
  const soon = addDays(today, 3);
  const now = new Date();

  const [[user], [settings], [unreadRow], unreadMessages, sessionsRow, exceptions, offers, [photoRow], [menuRow]] = await Promise.all([
    d.select({ alertsSeenAt: schema.adminUsers.alertsSeenAt }).from(schema.adminUsers).where(eq(schema.adminUsers.id, userId)).limit(1),
    d.select({ heroImageId: schema.siteSettings.heroImageId, businessName: schema.siteSettings.businessName }).from(schema.siteSettings).limit(1),
    d
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.messages)
      .where(eq(schema.messages.status, 'new')),
    d
      .select({ id: schema.messages.id, name: schema.messages.name, subject: schema.messages.subject, createdAt: schema.messages.createdAt })
      .from(schema.messages)
      .where(eq(schema.messages.status, 'new'))
      .orderBy(desc(schema.messages.createdAt))
      .limit(5),
    d
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.sessions)
      .where(
        and(
          eq(schema.sessions.userId, userId),
          isNull(schema.sessions.revokedAt),
          gt(schema.sessions.idleExpiresAt, now),
          gt(schema.sessions.absoluteExpiresAt, now),
        ),
      ),
    d
      .select()
      .from(schema.openingExceptions)
      .where(and(lte(schema.openingExceptions.startsOn, weekAhead), gte(schema.openingExceptions.endsOn, today)))
      .orderBy(schema.openingExceptions.startsOn),
    d
      .select({ id: schema.offers.id, title: schema.offers.title, startsOn: schema.offers.startsOn, endsOn: schema.offers.endsOn })
      .from(schema.offers)
      .where(
        and(
          eq(schema.offers.isVisible, true),
          or(isNull(schema.offers.startsOn), lte(schema.offers.startsOn, today)),
          or(isNull(schema.offers.endsOn), gte(schema.offers.endsOn, today)),
        ),
      ),
    d
      .select({
        undescribed: sql<number>`count(*) filter (where ${schema.images.isVisible} and (trim(${schema.images.altText}) = '' or ${schema.images.altText} ~* '^foto van '))::int`,
      })
      .from(schema.images)
      .where(isNull(schema.images.deletedAt)),
    d
      .select({
        total: sql<number>`count(*)::int`,
        noPrice: sql<number>`count(*) filter (where ${schema.menuItems.isVisible} and ${schema.menuItems.priceCents} is null and not exists (select 1 from menu_item_variants v where v.item_id = ${schema.menuItems.id}))::int`,
      })
      .from(schema.menuItems),
  ]);

  const seenAt = user?.alertsSeenAt ?? new Date(0);
  const since = new Date(Math.max(seenAt.getTime(), now.getTime() - 14 * 24 * 60 * 60 * 1000));
  const security = await d
    .select()
    .from(schema.securityEvents)
    .where(
      and(
        eq(schema.securityEvents.userId, userId),
        gt(schema.securityEvents.createdAt, since),
        inArray(schema.securityEvents.type, ['login_failed', 'verification_failed', 'session_suspicious', 'login_new_device', 'password_reset_requested']),
      ),
    )
    .orderBy(desc(schema.securityEvents.createdAt))
    .limit(50);

  const exceptionPeriods = exceptions.length
    ? await d
        .select()
        .from(schema.openingExceptionPeriods)
        .where(
          inArray(
            schema.openingExceptionPeriods.exceptionId,
            exceptions.map((e) => e.id),
          ),
        )
    : [];

  const notifications: AdminNotification[] = [];
  const badges: Partial<Record<NavKey, NavBadge>> = {};

  // Messages
  const unread = unreadRow?.count ?? 0;
  for (const m of unreadMessages) {
    notifications.push({
      id: `message-${m.id}`,
      kind: 'message',
      tone: 'danger',
      title: `Nieuw bericht van ${m.name}`,
      detail: m.subject,
      href: `/admin/berichten/${m.id}`,
      at: m.createdAt.toISOString(),
      isNew: true,
    });
  }
  if (unread > unreadMessages.length) {
    notifications.push({
      id: 'message-more',
      kind: 'message',
      tone: 'danger',
      title: `En nog ${plural(unread - unreadMessages.length, 'ongelezen bericht', 'ongelezen berichten')}`,
      href: '/admin/berichten?status=new',
    });
  }
  if (unread > 0) badges.berichten = { count: unread, tone: 'danger', label: plural(unread, 'ongelezen bericht', 'ongelezen berichten') };

  // Security
  const failed = security.filter((e) => e.type === 'login_failed' || e.type === 'verification_failed');
  const suspicious = security.filter((e) => e.type === 'session_suspicious');
  const newDevices = security.filter((e) => e.type === 'login_new_device');
  const resets = security.filter((e) => e.type === 'password_reset_requested');
  if (suspicious.length) {
    notifications.push({
      id: 'security-suspicious',
      kind: 'security',
      tone: 'danger',
      title: 'Verdachte sessie beëindigd',
      detail: 'Een sessie werd ineens vanaf een andere browser gebruikt en is automatisch uitgelogd.',
      href: '/admin/apparaten',
      at: suspicious[0]!.createdAt.toISOString(),
      isNew: true,
    });
  }
  if (failed.length) {
    notifications.push({
      id: 'security-failed',
      kind: 'security',
      tone: failed.length >= 3 ? 'danger' : 'warning',
      title: plural(failed.length, 'mislukte inlogpoging', 'mislukte inlogpogingen'),
      detail: 'Was jij dit niet? Controleer je ingelogde apparaten.',
      href: '/admin/apparaten',
      at: failed[0]!.createdAt.toISOString(),
      isNew: true,
    });
  }
  for (const e of newDevices.slice(0, 3)) {
    notifications.push({
      id: `security-device-${e.id}`,
      kind: 'security',
      tone: 'warning',
      title: 'Ingelogd op een nieuw apparaat',
      detail: e.deviceSummary ?? undefined,
      href: '/admin/apparaten',
      at: e.createdAt.toISOString(),
      isNew: true,
    });
  }
  if (resets.length) {
    notifications.push({
      id: 'security-reset',
      kind: 'security',
      tone: 'warning',
      title: 'Nieuw wachtwoord aangevraagd',
      detail: 'Heb je dit niet zelf gedaan? Dan hoef je niets te doen; je wachtwoord blijft hetzelfde.',
      href: '/admin/apparaten',
      at: resets[0]!.createdAt.toISOString(),
      isNew: true,
    });
  }
  const securityAlerts = suspicious.length + failed.length + newDevices.length;
  const activeSessions = sessionsRow[0]?.count ?? 0;
  if (securityAlerts > 0)
    badges.apparaten = { count: securityAlerts, tone: 'danger', label: plural(securityAlerts, 'beveiligingsmelding', 'beveiligingsmeldingen') };
  else if (activeSessions > 1) badges.apparaten = { count: activeSessions, tone: 'neutral', label: `${activeSessions} apparaten ingelogd` };

  // Opening hours: closures and special hours in the coming week
  for (const e of exceptions) {
    const periods = exceptionPeriods.filter((p) => p.exceptionId === e.id).map((p) => ({ opens: normalizeTime(p.opensAt), closes: normalizeTime(p.closesAt) }));
    const isNow = e.startsOn <= today;
    const when =
      e.startsOn <= today && e.endsOn >= today
        ? e.endsOn === today
          ? 'Vandaag'
          : `Nu t/m ${formatCalendarDate(e.endsOn)}`
        : e.startsOn === addDays(today, 1)
          ? 'Morgen'
          : capitalize(formatLongDate(e.startsOn));
    notifications.push({
      id: `hours-${e.id}`,
      kind: 'hours',
      tone: 'info',
      title: `${when} ${e.isClosed ? 'gesloten' : `andere tijden: ${formatPeriods(periods)}`}`,
      detail: e.label,
      href: '/admin/openingstijden',
      isNew: isNow,
    });
  }
  if (exceptions.length)
    badges.openingstijden = { count: exceptions.length, tone: 'info', label: `${plural(exceptions.length, 'afwijking', 'afwijkingen')} deze week` };

  // Offers
  const endingSoon = offers.filter((o) => o.endsOn && o.endsOn <= soon);
  for (const o of endingSoon) {
    notifications.push({
      id: `offer-${o.id}`,
      kind: 'offer',
      tone: 'warning',
      title: `Aanbieding loopt ${o.endsOn === today ? 'vandaag' : o.endsOn === addDays(today, 1) ? 'morgen' : `op ${formatCalendarDate(o.endsOn!)}`} af`,
      detail: o.title,
      href: `/admin/aanbiedingen?aanbieding=${o.id}`,
    });
  }
  if (endingSoon.length)
    badges.aanbiedingen = {
      count: endingSoon.length,
      tone: 'warning',
      label: `${plural(endingSoon.length, 'aanbieding loopt', 'aanbiedingen lopen')} binnenkort af`,
    };
  else if (offers.length)
    badges.aanbiedingen = { count: offers.length, tone: 'neutral', label: `${plural(offers.length, 'actieve aanbieding', 'actieve aanbiedingen')}` };

  // Photos without a real description
  const undescribed = photoRow?.undescribed ?? 0;
  if (undescribed > 0) {
    notifications.push({
      id: 'photos-alt',
      kind: 'photos',
      tone: 'warning',
      title: `${plural(undescribed, 'foto', "foto's")} zonder beschrijving`,
      detail: 'Een korte beschrijving helpt blinde bezoekers en Google.',
      href: '/admin/fotos?filter=zonder-beschrijving',
    });
    badges.fotos = { count: undescribed, tone: 'warning', label: `${plural(undescribed, 'foto', "foto's")} zonder beschrijving` };
  }

  // Menu
  const totalItems = menuRow?.total ?? 0;
  const noPrice = menuRow?.noPrice ?? 0;
  if (totalItems === 0) {
    notifications.push({
      id: 'menu-empty',
      kind: 'menu',
      tone: 'warning',
      title: 'De menukaart is nog leeg',
      detail: 'Voeg gerechten toe of upload de menukaart als PDF.',
      href: '/admin/menukaart',
    });
    badges.menukaart = { count: null, tone: 'warning', label: 'De menukaart is nog leeg' };
  } else if (noPrice > 0) {
    notifications.push({
      id: 'menu-price',
      kind: 'menu',
      tone: 'warning',
      title: `${plural(noPrice, 'gerecht', 'gerechten')} zonder prijs`,
      href: '/admin/menukaart',
    });
    badges.menukaart = { count: noPrice, tone: 'warning', label: `${plural(noPrice, 'gerecht', 'gerechten')} zonder prijs` };
  }

  // Website setup
  if (!settings?.heroImageId) {
    notifications.push({ id: 'website-hero', kind: 'website', tone: 'info', title: 'Nog geen hoofdfoto op de homepage', href: '/admin/website#hoofdfoto' });
    badges.website = { count: null, tone: 'info', label: 'Nog geen hoofdfoto op de homepage' };
  }
  if (isProduction() && !env().RESEND_API_KEY) {
    notifications.push({
      id: 'email',
      kind: 'email',
      tone: 'danger',
      title: 'E-mail versturen is niet ingesteld',
      detail: 'Inlogcodes en berichten kunnen niet worden verstuurd. Neem contact op met je websitebeheerder.',
      href: '/admin/instellingen',
    });
    badges.instellingen = { count: null, tone: 'danger', label: 'E-mail is niet ingesteld' };
  }

  const toneOrder = { danger: 0, warning: 1, info: 2 } as const;
  notifications.sort((a, b) => toneOrder[a.tone] - toneOrder[b.tone] || (b.at ?? '').localeCompare(a.at ?? ''));

  return {
    unread,
    badges,
    notifications,
    newestUnread: unreadMessages[0] ? { id: unreadMessages[0].id, name: unreadMessages[0].name, subject: unreadMessages[0].subject } : null,
    generatedAt: now.toISOString(),
  };
}

export async function markAlertsSeen(userId: string): Promise<void> {
  await db().update(schema.adminUsers).set({ alertsSeenAt: new Date() }).where(eq(schema.adminUsers.id, userId));
}
