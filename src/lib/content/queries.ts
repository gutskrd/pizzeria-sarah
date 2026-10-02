import { and, asc, desc, eq, gte, inArray, isNull, lte, or } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type { PageKey } from '@/lib/db/schema';
import { todayInAmsterdam } from '@/lib/format';
import { toPublicImage, type ImageRecord, type PublicImage } from '@/lib/images/public';
import { mediaUrl } from '@/lib/images/storage';
import { addDays, normalizeTime, type Schedule } from '@/lib/opening-hours';
import { cached } from './cache';

const imageColumns = {
  id: schema.images.id,
  storageKey: schema.images.storageKey,
  altText: schema.images.altText,
  caption: schema.images.caption,
  title: schema.images.title,
  width: schema.images.width,
  height: schema.images.height,
  variantWidths: schema.images.variantWidths,
  placeholder: schema.images.placeholder,
};

async function loadImages(ids: Array<string | null | undefined>): Promise<Map<string, PublicImage>> {
  const wanted = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (wanted.length === 0) return new Map();
  const rows = await db()
    .select(imageColumns)
    .from(schema.images)
    .where(and(inArray(schema.images.id, wanted), isNull(schema.images.deletedAt)));
  return new Map(rows.map((r: ImageRecord) => [r.id, toPublicImage(r)]));
}

export type SiteSettings = typeof schema.siteSettings.$inferSelect & {
  heroImage: PublicImage | null;
  aboutImage: PublicImage | null;
  menuPdfUrl: string | null;
  fullAddress: string;
  routeUrl: string | null;
};

export function getSettings(): Promise<SiteSettings> {
  return cached('settings', async () => {
    const [row] = await db().select().from(schema.siteSettings).where(eq(schema.siteSettings.id, 1)).limit(1);
    if (!row) throw new Error('site_settings row missing: run the seed script');
    const images = await loadImages([row.heroImageId, row.aboutImageId]);
    const fullAddress = [row.street, [row.postalCode, row.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    return {
      ...row,
      heroImage: row.heroImageId ? (images.get(row.heroImageId) ?? null) : null,
      aboutImage: row.aboutImageId ? (images.get(row.aboutImageId) ?? null) : null,
      menuPdfUrl: row.menuPdfKey ? mediaUrl(row.menuPdfKey, 'menukaart.pdf') : null,
      fullAddress,
      routeUrl: row.street ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${row.businessName}, ${fullAddress}`)}` : null,
    };
  });
}

export function getPageSeo(key: PageKey) {
  return cached(`seo:${key}`, async () => {
    const [row] = await db().select().from(schema.pageSeo).where(eq(schema.pageSeo.pageKey, key)).limit(1);
    return row ?? null;
  });
}

export function getSchedule(): Promise<Schedule> {
  return cached('schedule', async () => {
    const [days, periods, exceptions] = await Promise.all([
      db().select().from(schema.openingDays).orderBy(asc(schema.openingDays.weekday)),
      db().select().from(schema.openingPeriods).orderBy(asc(schema.openingPeriods.opensAt)),
      db()
        .select()
        .from(schema.openingExceptions)
        .where(gte(schema.openingExceptions.endsOn, addDays(todayInAmsterdam(), -1)))
        .orderBy(asc(schema.openingExceptions.startsOn)),
    ]);
    const exceptionPeriods = exceptions.length
      ? await db()
          .select()
          .from(schema.openingExceptionPeriods)
          .where(
            inArray(
              schema.openingExceptionPeriods.exceptionId,
              exceptions.map((e) => e.id),
            ),
          )
          .orderBy(asc(schema.openingExceptionPeriods.opensAt))
      : [];
    return {
      weekly: days.map((d) => ({
        weekday: d.weekday,
        note: d.note,
        periods: periods.filter((p) => p.weekday === d.weekday).map((p) => ({ opens: normalizeTime(p.opensAt), closes: normalizeTime(p.closesAt) })),
      })),
      exceptions: exceptions.map((e) => ({
        startsOn: e.startsOn,
        endsOn: e.endsOn,
        isClosed: e.isClosed,
        label: e.label,
        periods: exceptionPeriods.filter((p) => p.exceptionId === e.id).map((p) => ({ opens: normalizeTime(p.opensAt), closes: normalizeTime(p.closesAt) })),
      })),
    };
  });
}

export type PublicMenuItem = {
  id: string;
  number: string;
  name: string;
  description: string;
  priceCents: number | null;
  allergens: string;
  isFeatured: boolean;
  image: PublicImage | null;
  variants: Array<{ label: string; priceCents: number }>;
  categoryName: string;
};

export type PublicMenuCategory = { id: string; name: string; slug: string; description: string; items: PublicMenuItem[] };

export function getMenu(): Promise<PublicMenuCategory[]> {
  return cached('menu', async () => {
    const categories = await db()
      .select()
      .from(schema.menuCategories)
      .where(eq(schema.menuCategories.isVisible, true))
      .orderBy(asc(schema.menuCategories.sortOrder), asc(schema.menuCategories.name));
    if (categories.length === 0) return [];
    const items = await db()
      .select()
      .from(schema.menuItems)
      .where(
        and(
          eq(schema.menuItems.isVisible, true),
          inArray(
            schema.menuItems.categoryId,
            categories.map((c) => c.id),
          ),
        ),
      )
      .orderBy(asc(schema.menuItems.sortOrder), asc(schema.menuItems.name));
    const variants = items.length
      ? await db()
          .select()
          .from(schema.menuItemVariants)
          .where(
            inArray(
              schema.menuItemVariants.itemId,
              items.map((i) => i.id),
            ),
          )
          .orderBy(asc(schema.menuItemVariants.sortOrder))
      : [];
    const images = await loadImages(items.map((i) => i.imageId));
    return categories
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        items: items
          .filter((i) => i.categoryId === c.id)
          .map((i) => ({
            id: i.id,
            number: i.number,
            name: i.name,
            description: i.description,
            priceCents: i.priceCents,
            allergens: i.allergens,
            isFeatured: i.isFeatured,
            image: i.imageId ? (images.get(i.imageId) ?? null) : null,
            variants: variants.filter((v) => v.itemId === i.id).map((v) => ({ label: v.label, priceCents: v.priceCents })),
            categoryName: c.name,
          })),
      }))
      .filter((c) => c.items.length > 0);
  });
}

