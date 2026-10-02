/** Server-side upload validation. Every rule here runs on the server; the browser checks are only a convenience. */

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_PDF_BYTES = 20 * 1024 * 1024;
export const MIN_IMAGE_SIDE = 200;
export const MAX_IMAGE_SIDE = 12_000;
export const MAX_IMAGE_PIXELS = 60_000_000;

export type ImageKind = 'jpeg' | 'png' | 'webp';

const EXTENSIONS: Record<string, ImageKind> = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', webp: 'webp' };
const MIME_TYPES: Record<string, ImageKind> = { 'image/jpeg': 'jpeg', 'image/jpg': 'jpeg', 'image/pjpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' };

export class UploadError extends Error {}

/** Detects the real file type from its first bytes ("magic numbers"). */
export function sniffImageType(buf: Buffer): ImageKind | 'heic' | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp' && /^(heic|heix|hevc|heim|heis|mif1|msf1)$/.test(buf.toString('ascii', 8, 12))) return 'heic';
  return null;
}

const HEIC_MESSAGE =
  "Deze foto is in het iPhone-formaat HEIC en kan niet worden gebruikt. Kies de foto opnieuw via 'Foto toevoegen' (je iPhone zet hem dan automatisch om), of stel op je iPhone bij Instellingen › Camera › Formaten 'Meest compatibel' in.";

/** Checks name, declared type, size and file signature. Returns the verified type. */
export function validateImageUpload(file: { name: string; type: string; size: number }, head: Buffer): ImageKind {
  if (file.size === 0) throw new UploadError('Dit bestand is leeg. Kies een andere foto.');
  if (file.size > MAX_IMAGE_BYTES) throw new UploadError('Deze foto is te groot (maximaal 15 MB). Kies een kleinere foto.');

  const sniffed = sniffImageType(head);
  if (sniffed === 'heic') throw new UploadError(HEIC_MESSAGE);

  const ext = file.name.toLowerCase().split('.').pop() ?? '';
  if (['heic', 'heif'].includes(ext)) throw new UploadError(HEIC_MESSAGE);
  const fromExt = EXTENSIONS[ext];
  const fromMime = MIME_TYPES[file.type.toLowerCase()];

  if (!sniffed || !fromExt || !fromMime) {
    throw new UploadError('Dit bestandstype wordt niet ondersteund. Kies een foto in JPG-, PNG- of WebP-formaat.');
  }
  if (sniffed !== fromExt || sniffed !== fromMime) {
    throw new UploadError('Dit bestand lijkt geen echte foto te zijn. Kies een foto in JPG-, PNG- of WebP-formaat.');
  }
  return sniffed;
}

export function validatePdfUpload(file: { name: string; type: string; size: number }, head: Buffer): void {
  if (file.size === 0) throw new UploadError('Dit bestand is leeg.');
  if (file.size > MAX_PDF_BYTES) throw new UploadError('Dit bestand is te groot (maximaal 20 MB).');
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext !== 'pdf' || file.type !== 'application/pdf' || head.toString('ascii', 0, 5) !== '%PDF-') {
    throw new UploadError('Kies een PDF-bestand.');
  }
}
