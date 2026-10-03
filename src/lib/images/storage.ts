import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '@/lib/env';
import { randomToken } from '@/lib/security/crypto';

const KEY_RE = /^[A-Za-z0-9_-]{12,64}$/;
const FILE_RE = /^(?:\d{2,4}w\.webp|og\.jpg|menukaart\.pdf|(?:binnen|buiten)(?:kant|-[123])\.webp|voorkant(?:-onder)?\.webp)$/;

export function mediaRoot(): string {
  return path.resolve(env().MEDIA_DIR);
}

export function isValidKey(key: string): boolean {
  return KEY_RE.test(key);
}

export function isValidFileName(name: string): boolean {
  return FILE_RE.test(name);
}

function resolveSafe(key: string, name?: string): string {
  if (!isValidKey(key) || (name !== undefined && !isValidFileName(name))) throw new Error('Invalid media path');
  const root = mediaRoot();
  const full = name ? path.join(root, key, name) : path.join(root, key);
  if (!full.startsWith(root + path.sep)) throw new Error('Invalid media path');
  return full;
}

export function newStorageKey(): string {
  return randomToken(18);
}

/** Writes all files for a key atomically (temp directory + rename). */
export async function writeMediaFiles(key: string, files: Array<{ name: string; data: Buffer }>): Promise<void> {
  const target = resolveSafe(key);
  const temp = path.join(mediaRoot(), `.tmp-${key}`);
  await mkdir(temp, { recursive: true, mode: 0o750 });
  try {
    for (const file of files) {
      if (!isValidFileName(file.name)) throw new Error('Invalid media file name');
      await writeFile(path.join(temp, file.name), file.data, { mode: 0o640 });
    }
    await rename(temp, target);
  } catch (error) {
    await rm(temp, { recursive: true, force: true });
    throw error;
  }
}

export async function readMediaFile(key: string, name: string): Promise<Buffer | null> {
  try {
    return await readFile(resolveSafe(key, name));
  } catch {
    return null;
  }
}

export async function deleteMedia(key: string): Promise<void> {
  if (!isValidKey(key)) return;
  await rm(resolveSafe(key), { recursive: true, force: true });
}

export function mediaUrl(key: string, name: string): string {
  return `/media/${key}/${name}`;
}
