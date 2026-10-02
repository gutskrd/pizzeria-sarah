import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/env';

/** URL-safe random token with `bytes` bytes of entropy. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Tokens are only ever stored as SHA-256 hashes. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Keyed hash (HMAC-SHA256 with AUTH_SECRET), used for short secrets such as 6-digit codes. */
export function keyedHash(value: string, purpose: string): string {
  return createHmac('sha256', env().AUTH_SECRET).update(`${purpose}:${value}`).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Uniformly random 6-digit verification code. */
export function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** Signs a short payload (used for time-stamped form tokens). */
export function sign(payload: string): string {
  const mac = createHmac('sha256', env().AUTH_SECRET).update(`sig:${payload}`).digest('base64url');
  return `${payload}.${mac}`;
}

export function verifySigned(signed: string): string | null {
  const i = signed.lastIndexOf('.');
  if (i <= 0) return null;
  const payload = signed.slice(0, i);
  return safeEqual(sign(payload), signed) ? payload : null;
}

/** Time-stamped, signed token for public forms (used to detect instant bot submissions). */
export function issueFormToken(): string {
  return sign(String(Date.now()));
}
