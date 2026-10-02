import sharp, { type Metadata } from 'sharp';
import { MAX_IMAGE_PIXELS, MAX_IMAGE_SIDE, MIN_IMAGE_SIDE, UploadError, type ImageKind } from './validate';

export const VARIANT_WIDTHS = [320, 480, 640, 960, 1280, 1600, 2048] as const;

export type ProcessedImage = {
  width: number;
  height: number;
  variantWidths: number[];
  placeholder: string;
  files: Array<{ name: string; data: Buffer }>;
  bytes: number;
};

sharp.cache(false);
sharp.concurrency(2);

/**
 * Decodes the upload with sharp (which also proves it is a real image),
 * applies EXIF orientation, strips all metadata (GPS location etc.) and
 * generates responsive WebP sizes plus a JPEG for social media previews.
 */
export async function processImage(input: Buffer, expected: ImageKind): Promise<ProcessedImage> {
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: MAX_IMAGE_PIXELS, failOn: 'error' }).metadata();
  } catch {
    throw new UploadError('Deze foto kon niet worden geopend. Misschien is het bestand beschadigd. Probeer een andere foto.');
  }
  if (meta.format !== expected) {
    throw new UploadError('Dit bestand lijkt geen echte foto te zijn. Kies een foto in JPG-, PNG- of WebP-formaat.');
  }
  const rotated = (meta.orientation ?? 1) >= 5;
  const width = rotated ? meta.height : meta.width;
  const height = rotated ? meta.width : meta.height;
  if (!width || !height) throw new UploadError('Deze foto kon niet worden geopend. Probeer een andere foto.');
  if (width < MIN_IMAGE_SIDE || height < MIN_IMAGE_SIDE) {
    throw new UploadError(`Deze foto is te klein (${width} × ${height} pixels). Kies een foto van minimaal ${MIN_IMAGE_SIDE} pixels breed en hoog.`);
  }
  if (width > MAX_IMAGE_SIDE || height > MAX_IMAGE_SIDE) {
    throw new UploadError('Deze foto is te groot in afmetingen. Kies een kleinere foto.');
  }

  const base = () => sharp(input, { limitInputPixels: MAX_IMAGE_PIXELS, failOn: 'error' }).rotate();

  let widths: number[] = VARIANT_WIDTHS.filter((w) => w <= width);
  if (widths.length === 0 || width - widths[widths.length - 1]! > 200) widths = [...widths, Math.min(width, 2048)];
  widths = [...new Set(widths)].sort((a, b) => a - b);

  const files: Array<{ name: string; data: Buffer }> = [];
  for (const w of widths) {
    const data = await base().resize({ width: w, withoutEnlargement: true }).webp({ quality: 80, effort: 4 }).toBuffer();
    files.push({ name: `${w}w.webp`, data });
  }
  const og = await base().resize({ width: 1200, height: 630, fit: 'cover', position: 'attention' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  files.push({ name: 'og.jpg', data: og });

  const tiny = await base().resize({ width: 24 }).webp({ quality: 40 }).toBuffer();
  const placeholder = `data:image/webp;base64,${tiny.toString('base64')}`;

  return {
    width,
    height,
    variantWidths: widths,
    placeholder,
    files,
    bytes: files.reduce((sum, f) => sum + f.data.length, 0),
  };
}