export async function getFeaturedMenuItems(limit = 6): Promise<PublicMenuItem[]> {
  const menu = await getMenu();
  return menu
    .flatMap((c) => c.items)
    .filter((i) => i.isFeatured)
    .slice(0, limit);
}

export function getGalleryImages(): Promise<Array<PublicImage & { isFeatured: boolean }>> {
  return cached('gallery', async () => {
    const rows = await db()
      .select({ ...imageColumns, isFeatured: schema.images.isFeatured })
      .from(schema.images)
      .where(and(isNull(schema.images.deletedAt), eq(schema.images.isVisible, true)))
      .orderBy(asc(schema.images.sortOrder), desc(schema.images.createdAt));
    return rows.map((r) => ({ ...toPublicImage(r), isFeatured: r.isFeatured }));
  });
}

/** Curated homepage selection: featured photos first, then the rest of the gallery. */
export async function getGalleryPreview(limit = 6): Promise<PublicImage[]> {
  const all = await getGalleryImages();
  const featured = all.filter((i) => i.isFeatured);
  return [...featured, ...all.filter((i) => !i.isFeatured)].slice(0, limit);
}

export function getHighlights() {
  return cached('highlights', () =>
    db().select().from(schema.highlights).where(eq(schema.highlights.isVisible, true)).orderBy(asc(schema.highlights.sortOrder)),
  );
}

export type PublicOffer = { id: string; title: string; description: string; priceText: string; endsOn: string | null; image: PublicImage | null };

export function getActiveOffers(): Promise<PublicOffer[]> {
  const today = todayInAmsterdam();
  return cached(`offers:${today}`, async () => {
    const rows = await db()
      .select()
      .from(schema.offers)
      .where(
        and(
          eq(schema.offers.isVisible, true),
          or(isNull(schema.offers.startsOn), lte(schema.offers.startsOn, today)),
          or(isNull(schema.offers.endsOn), gte(schema.offers.endsOn, today)),
        ),
      )
      .orderBy(asc(schema.offers.sortOrder), desc(schema.offers.createdAt));
    const images = await loadImages(rows.map((r) => r.imageId));
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      priceText: r.priceText,
      endsOn: r.endsOn,
      image: r.imageId ? (images.get(r.imageId) ?? null) : null,
    }));
  });
}
