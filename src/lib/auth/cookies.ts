import { siteUrl } from '@/lib/env';

export function isSecureSite(): boolean {
  return siteUrl().startsWith('https://');
}

/** `__Host-` cookies are bound to this exact host, HTTPS-only and path "/". */
export function cookieNames() {
  const prefix = isSecureSite() ? '__Host-' : '';
  return {
    session: `${prefix}ps_session`,
    device: `${prefix}ps_device`,
    challenge: `${prefix}ps_login`,
  } as const;
}

export type CookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
  maxAge?: number;
};

export function cookieOptions(maxAgeMs?: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isSecureSite(),
    sameSite: 'lax',
    path: '/',
    ...(maxAgeMs !== undefined ? { maxAge: Math.floor(maxAgeMs / 1000) } : {}),
  };
}
