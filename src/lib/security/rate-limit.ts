import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { keyedHash } from './crypto';

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSeconds: number };

/**
 * Fixed-window rate limiter stored in PostgreSQL, so limits survive restarts.
 * `key` may contain personal data (e-mail, IP); it is stored only as a keyed hash.
 */
export async function consumeRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const hashed = keyedHash(key, 'ratelimit');
  const rows = await db().execute<{ count: number; window_start: string }>(sql`
    insert into rate_limits (key, count, window_start)
    values (${hashed}, 1, now())
    on conflict (key) do update set
      count = case when rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) then 1 else rate_limits.count + 1 end,
      window_start = case when rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) then now() else rate_limits.window_start end
    returning count, window_start
  `);
  const row = rows[0]!;
  const count = Number(row.count);
  const elapsed = (Date.now() - new Date(row.window_start).getTime()) / 1000;
  return {
    ok: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: Math.max(1, Math.ceil(windowSeconds - elapsed)),
  };
}

/** Clears a limiter, e.g. after a successful login. */
export async function resetRateLimit(key: string): Promise<void> {
  await db().execute(sql`delete from rate_limits where key = ${keyedHash(key, 'ratelimit')}`);
}

export function waitMessage(seconds: number): string {
  if (seconds < 90) return 'Te veel pogingen. Wacht even en probeer het over een minuut opnieuw.';
  const minutes = Math.ceil(seconds / 60);
  return `Te veel pogingen. Probeer het over ${minutes} minuten opnieuw.`;
}
