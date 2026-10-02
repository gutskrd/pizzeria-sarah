import { db, schema } from '@/lib/db';
import type { SecurityEventType } from '@/lib/db/schema';
import type { RequestInfo } from './request-info';

export async function recordSecurityEvent(type: SecurityEventType, userId: string | null, info?: RequestInfo): Promise<void> {
  try {
    await db()
      .insert(schema.securityEvents)
      .values({
        type,
        userId,
        deviceSummary: info ? `${info.device.deviceName} · ${info.device.browser}` : null,
        ip: info?.ip ?? null,
        country: info?.country ?? null,
      });
  } catch (error) {
    console.error('[security-event] failed to record', type, error);
  }
}

/** Owner-facing activity history ("Foto vervangen", "Openingstijden gewijzigd", …). */
export async function logActivity(userId: string | null, area: string, summary: string): Promise<void> {
  try {
    await db()
      .insert(schema.activityLog)
      .values({ userId, area, summary: summary.slice(0, 200) });
  } catch (error) {
    console.error('[activity] failed to record', area, error);
  }
}
