import { headers } from 'next/headers';
import { env } from '@/lib/env';
import { parseUserAgent, type ClientDevice } from './user-agent';

export type RequestInfo = {
  ip: string | null;
  userAgent: string;
  device: ClientDevice;
  /** ISO 3166-1 alpha-2 country code, only when a trusted edge provides it. */
  country: string | null;
  region: string | null;
  city: string | null;
};

function clean(value: string | null, max = 80): string | null {
  if (!value) return null;
  const v = value.trim().slice(0, max);
  return v && v !== 'XX' && v !== 'T1' ? v : null;
}

function decodeHeader(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function requestInfoFromHeaders(h: Headers): RequestInfo {
  const cfg = env();
  const trustCf = cfg.TRUST_CLOUDFLARE_HEADERS === '1';
  const trustProxy = cfg.TRUST_PROXY_HEADERS === '1';

  let ip: string | null = null;
  if (trustCf) ip = clean(h.get('cf-connecting-ip'), 64);
  if (!ip && trustProxy) {
    const xff = h.get('x-forwarded-for');
    // Right-most entry is the one appended by our own reverse proxy.
    ip = clean(
      xff
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .at(-1) ?? null,
      64,
    );
  }
  if (!ip) ip = clean(h.get('x-real-ip'), 64);

  const userAgent = (h.get('user-agent') ?? '').slice(0, 400);
  return {
    ip,
    userAgent,
    device: parseUserAgent(userAgent),
    country: trustCf ? (clean(h.get('cf-ipcountry'), 2)?.toUpperCase() ?? null) : null,
    region: trustCf ? clean(decodeHeader(h.get('cf-region'))) : null,
    city: trustCf ? clean(decodeHeader(h.get('cf-ipcity'))) : null,
  };
}

export async function getRequestInfo(): Promise<RequestInfo> {
  return requestInfoFromHeaders(await headers());
}
