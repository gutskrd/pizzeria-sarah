import 'server-only';
import { and, isNotNull, lt, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { deleteMedia } from '@/lib/images/storage';

let lastRun = 0;
const DAY = 24 * 60 * 60 * 1000;

/**
 * Housekeeping, at most once a day (triggered when the owner opens the admin):
 * removes expired login data, empties the photo trash after 30 days and
 * deletes contact messages and security history older than 12 months, as
 * promised in the privacy statement.
 */
export async function runMaintenance(): Promise<void> {
  if (Date.now() - lastRun < DAY) return;
  lastRun = Date.now();
  try {
    const d = db();
    await d.execute(sql`delete from login_challenges where expires_at < now() - interval '1 day'`);
    await d.execute(sql`delete from password_reset_tokens where expires_at < now() - interval '1 day'`);
    await d.execute(sql`delete from rate_limits where window_start < now() - interval '2 days'`);
    await d.execute(sql`delete from sessions where revoked_at < now() - interval '90 days' or absolute_expires_at < now() - interval '90 days'`);
    await d.execute(sql`delete from trusted_devices where expires_at < now() - interval '30 days' or revoked_at < now() - interval '30 days'`);
    await d.execute(sql`delete from messages where created_at < now() - interval '12 months'`);
    await d.execute(sql`delete from security_events where created_at < now() - interval '12 months'`);
    await d.execute(sql`delete from activity_log where created_at < now() - interval '12 months'`);

    const trashed = await d
      .select({ id: schema.images.id, key: schema.images.storageKey })
      .from(schema.images)
      .where(and(isNotNull(schema.images.deletedAt), lt(schema.images.deletedAt, sql`now() - interval '30 days'`)));
    for (const img of trashed) {
      await d.execute(sql`delete from images where id = ${img.id}`);
      await deleteMedia(img.key);
    }
  } catch (error) {
    console.error('[maintenance] failed', error);
  }
}
