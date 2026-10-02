import { and, eq, isNull } from 'drizzle-orm';
import { imageUsageMap, toAdminImage } from '@/lib/admin/images';
import { guardAdminUpload, json } from '@/lib/admin/route-auth';
import { readUploadedFile } from '@/lib/admin/upload-file';
import { invalidatePublicContent } from '@/lib/content/cache';
import { db, schema } from '@/lib/db';
import { processImage } from '@/lib/images/process';
import { deleteMedia, newStorageKey, writeMediaFiles } from '@/lib/images/storage';
import { MAX_IMAGE_BYTES, UploadError, validateImageUpload } from '@/lib/images/validate';
import { logActivity } from '@/lib/security/events';

/**
 * Replace the file behind an existing photo. The photo keeps its identity, so
 * everywhere it is used (homepage, menu item, offer, gallery position) stays intact.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardAdminUpload(request);
  if (guard.error) return guard.error;
  const { ctx } = guard;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ ok: false, error: 'Deze foto bestaat niet meer.' }, 404);

  let storageKey: string | null = null;
  try {
    const [existing] = await db()
      .select()
      .from(schema.images)
      .where(and(eq(schema.images.id, id), isNull(schema.images.deletedAt)))
      .limit(1);
    if (!existing) return json({ ok: false, error: 'Deze foto bestaat niet meer.' }, 404);

    const { file, buffer } = await readUploadedFile(request, MAX_IMAGE_BYTES);
    const kind = validateImageUpload(file, buffer.subarray(0, 32));
    const processed = await processImage(buffer, kind);

    storageKey = newStorageKey();
    await writeMediaFiles(storageKey, processed.files);

    const [row] = await db()
      .update(schema.images)
      .set({
        storageKey,
        width: processed.width,
        height: processed.height,
        variantWidths: processed.variantWidths,
        placeholder: processed.placeholder,
        bytes: processed.bytes,
        updatedAt: new Date(),
      })
      .where(eq(schema.images.id, id))
      .returning();
    storageKey = null;
    await deleteMedia(existing.storageKey).catch((e) => console.error('[replace] old files not removed', e));

    await logActivity(ctx.user.id, 'fotos', existing.title ? `Foto vervangen: ${existing.title}` : 'Foto vervangen');
    invalidatePublicContent();
    const usage = await imageUsageMap();
    return json({ ok: true, data: toAdminImage(row!, usage.get(row!.id)), message: 'Foto vervangen.' }, 200);
  } catch (error) {
    if (storageKey) await deleteMedia(storageKey).catch(() => {});
    if (error instanceof UploadError) return json({ ok: false, error: error.message }, 400);
    console.error('[replace] failed', error);
    return json({ ok: false, error: 'Vervangen is niet gelukt. Probeer het opnieuw.' }, 500);
  }
}
