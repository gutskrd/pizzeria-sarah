import { NextResponse, type NextRequest } from 'next/server';
import { cookieNames, cookieOptions } from '@/lib/auth/cookies';
import { sessionCookieMaxAge, validateSessionToken } from '@/lib/auth/sessions';
import { requestInfoFromHeaders } from '@/lib/security/request-info';

/** Admin pages that are reachable without a session. */
const PUBLIC_ADMIN_PATHS = ['/admin/inloggen', '/admin/wachtwoord-vergeten', '/admin/wachtwoord-herstellen'];

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development';
  const https = (process.env.SITE_URL ?? '').startsWith('https://');
  const turnstile = 'https://challenges.cloudflare.com';
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${turnstile}${isDev ? " 'unsafe-eval'" : ''}`,
    // Inline style attributes are used for image aspect ratios and drag-and-drop.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' ${turnstile}`,
    `frame-src ${turnstile}`,
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    ...(https ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce);

  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  const isPublicAdmin = PUBLIC_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const names = cookieNames();

  let sessionCookie: { value: string; maxAge?: number } | null = null;

  // First line of defence for the admin panel. Every page, action and route
  // handler validates the session again on its own; this check only avoids
  // rendering anything for signed-out visitors and keeps sessions fresh.
  if (isAdmin && !isPublicAdmin) {
    const token = request.cookies.get(names.session)?.value;
    const validated = token
      ? await validateSessionToken(token, requestInfoFromHeaders(request.headers), { touch: true }).catch((error) => {
          console.error('[proxy] session check failed', error);
          return null;
        })
      : null;
    if (!validated) {
      const login = new URL('/admin/inloggen', request.url);
      if (pathname !== '/admin') login.searchParams.set('next', pathname);
      const redirect = NextResponse.redirect(login);
      if (token) redirect.cookies.delete(names.session);
      redirect.headers.set('Cache-Control', 'no-store');
      return redirect;
    }
    if (validated.newToken || validated.refreshCookie) {
      const value = validated.newToken ?? token!;
      sessionCookie = { value, maxAge: sessionCookieMaxAge(validated.session) };
      // Let the page we are about to render see the rotated token too.
      request.cookies.set(names.session, value);
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);
  requestHeaders.set('x-pathname', pathname + search);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  if (sessionCookie) response.cookies.set(names.session, sessionCookie.value, cookieOptions(sessionCookie.maxAge));
  if (isAdmin) {
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!api|media|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|robots.txt|sitemap.xml|manifest.webmanifest).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
