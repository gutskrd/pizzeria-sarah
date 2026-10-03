import { env, siteUrl } from '@/lib/env';

const bareHost = (h: string) => h.toLowerCase().replace(/^www\./, '');

/**
 * Verifies a Cloudflare Turnstile token server-side (never in the browser).
 * Also checks that the token was made on this website and for this form.
 * Returns true when Turnstile is not configured.
 */
export async function verifyTurnstile(token: string | null, ip: string | null, action?: string): Promise<boolean> {
  const secret = env().TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json()) as { success?: boolean; hostname?: string; action?: string };
    if (data.success !== true) return false;
    if (data.hostname && bareHost(data.hostname) !== bareHost(new URL(siteUrl()).hostname)) return false;
    if (action && data.action && data.action !== action) return false;
    return true;
  } catch (error) {
    console.error('[turnstile] verification failed', error instanceof Error ? error.message : error);
    return false;
  }
}
