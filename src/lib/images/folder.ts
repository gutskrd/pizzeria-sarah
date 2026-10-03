import sharp, { type Metadata } from 'sharp';
import type { FolderCuts } from '@/lib/db/schema';
import { MAX_IMAGE_PIXELS, UploadError, type ImageKind } from './validate';

/**
 * The printed trifold menu ("folder"). The owner uploads both sides of the
 * sheet as a landscape image; each side is cut at its two fold lines into three
 * panels, which the website folds open in 3D.
 */

export type FolderSide = 'binnen' | 'buiten';
export const FOLDER_SIDES: FolderSide[] = ['binnen', 'buiten'];

/** Full sheet, also used for "Vergroten" on the website. */
export const sheetFileName = (side: FolderSide) => `${side}kant.webp`;
export const panelFileName = (side: FolderSide, n: 1 | 2 | 3) => `${side}-${n}.webp`;
/** Small cover images (twice the size shown on the page). */
export const COVER_FILE = 'voorkant.webp';
export const COVER_UNDER_FILE = 'voorkant-onder.webp';
const COVER_WIDTH = 480;

const MAX_SHEET_WIDTH = 2400;
const MAX_PANEL_HEIGHT = 1400;
export const MIN_CUT = 0.15;
export const MAX_CUT = 0.85;
export const MIN_PANEL = 0.15;

export function validCuts([a, b]: [number, number]): boolean {
  return a >= MIN_CUT && b <= MAX_CUT && b - a >= MIN_PANEL && a >= MIN_PANEL && 1 - b >= MIN_PANEL;
}

/** Decodes an uploaded sheet, checks it, strips metadata and stores it as WebP. */
export async function normalizeSheet(input: Buffer, expected: ImageKind): Promise<Buffer> {
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: MAX_IMAGE_PIXELS, failOn: 'error' }).metadata();
  } catch {
    throw new UploadError('Deze afbeelding kon niet worden geopend. Misschien is het bestand beschadigd. Probeer een andere.');
  }
  if (meta.format !== expected) throw new UploadError('Dit bestand lijkt geen echte afbeelding te zijn. Kies een JPG-, PNG- of WebP-bestand.');
  const rotated = (meta.orientation ?? 1) >= 5;
  const width = (rotated ? meta.height : meta.width) ?? 0;
  const height = (rotated ? meta.width : meta.height) ?? 0;
  if (width < 600 || height < 300) {
    throw new UploadError(`Deze afbeelding is te klein (${width} × ${height} pixels). Kies een afbeelding van minimaal 600 pixels breed.`);
  }
  if (width <= height) {
    throw new UploadError('Kies een liggende afbeelding van de hele open folder: alle drie de delen naast elkaar.');
  }
  const upright = await sharp(input, { limitInputPixels: MAX_IMAGE_PIXELS, failOn: 'error' }).rotate().flatten({ background: '#000000' }).toBuffer();
  return sharpenSheet(upright);
}

/** Below this width a sheet is enlarged (with sharpening), so the text in the folder stays crisp on screen. */
export const SHARP_SHEET_WIDTH = 1800;

/**
 * Stores a sheet at a good size for the website: large sheets are reduced,
 * small ones (such as a screenshot of the menu) are enlarged with a
 * high-quality filter and sharpened so letters keep clean edges.
 */
export async function sharpenSheet(sheet: Buffer): Promise<Buffer> {
  const meta = await sharp(sheet).metadata();
  // Shave a hair off every edge: screenshots and scans often have a thin light border.
  const edge = Math.max(1, Math.round((meta.width ?? 0) * 0.0025));
  const width = (meta.width ?? 0) - edge * 2;
  const image = sharp(sheet, { limitInputPixels: MAX_IMAGE_PIXELS }).extract({
    left: edge,
    top: edge,
    width,
    height: (meta.height ?? 0) - edge * 2,
  });
  if (width < SHARP_SHEET_WIDTH) {
    const target = Math.min(MAX_SHEET_WIDTH, Math.max(SHARP_SHEET_WIDTH, width * 2));
    image.resize({ width: target, kernel: 'lanczos3' }).sharpen({ sigma: 1.1, m1: 0.6, m2: 2.2 });
  } else {
    image.resize({ width: MAX_SHEET_WIDTH, withoutEnlargement: true });
  }
  return image.webp({ quality: 92, effort: 4 }).toBuffer();
}

