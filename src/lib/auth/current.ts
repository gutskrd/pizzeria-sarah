import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { siteUrl } from '@/lib/env';
import { requestInfoFromHeaders, type RequestInfo } from '@/lib/security/request-info';
import { cookieNames } from './cookies';
import { validateSessionToken, type ValidatedSession } from './sessions';

export type AdminContext = ValidatedSession & { info: RequestInfo };

/** Current admin session for this request, validated server-side (memoised per request). */
export const getCurrentSession = cache(async (): Promise<AdminContext | null> => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const info = requestInfoFromHeaders(headerStore);
  const token = cookieStore.get(cookieNames().session)?.value;
  const validated = await validateSessionToken(token, info, { touch: false });
  return validated ? { ...validated, info } : null;
});

/** For admin pages and layouts: redirects to the login page when not signed in. */
export async function requireAdmin(): Promise<AdminContext> {
  const ctx = await getCurrentSession();
  if (!ctx) redirect('/admin/inloggen');
  return ctx;
}

/**
 * CSRF protection for route handlers (server actions have this built in):
 * state-changing requests must come from our own origin.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const allowed = new Set([new URL(siteUrl()).origin]);
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') ?? new URL(request.url).protocol.replace(':', '');
  if (host) allowed.add(`${proto}://${host}`);
  return allowed.has(origin);
}
