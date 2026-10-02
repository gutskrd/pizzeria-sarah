import { and, desc, eq, gt, isNull, notInArray } from 'drizzle-orm';
import { DevicesView, type DeviceSession, type SecurityItem } from '@/components/admin/devices-view';
import { requireAdmin } from '@/lib/auth/current';
import { db, schema } from '@/lib/db';
import type { SecurityEventType } from '@/lib/db/schema';
import { formatDate, formatShortDateTime, timeAgo } from '@/lib/format';
import { approximateLocation, countryName } from '@/lib/security/geo';

export const metadata = { title: 'Ingelogde apparaten – Beheer' };

const EVENT_LABELS: Record<SecurityEventType, { label: string; warning?: boolean }> = {
  login_success: { label: 'Ingelogd' },
  login_new_device: { label: 'Ingelogd op een nieuw apparaat' },
  login_failed: { label: 'Mislukte inlogpoging (verkeerd wachtwoord)', warning: true },
  verification_sent: { label: 'Inlogcode verstuurd' },
  verification_failed: { label: 'Verkeerde inlogcode ingevuld', warning: true },
  verification_success: { label: 'Inlogcode bevestigd' },
  logout: { label: 'Uitgelogd' },
  session_terminated: { label: 'Apparaat uitgelogd' },
  sessions_terminated_all: { label: 'Alle andere apparaten uitgelogd' },
  session_suspicious: { label: 'Verdachte sessie automatisch beëindigd', warning: true },
  password_changed: { label: 'Wachtwoord gewijzigd' },
  password_reset_requested: { label: 'Nieuw wachtwoord aangevraagd' },
  password_reset_completed: { label: 'Wachtwoord opnieuw ingesteld' },
  email_changed: { label: 'E-mailadres gewijzigd' },
};

export default async function DevicesPage() {
  const ctx = await requireAdmin();
  const now = new Date();
  const [rows, events] = await Promise.all([
    db()
      .select()
      .from(schema.sessions)
      .where(
        and(
          eq(schema.sessions.userId, ctx.user.id),
          isNull(schema.sessions.revokedAt),
          gt(schema.sessions.idleExpiresAt, now),
          gt(schema.sessions.absoluteExpiresAt, now),
        ),
      )
      .orderBy(desc(schema.sessions.lastSeenAt)),
    db()
      .select()
      .from(schema.securityEvents)
      .where(and(eq(schema.securityEvents.userId, ctx.user.id), notInArray(schema.securityEvents.type, ['verification_sent', 'verification_success'])))
      .orderBy(desc(schema.securityEvents.createdAt))
      .limit(25),
  ]);

  const sessions: DeviceSession[] = rows
    .map((s) => ({
      id: s.id,
      deviceType: s.deviceType,
      deviceName: s.deviceName,
      browser: s.browser,
      os: s.os,
      location: approximateLocation(s.country, s.region, s.city),
      isApproximateRegion: Boolean(s.country && (s.city || s.region)),
      firstLogin: formatDate(s.createdAt),
      lastActive: s.lastSeenAt.toISOString(),
      lastActiveAgo: timeAgo(s.lastSeenAt, now),
      remember: s.remember,
      isCurrent: s.id === ctx.session.id,
      ip: s.ip,
    }))
    .sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent));

  const items: SecurityItem[] = events.map((e) => ({
    id: e.id,
    label: EVENT_LABELS[e.type]?.label ?? 'Activiteit',
    warning: EVENT_LABELS[e.type]?.warning ?? false,
    detail: [e.deviceSummary, countryName(e.country)].filter(Boolean).join(' · '),
    when: formatShortDateTime(e.createdAt),
  }));

  return <DevicesView sessions={sessions} events={items} />;
}
