import 'server-only';
import { eq } from 'drizzle-orm';
import { invalidatePublicContent } from '@/lib/content/cache';
import { db, schema } from '@/lib/db';
import type { FolderCuts } from '@/lib/db/schema';
import { detectCuts, FOLDER_SIDES, renderPanels, sheetFileName, type FolderSide } from '@/lib/images/folder';
import { deleteMedia, newStorageKey, readMediaFile, writeMediaFiles } from '@/lib/images/storage';

// Changes are processed one at a time, so two uploads at once cannot overwrite each other.
let queue: Promise<unknown> = Promise.resolve();
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.catch(() => null);
  return next;
}

/**
 * Stores a new version of the folder: the sheets (a new upload replaces one
 * side) and the panels cut at the fold lines. Every version gets a fresh file
 * key, so visitors never see half-updated images; the old files are removed.
 */
export function rebuildFolder(change: { upload?: { side: FolderSide; sheet: Buffer }; cuts?: FolderCuts }): Promise<void> {
  return exclusive(async () => {
    const [row] = await db()
      .select({
        key: schema.siteSettings.folderKey,
        hasInside: schema.siteSettings.folderHasInside,
        hasOutside: schema.siteSettings.folderHasOutside,
        cuts: schema.siteSettings.folderCuts,
      })
      .from(schema.siteSettings)
      .where(eq(schema.siteSettings.id, 1))
      .limit(1);
    if (!row) throw new Error('site_settings row missing');

    const has = { binnen: row.hasInside, buiten: row.hasOutside };
    const sheets: Partial<Record<FolderSide, Buffer>> = {};
    for (const side of FOLDER_SIDES) {
      if (change.upload?.side === side) sheets[side] = change.upload.sheet;
      else if (row.key && has[side]) sheets[side] = (await readMediaFile(row.key, sheetFileName(side))) ?? undefined;
    }
    const cuts: FolderCuts = { ...row.cuts, ...change.cuts };
    if (change.upload) cuts[change.upload.side] = await detectCuts(change.upload.sheet);

    const files = FOLDER_SIDES.flatMap((side) => (sheets[side] ? [{ name: sheetFileName(side), data: sheets[side] }] : []));
    let panelSize: { panelWidth: number; panelHeight: number } | null = null;
    if (sheets.binnen && sheets.buiten) {
      const rendered = await renderPanels({ binnen: sheets.binnen, buiten: sheets.buiten }, cuts);
      files.push(...rendered.files);
      panelSize = { panelWidth: rendered.panelWidth, panelHeight: rendered.panelHeight };
    }

    const key = newStorageKey();
    await writeMediaFiles(key, files);
    try {
      await db()
        .update(schema.siteSettings)
        .set({
          folderKey: key,
          folderHasInside: Boolean(sheets.binnen),
          folderHasOutside: Boolean(sheets.buiten),
          folderCuts: cuts,
          folderPanelWidth: panelSize?.panelWidth ?? null,
          folderPanelHeight: panelSize?.panelHeight ?? null,
          folderUpdatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.siteSettings.id, 1));
    } catch (error) {
      await deleteMedia(key).catch(() => {});
      throw error;
    }
    if (row.key) await deleteMedia(row.key).catch(() => {});
    invalidatePublicContent();
  });
}

export function removeFolderFiles(): Promise<void> {
  return exclusive(async () => {
    const [row] = await db().select({ key: schema.siteSettings.folderKey }).from(schema.siteSettings).limit(1);
    await db()
      .update(schema.siteSettings)
      .set({
        folderKey: null,
        folderHasInside: false,
        folderHasOutside: false,
        folderPanelWidth: null,
        folderPanelHeight: null,
        folderUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.siteSettings.id, 1));
    if (row?.key) await deleteMedia(row.key).catch(() => {});
    invalidatePublicContent();
  });
}
