import 'server-only';
import { UploadError } from '@/lib/images/validate';

/** Reads the uploaded file from a multipart request, with friendly Dutch errors. */
export async function readUploadedFile(request: Request, maxBytes: number): Promise<{ file: File; buffer: Buffer; form: FormData }> {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > maxBytes + 1024 * 1024) throw new UploadError('Dit bestand is te groot. Kies een kleiner bestand.');
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new UploadError('Het bestand kon niet worden gelezen. Probeer het opnieuw.');
  }
  const file = form.get('file');
  if (!(file instanceof File)) throw new UploadError('Kies eerst een bestand.');
  if (file.size > maxBytes) throw new UploadError('Dit bestand is te groot. Kies een kleiner bestand.');
  return { file, buffer: Buffer.from(await file.arrayBuffer()), form };
}
