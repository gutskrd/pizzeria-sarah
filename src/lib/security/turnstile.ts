import { env } from '@/lib/env';

/** Verifies a Cloudflare Turnstile token server-side. Returns true when Turnstile is not configured. */
export async function verifyTurnstile(token: string | null, ip: string | null): Promise<boolean> {
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
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (error) {
    console.error('[turnstile] verification failed', error instanceof Error ? error.message : error);
    return false;
  }
}
