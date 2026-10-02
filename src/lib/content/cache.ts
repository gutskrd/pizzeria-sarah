/**
 * Tiny in-process cache for public website content. The site runs as a single
 * Node.js process, so invalidating here after every admin change makes updates
 * visible immediately while keeping public pages fast.
 */
import { connection } from 'next/server';

type Entry = { value: unknown; expires: number };

const store = ((globalThis as unknown as { __contentCache?: Map<string, Entry> }).__contentCache ??= new Map());
const TTL_MS = 5 * 60 * 1000;

export async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  // Content is always read at request time, never while building.
  await connection();
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await load();
  store.set(key, { value, expires: Date.now() + TTL_MS });
  return value;
}

export function invalidatePublicContent(): void {
  store.clear();
}