/**
 * Finds the fold lines: on a printed folder there is usually a plain strip
 * (a margin) along each fold. Looks for the calmest columns near 1/3 and 2/3
 * of the width; falls back to exact thirds.
 */
export async function detectCuts(sheet: Buffer): Promise<[number, number]> {
  const width = 600;
  const { data, info } = await sharp(sheet).resize({ width }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  // Activity per column: how much the brightness changes from pixel to pixel.
  const activity = new Float64Array(w);
  for (let x = 1; x < w; x++) {
    let sum = 0;
    for (let y = 0; y < h; y++) sum += Math.abs(data[y * w + x]! - data[y * w + x - 1]!) + (y > 0 ? Math.abs(data[y * w + x]! - data[(y - 1) * w + x]!) : 0);
    activity[x] = sum / h;
  }
  const smooth = (x: number) => (activity[x - 1]! + activity[x]! + activity[x + 1]!) / 3;
  const find = (target: number): number => {
    const from = Math.max(2, Math.round(w * (target - 0.06)));
    const to = Math.min(w - 3, Math.round(w * (target + 0.06)));
    let min = Infinity;
    for (let x = from; x <= to; x++) min = Math.min(min, smooth(x));
    // The widest calm strip wins; a narrow gap between two columns of text does not.
    const limit = min + 4;
    let best = { width: 0, center: w * target };
    let runStart = -1;
    for (let x = from; x <= to + 1; x++) {
      const calm = x <= to && smooth(x) <= limit;
      if (calm && runStart < 0) runStart = x;
      if (!calm && runStart >= 0) {
        const run = { width: x - runStart, center: (runStart + x - 1) / 2 };
        const closer = Math.abs(run.center - w * target) < Math.abs(best.center - w * target);
        if (run.width > best.width + 2 || (Math.abs(run.width - best.width) <= 2 && closer)) best = run;
        runStart = -1;
      }
    }
    return best.center / w;
  };
  const cuts: [number, number] = [find(1 / 3), find(2 / 3)];
  return validCuts(cuts) ? cuts : [1 / 3, 2 / 3];
}

export type RenderedFolder = { files: Array<{ name: string; data: Buffer }>; panelWidth: number; panelHeight: number };

/** Cuts both sheets into three panels each, all at the same size. */
export async function renderPanels(sheets: Record<FolderSide, Buffer>, cuts: FolderCuts): Promise<RenderedFolder> {
  const metas = await Promise.all(FOLDER_SIDES.map(async (side) => ({ side, meta: await sharp(sheets[side]).metadata() })));
  const sizes = metas.map(({ side, meta }) => {
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    const [a, b] = cuts[side];
    const xs = [0, Math.round(a * w), Math.round(b * w), w];
    return { side, w, h, xs };
  });
  const panelHeight = Math.min(MAX_PANEL_HEIGHT, ...sizes.map((s) => s.h));
  const ratios = sizes.flatMap((s) => [0, 1, 2].map((i) => (s.xs[i + 1]! - s.xs[i]!) / s.h));
  const panelWidth = Math.round(panelHeight * (ratios.reduce((x, y) => x + y, 0) / ratios.length));

  const files: RenderedFolder['files'] = [];
  for (const s of sizes) {
    for (const i of [0, 1, 2] as const) {
      const data = await sharp(sheets[s.side])
        .extract({ left: s.xs[i]!, top: 0, width: s.xs[i + 1]! - s.xs[i]!, height: s.h })
        .resize(panelWidth, panelHeight, { fit: 'fill' })
        .webp({ quality: 88, effort: 4 })
        .toBuffer();
      files.push({ name: panelFileName(s.side, (i + 1) as 1 | 2 | 3), data });
      // Small versions of the cover and the flap under it, for the folded flyer on the page.
      if (s.side === 'buiten' && (i === 2 || i === 0)) {
        const small = await sharp(data).resize({ width: COVER_WIDTH }).webp({ quality: 85, effort: 4 }).toBuffer();
        files.push({ name: i === 2 ? COVER_FILE : COVER_UNDER_FILE, data: small });
      }
    }
  }
  return { files, panelWidth, panelHeight };
}
