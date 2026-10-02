import { eq } from 'drizzle-orm';
import { guardAdminUpload, json } from '@/lib/admin/route-auth';
import { readUploadedFile } from '@/lib/admin/upload-file';
import { invalidatePublicContent } from '@/lib/content/cache';
import { db, schema } from '@/lib/db';
import { deleteMedia, newStorageKey, writeMediaFiles } from '@/lib/images/storage';
import { MAX_PDF_BYTES, UploadError, validatePdfUpload } from '@/lib/images/validate';
import { logActivity } from '@/lib/security/events';

/** Upload (or replace) the downloadable PDF version of the menu. */
export async function POST(request: Request) {
  const guard = await guardAdminUpload(request);
  if (guard.error) return guard.error;
  let key: string | null = null;
  try {
    const { file, buffer } = await readUploadedFile(request, MAX_PDF_BYTES);
    validatePdfUpload(file, buffer.subarray(0, 8));
    key = newStorageKey();
    await writeMediaFiles(key, [{ name: 'menukaart.pdf', data: buffer }]);
    const [old] = await db().select({ key: schema.siteSettings.menuPdfKey }).from(schema.siteSettings).limit(1);
    await db()
      .update(schema.siteSettings)
      .set({ menuPdfKey: key, menuPdfBytes: buffer.length, menuPdfUpdatedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.siteSettings.id, 1));
    key = null;
    if (old?.key) await deleteMedia(old.key).catch(() => {});
    await logActivity(guard.ctx.user.id, 'menukaart', 'Menukaart (PDF) bijgewerkt');
    invalidatePublicContent();
    return json({ ok: true, data: null, message: 'PDF-menukaart opgeslagen.' }, 200);
  } catch (error) {
    if (key) await deleteMedia(key).catch(() => {});
    if (error instanceof UploadError) return json({ ok: false, error: error.message }, 400);
    console.error('[menu-pdf] failed', error);
    return json({ ok: false, error: 'Uploaden is niet gelukt. Probeer het opnieuw.' }, 500);
  }
}
