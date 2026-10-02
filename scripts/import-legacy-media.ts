/**
 * Imports the existing photos (and optionally the PDF menu) from the old
 * WordPress website into the new photo library.
 *
 *   npm run media:import-legacy             # import photos
 *   npm run media:import-legacy -- --pdf    # also use the newest PDF as the downloadable menu
 *   npm run media:import-legacy -- --dry-run
 *
 * Every file goes through exactly the same checks and processing as an upload
 * in the admin panel (file signature, size, dimensions, metadata removal,
 * responsive sizes). Photos of the restaurant are imported as visible in the
 * gallery; screenshots and menu photos are imported hidden, so the owner can
 * decide what to show. Already imported files are skipped.
 *
 * Needs DATABASE_URL, AUTH_SECRET and MEDIA_DIR in the environment.
 */
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/lib/db/schema';
import { processImage } from '../src/lib/images/process';
import { newStorageKey, writeMediaFiles } from '../src/lib/images/storage';
import { MAX_PDF_BYTES, validateImageUpload, validatePdfUpload } from '../src/lib/images/validate';

const BASE = 'https://pizzaria-sarah.nl/wp-content/uploads';

const PHOTOS: Array<{ path: string; title: string; visible: boolean }> = [
  { path: '2024/02/20240229_183702.jpg', title: 'Oude website – foto 1', visible: true },
  { path: '2024/02/20240229_183658.jpg', title: 'Oude website – foto 2', visible: true },
  { path: '2024/02/20240229_183844.jpg', title: 'Oude website – foto 3', visible: true },
  { path: '2024/02/20240229_183842.jpg', title: 'Oude website – foto 4', visible: true },
  { path: '2024/02/20240229_183832.jpg', title: 'Oude website – foto 5', visible: true },
  { path: '2024/02/20240229_183750.jpg', title: 'Oude website – foto 6', visible: true },
  { path: '2024/02/20240229_183738.jpg', title: 'Oude website – foto 7', visible: true },
  { path: '2024/02/20230928_163643.jpg', title: 'Oude website – foto 8', visible: true },
  { path: '2024/02/20240229_180257.jpg', title: 'Oude website – foto 9', visible: true },
  // Screenshots and menu photos: imported hidden.
  { path: '2025/12/Schermafbeelding-2025-11-14-154647.png', title: 'Oude website – schermafbeelding 1', visible: false },
  { path: '2025/12/Schermafbeelding-.png', title: 'Oude website – schermafbeelding 2', visible: false },
  { path: '2025/11/IMG-20251106-WA0011-768x1024.jpg', title: 'Oude website – menukaart (foto)', visible: false },
];

const PDFS = ['2025/11/menu-2025-nieuwe-fotos.pdf', '2025/11/menu-2025-modern-3.pdf'];

const dryRun = process.argv.includes('--dry-run');
const withPdf = process.argv.includes('--pdf');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL ontbreekt.');
  process.exit(1);
}

async function download(path: string, maxBytes: number): Promise<{ buffer: Buffer; type: string }> {
  const res = await fetch(`${BASE}/${path}`, { signal: AbortSignal.timeout(60_000), redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const length = Number(res.headers.get('content-length') ?? 0);
  if (length > maxBytes) throw new Error('bestand te groot');
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > maxBytes) throw new Error('bestand te groot');
  return { buffer, type: (res.headers.get('content-type') ?? '').split(';')[0]!.trim() };
}

const client = postgres(url, { max: 1, onnotice: () => {} });
const db = drizzle(client, { schema });

const [settings] = await db.select().from(schema.siteSettings).limit(1);
const businessName = settings?.businessName ?? 'Pizzeria Sarah';
const [orderRow] = await client`select coalesce(max(sort_order), -1)::int + 1 as next from images`;
let next = Number(orderRow?.next ?? 0);

let imported = 0;
for (const photo of PHOTOS) {
  const name = photo.path.split('/').pop()!;
  const [existing] = await db.select({ id: schema.images.id }).from(schema.images).where(eq(schema.images.title, photo.title)).limit(1);
  if (existing) {
    console.log(`– ${name}: al geïmporteerd`);
    continue;
  }
  try {
    const { buffer, type } = await download(photo.path, 15 * 1024 * 1024);
    const kind = validateImageUpload({ name, type, size: buffer.length }, buffer.subarray(0, 32));
    const processed = await processImage(buffer, kind);
    if (dryRun) {
      console.log(`✓ ${name}: ${processed.width} × ${processed.height} (proefrun)`);
      continue;
    }
    const key = newStorageKey();
    await writeMediaFiles(key, processed.files);
    await db.insert(schema.images).values({
      storageKey: key,
      title: photo.title,
      altText: `Foto van ${businessName}`,
      width: processed.width,
      height: processed.height,
      variantWidths: processed.variantWidths,
      placeholder: processed.placeholder,
      bytes: processed.bytes,
      isVisible: photo.visible,
      sortOrder: next++,
    });
    imported++;
    console.log(`✓ ${name}: geïmporteerd${photo.visible ? '' : ' (verborgen)'}`);
  } catch (error) {
    console.error(`✗ ${name}: ${error instanceof Error ? error.message : error}`);
  }
}

if (withPdf && !dryRun) {
  for (const path of PDFS) {
    const name = path.split('/').pop()!;
    try {
      const { buffer } = await download(path, MAX_PDF_BYTES);
      validatePdfUpload({ name, type: 'application/pdf', size: buffer.length }, buffer.subarray(0, 8));
      const key = newStorageKey();
      await writeMediaFiles(key, [{ name: 'menukaart.pdf', data: buffer }]);
      await db
        .update(schema.siteSettings)
        .set({ menuPdfKey: key, menuPdfBytes: buffer.length, menuPdfUpdatedAt: new Date() })
        .where(eq(schema.siteSettings.id, 1));
      console.log(`✓ ${name}: ingesteld als PDF-menukaart`);
      break;
    } catch (error) {
      console.error(`✗ ${name}: ${error instanceof Error ? error.message : error}`);
    }
  }
}

console.log(`\nKlaar: ${imported} foto('s) geïmporteerd. Vul in het beheer bij Foto's per foto een goede beschrijving in.`);
await client.end();
