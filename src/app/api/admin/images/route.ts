import { imageUsageMap, nextImageSortOrder, toAdminImage } from '@/lib/admin/images';
import { guardAdminUpload, json } from '@/lib/admin/route-auth';
import { readUploadedFile } from '@/lib/admin/upload-file';
import { invalidatePublicContent } from '@/lib/content/cache';
import { db, schema } from '@/lib/db';
import { processImage } from '@/lib/images/process';
import { deleteMedia, newStorageKey, writeMediaFiles } from '@/lib/images/storage';
import { MAX_IMAGE_BYTES, UploadError, validateImageUpload } from '@/lib/images/validate';
import { logActivity } from '@/lib/security/events';

/** Upload a new photo. Every check happens here on the server. */
export async function POST(request: Request) {
  const guard = await guardAdminUpload(request);
  if (guard.error) return guard.error;
  const { ctx } = guard;

  let storageKey: string | null = null;
  try {
    const { file, buffer, form } = await readUploadedFile(request, MAX_IMAGE_BYTES);
    const kind = validateImageUpload(file, buffer.subarray(0, 32));
    const processed = await processImage(buffer, kind);

    storageKey = newStorageKey();
    await writeMediaFiles(storageKey, processed.files);

    const [settings] = await db().select({ name: schema.siteSettings.businessName }).from(schema.siteSettings).limit(1);
    const visible = form.get('visible') === '1';
    const [row] = await db()
      .insert(schema.images)
      .values({
        storageKey,
        title: '',
        altText: `Foto van ${settings?.name ?? 'Pizzeria Sarah'}`,
        width: processed.width,
        height: processed.height,
        variantWidths: processed.variantWidths,
        placeholder: processed.placeholder,
        bytes: processed.bytes,
        isVisible: visible,
        sortOrder: await nextImageSortOrder(),
      })
      .returning();

    await logActivity(ctx.user.id, 'fotos', 'Foto toegevoegd');
    invalidatePublicContent();
    const usage = await imageUsageMap();
    return json({ ok: true, data: toAdminImage(row!, usage.get(row!.id)), message: 'Foto toegevoegd.' }, 201);
  } catch (error) {
    if (storageKey) await deleteMedia(storageKey).catch(() => {});
    if (error instanceof UploadError) return json({ ok: false, error: error.message }, 400);
    console.error('[upload] failed', error);
    return json({ ok: false, error: 'Uploaden is niet gelukt. Probeer het opnieuw.' }, 500);
  }
}
