import { and, eq, gt, isNull, ne, or, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { hashToken, randomToken } from '@/lib/security/crypto';
import { recordSecurityEvent } from '@/lib/security/events';
import type { RequestInfo } from '@/lib/security/request-info';
import { AUTH } from './constants';

export type SessionRow = typeof schema.sessions.$inferSelect;
export type AdminUser = Pick<typeof schema.adminUsers.$inferSelect, 'id' | 'email' | 'name'>;
export type RevokeReason = NonNullable<SessionRow['revokedReason']>;

export type ValidatedSession = {
  session: SessionRow;
  user: AdminUser;
  /** Set when the token was rotated; the caller must store it in the cookie. */
  newToken?: string;
  /** True when the persistent cookie lifetime should be extended. */
  refreshCookie: boolean;
};

const idleMs = (remember: boolean) => (remember ? AUTH.rememberIdleMs : AUTH.shortIdleMs);

export async function createSession(
  userId: string,
  info: RequestInfo,
  opts: { remember: boolean; trustedDeviceId: string | null },
): Promise<{ token: string; session: SessionRow }> {
  const token = randomToken();
  const now = Date.now();
  const [session] = await db()
    .insert(schema.sessions)
    .values({
      userId,
      tokenHash: hashToken(token),
      remember: opts.remember,
      trustedDeviceId: opts.trustedDeviceId,
      deviceType: info.device.deviceType,
      deviceName: info.device.deviceName,
      browser: info.device.browser,
      os: info.device.os,
      clientFingerprint: info.device.fingerprint,
      ip: info.ip,
      country: info.country,
      region: info.region,
      city: info.city,
      idleExpiresAt: new Date(now + idleMs(opts.remember)),
      absoluteExpiresAt: new Date(now + (opts.remember ? AUTH.rememberAbsoluteMs : AUTH.shortAbsoluteMs)),
    })
    .returning();
  return { token, session: session! };
}

/**
 * Validates a session token against the database. Every protected page, action
 * and route handler calls this; nothing trusts client-side state.
 */
export async function validateSessionToken(token: string | undefined, info: RequestInfo | null, opts: { touch: boolean }): Promise<ValidatedSession | null> {
  if (!token || token.length < 20 || token.length > 200) return null;
  const tokenHash = hashToken(token);

  const rows = await db()
    .select({ session: schema.sessions, user: { id: schema.adminUsers.id, email: schema.adminUsers.email, name: schema.adminUsers.name } })
    .from(schema.sessions)
    .innerJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.sessions.userId))
    .where(and(isNull(schema.sessions.revokedAt), or(eq(schema.sessions.tokenHash, tokenHash), eq(schema.sessions.prevTokenHash, tokenHash))))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const { session, user } = row;
  const now = Date.now();

  const viaPrevious = session.tokenHash !== tokenHash;
  if (viaPrevious && now - session.tokenRotatedAt.getTime() > AUTH.rotationGraceMs) return null;

  if (now > session.idleExpiresAt.getTime() || now > session.absoluteExpiresAt.getTime()) {
    await revokeSession(session.id, 'expired');
    return null;
  }

  // A session that suddenly comes from a different browser or operating system
  // was most likely copied to another device: end it.
  if (info && info.device.fingerprint !== session.clientFingerprint) {
    await revokeSession(session.id, 'suspicious');
    await recordSecurityEvent('session_suspicious', user.id, info);
    return null;
  }

  const result: ValidatedSession = { session, user, refreshCookie: false };
  if (!opts.touch) return result;

  const updates: Partial<typeof schema.sessions.$inferInsert> = {};
  if (now - session.lastSeenAt.getTime() > AUTH.touchIntervalMs) {
    updates.lastSeenAt = new Date(now);
    updates.idleExpiresAt = new Date(now + idleMs(session.remember));
    if (info?.ip && info.ip !== session.ip) {
      updates.ip = info.ip;
      if (info.country) {
        updates.country = info.country;
        updates.region = info.region;
        updates.city = info.city;
      }
    }
    result.refreshCookie = session.remember;
  }
  if (!viaPrevious && now - session.tokenRotatedAt.getTime() > AUTH.rotateAfterMs) {
    const newToken = randomToken();
    updates.prevTokenHash = session.tokenHash;
    updates.tokenHash = hashToken(newToken);
    updates.tokenRotatedAt = new Date(now);
    result.newToken = newToken;
    result.refreshCookie = true;
  }
  if (Object.keys(updates).length > 0) {
    await db().update(schema.sessions).set(updates).where(eq(schema.sessions.id, session.id));
    result.session = { ...session, ...updates } as SessionRow;
  }
  return result;
}

