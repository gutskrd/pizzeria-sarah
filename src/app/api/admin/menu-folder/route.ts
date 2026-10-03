import { rebuildFolder } from '@/lib/admin/folder';
import { guardAdminUpload, json } from '@/lib/admin/route-auth';
import { readUploadedFile } from '@/lib/admin/upload-file';
import { normalizeSheet } from '@/lib/images/folder';
import { MAX_IMAGE_BYTES, UploadError, validateImageUpload } from '@/lib/images/validate';
import { logActivity } from '@/lib/security/events';

/** Upload (or replace) one side of the printed folder: the inside or the outside. */
export async function POST(request: Request) {
  const guard = await guardAdminUpload(request);
  if (guard.error) return guard.error;
  try {
    const { file, buffer, form } = await readUploadedFile(request, MAX_IMAGE_BYTES);
    const side = form.get('side');
    if (side !== 'binnen' && side !== 'buiten') throw new UploadError('Kies of dit de binnenkant of de buitenkant is.');
    const kind = validateImageUpload(file, buffer.subarray(0, 32));
    const sheet = await normalizeSheet(buffer, kind);
    await rebuildFolder({ upload: { side, sheet } });
    const label = side === 'binnen' ? 'Binnenkant' : 'Buitenkant';
    await logActivity(guard.ctx.user.id, 'menukaart', `Folder: ${label.toLowerCase()} vervangen`);
    return json({ ok: true, data: null, message: `${label} van de folder opgeslagen. Controleer de vouwlijnen.` }, 200);
  } catch (error) {
    if (error instanceof UploadError) return json({ ok: false, error: error.message }, 400);
    console.error('[menu-folder] failed', error);
    return json({ ok: false, error: 'Uploaden is niet gelukt. Probeer het opnieuw.' }, 500);
  }
}
