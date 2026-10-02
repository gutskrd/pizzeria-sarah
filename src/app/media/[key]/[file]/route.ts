import { isValidFileName, isValidKey, readMediaFile } from '@/lib/images/storage';

const TYPES: Record<string, string> = { webp: 'image/webp', jpg: 'image/jpeg', pdf: 'application/pdf' };

/**
 * Serves generated media files. File names are random and never reused, so
 * responses can be cached forever. (In production Caddy serves these files
 * directly; this route is the fallback.)
 */
export async function GET(_request: Request, { params }: { params: Promise<{ key: string; file: string }> }) {
  const { key, file } = await params;
  if (!isValidKey(key) || !isValidFileName(file)) return new Response('Niet gevonden', { status: 404 });
  const data = await readMediaFile(key, file);
  if (!data) return new Response('Niet gevonden', { status: 404 });
  const ext = file.split('.').pop() ?? '';
  const headers: Record<string, string> = {
    'Content-Type': TYPES[ext] ?? 'application/octet-stream',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  };
  if (ext === 'pdf') headers['Content-Disposition'] = 'inline; filename="menukaart.pdf"';
  return new Response(new Uint8Array(data), { headers });
}