export function sessionCookieMaxAge(session: Pick<SessionRow, 'remember'>): number | undefined {
  return session.remember ? AUTH.rememberIdleMs : undefined;
}

export async function revokeSession(sessionId: string, reason: RevokeReason): Promise<void> {
  await db()
    .update(schema.sessions)
    .set({ revokedAt: new Date(), revokedReason: reason })
    .where(and(eq(schema.sessions.id, sessionId), isNull(schema.sessions.revokedAt)));
}

/** Revokes a session that belongs to `userId` (never someone else's). Returns false if not found. */
export async function revokeUserSession(userId: string, sessionId: string, reason: RevokeReason): Promise<boolean> {
  const rows = await db()
    .update(schema.sessions)
    .set({ revokedAt: new Date(), revokedReason: reason })
    .where(and(eq(schema.sessions.id, sessionId), eq(schema.sessions.userId, userId), isNull(schema.sessions.revokedAt)))
    .returning({ id: schema.sessions.id, trustedDeviceId: schema.sessions.trustedDeviceId });
  const row = rows[0];
  if (!row) return false;
  // Signing out a device also forgets it, so the next login there needs a code again.
  if (row.trustedDeviceId) await revokeTrustedDevice(row.trustedDeviceId);
  return true;
}

/** Revokes all sessions of a user except `keepSessionId`. Returns the number revoked. */
export async function revokeOtherSessions(userId: string, keepSessionId: string | null, reason: RevokeReason): Promise<number> {
  const where = keepSessionId
    ? and(eq(schema.sessions.userId, userId), isNull(schema.sessions.revokedAt), ne(schema.sessions.id, keepSessionId))
    : and(eq(schema.sessions.userId, userId), isNull(schema.sessions.revokedAt));
  const rows = await db().update(schema.sessions).set({ revokedAt: new Date(), revokedReason: reason }).where(where).returning({ id: schema.sessions.id });
  return rows.length;
}

/* ───────────── Trusted devices ("Dit apparaat onthouden") ───────────── */

export async function createTrustedDevice(userId: string): Promise<{ token: string; id: string }> {
  const token = randomToken();
  const [row] = await db()
    .insert(schema.trustedDevices)
    .values({ userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + AUTH.trustedDeviceMs) })
    .returning({ id: schema.trustedDevices.id });
  return { token, id: row!.id };
}

export async function findTrustedDevice(userId: string, token: string | undefined): Promise<string | null> {
  if (!token || token.length > 200) return null;
  const rows = await db()
    .update(schema.trustedDevices)
    .set({ lastUsedAt: new Date(), expiresAt: new Date(Date.now() + AUTH.trustedDeviceMs) })
    .where(
      and(
        eq(schema.trustedDevices.tokenHash, hashToken(token)),
        eq(schema.trustedDevices.userId, userId),
        isNull(schema.trustedDevices.revokedAt),
        gt(schema.trustedDevices.expiresAt, new Date()),
      ),
    )
    .returning({ id: schema.trustedDevices.id });
  return rows[0]?.id ?? null;
}

export async function revokeTrustedDevice(id: string): Promise<void> {
  await db().update(schema.trustedDevices).set({ revokedAt: new Date() }).where(eq(schema.trustedDevices.id, id));
}

export async function revokeTrustedDevices(userId: string, exceptId: string | null): Promise<void> {
  const where = exceptId
    ? and(eq(schema.trustedDevices.userId, userId), isNull(schema.trustedDevices.revokedAt), ne(schema.trustedDevices.id, exceptId))
    : and(eq(schema.trustedDevices.userId, userId), isNull(schema.trustedDevices.revokedAt));
  await db().update(schema.trustedDevices).set({ revokedAt: new Date() }).where(where);
}

/** True when this user has signed in before with the same browser + OS (within ~6 months). */
export async function isKnownDevice(userId: string, fingerprint: string): Promise<boolean> {
  const rows = await db()
    .select({ id: schema.sessions.id })
    .from(schema.sessions)
    .where(
      and(
        eq(schema.sessions.userId, userId),
        eq(schema.sessions.clientFingerprint, fingerprint),
        gt(schema.sessions.createdAt, sql`now() - interval '180 days'`),
      ),
    )
    .limit(1);
  return rows.length > 0;
}
