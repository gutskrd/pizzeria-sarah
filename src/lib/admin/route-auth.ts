import 'server-only';
import { getCurrentSession, isSameOrigin, type AdminContext } from '@/lib/auth/current';
import { consumeRateLimit } from '@/lib/security/rate-limit';

type Guard = { ctx: AdminContext; error?: never } | { ctx?: never; error: Response };

const json = (body: unknown, status: number) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/** Authorisation for admin route handlers: same-origin check, valid session, upload rate limit. */
export async function guardAdminUpload(request: Request): Promise<Guard> {
  if (!isSameOrigin(request)) return { error: json({ ok: false, error: 'Deze actie is niet toegestaan.' }, 403) };
  const ctx = await getCurrentSession();
  if (!ctx) return { error: json({ ok: false, error: 'Je bent uitgelogd. Log opnieuw in om verder te gaan.', loggedOut: true }, 401) };
  const limit = await consumeRateLimit(`upload:${ctx.user.id}`, 60, 10 * 60);
  if (!limit.ok)
    return { error: json({ ok: false, error: 'Je hebt veel foto’s achter elkaar geüpload. Wacht een paar minuten en probeer het opnieuw.' }, 429) };
  return { ctx };
}

export { json };
