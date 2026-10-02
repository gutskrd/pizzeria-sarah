import 'server-only';
import { asc, desc, isNotNull, isNull, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { mediaUrl } from '@/lib/images/storage';
import type { AdminImage, ImageUsage } from './types';

type ImageRow = typeof schema.images.$inferSelect;

function pickWidth(widths: number[], target: number): number {
  const sorted = [...widths].sort((a, b) => a - b);
  return sorted.find((w) => w >= target) ?? sorted.at(-1)!;
}

/** Where every image is used on the website, in words the owner understands. */
export async function imageUsageMap(): Promise<Map<string, ImageUsage[]>> {
  const d = db();
  const [settings, items, offers] = await Promise.all([
    d.select({ hero: schema.siteSettings.heroImageId, about: schema.siteSettings.aboutImageId }).from(schema.siteSettings).limit(1),
    d.select({ imageId: schema.menuItems.imageId, name: schema.menuItems.name }).from(schema.menuItems).where(isNotNull(schema.menuItems.imageId)),
    d.select({ imageId: schema.offers.imageId, title: schema.offers.title }).from(schema.offers).where(isNotNull(schema.offers.imageId)),
  ]);
  const map = new Map<string, ImageUsage[]>();
  const add = (id: string | null, usage: ImageUsage) => {
    if (!id) return;
    map.set(id, [...(map.get(id) ?? []), usage]);
  };
  add(settings[0]?.hero ?? null, { label: 'Hoofdfoto van de homepage', critical: true, href: '/admin/website#hoofdfoto' });
  add(settings[0]?.about ?? null, { label: "Foto bij 'Over ons'", critical: true, href: '/admin/website#over-ons' });
  for (const item of items) add(item.imageId, { label: `Menukaart: ${item.name}`, critical: false, href: '/admin/menukaart' });
  for (const offer of offers) add(offer.imageId, { label: `Aanbieding: ${offer.title}`, critical: false, href: '/admin/aanbiedingen' });
  return map;
}

export function toAdminImage(row: ImageRow, usages: ImageUsage[] = []): AdminImage {
  const all = [...usages];
  if (row.isVisible && !row.deletedAt) all.push({ label: 'Galerij', critical: false, href: '/galerij' });
  if (row.isFeatured && row.isVisible && !row.deletedAt) all.push({ label: 'Uitgelicht op de homepage', critical: false });
  return {
    id: row.id,
    thumbUrl: mediaUrl(row.storageKey, `${pickWidth(row.variantWidths, 480)}w.webp`),
    previewUrl: mediaUrl(row.storageKey, `${pickWidth(row.variantWidths, 1280)}w.webp`),
    title: row.title,
    altText: row.altText,
    caption: row.caption,
    isVisible: row.isVisible,
    isFeatured: row.isFeatured,
    width: row.width,
    height: row.height,
    createdAt: row.createdAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
    placeholder: row.placeholder,
    usages: all,
  };
}

export async function listAdminImages(opts: { trash?: boolean } = {}): Promise<AdminImage[]> {
  const [rows, usage] = await Promise.all([
    db()
      .select()
      .from(schema.images)
      .where(opts.trash ? isNotNull(schema.images.deletedAt) : isNull(schema.images.deletedAt))
      .orderBy(opts.trash ? desc(schema.images.deletedAt) : asc(schema.images.sortOrder), desc(schema.images.createdAt)),
    imageUsageMap(),
  ]);
  return rows.map((r) => toAdminImage(r, usage.get(r.id)));
}

export async function nextImageSortOrder(): Promise<number> {
  const [row] = await db()
    .select({ max: sql<number>`coalesce(max(${schema.images.sortOrder}), -1)::int` })
    .from(schema.images);
  return (row?.max ?? -1) + 1;
}

/** Compact reference used by photo pickers (menu items, offers, homepage photo). */
export function toPickedImage(row: ImageRow | undefined | null): { id: string; thumbUrl: string; title: string } | null {
  if (!row || row.deletedAt) return null;
  return { id: row.id, title: row.title || row.altText, thumbUrl: mediaUrl(row.storageKey, `${pickWidth(row.variantWidths, 480)}w.webp`) };
}
