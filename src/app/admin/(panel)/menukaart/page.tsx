import { asc, inArray } from 'drizzle-orm';
import { MenuEditor } from '@/components/admin/menu/menu-editor';
import { toPickedImage } from '@/lib/admin/images';
import type { AdminMenuCategory } from '@/lib/admin/types';
import { requireAdmin } from '@/lib/auth/current';
import { db, schema } from '@/lib/db';
import { mediaUrl } from '@/lib/images/storage';

export const metadata = { title: 'Menukaart – Beheer' };

export default async function AdminMenuPage() {
  await requireAdmin();
  const d = db();
  const [categories, items, settings] = await Promise.all([
    d.select().from(schema.menuCategories).orderBy(asc(schema.menuCategories.sortOrder), asc(schema.menuCategories.name)),
    d.select().from(schema.menuItems).orderBy(asc(schema.menuItems.sortOrder), asc(schema.menuItems.name)),
    d
      .select({ key: schema.siteSettings.menuPdfKey, at: schema.siteSettings.menuPdfUpdatedAt, bytes: schema.siteSettings.menuPdfBytes })
      .from(schema.siteSettings)
      .limit(1),
  ]);
  const itemIds = items.map((i) => i.id);
  const imageIds = items.map((i) => i.imageId).filter((x): x is string => Boolean(x));
  const [variants, images] = await Promise.all([
    itemIds.length
      ? d.select().from(schema.menuItemVariants).where(inArray(schema.menuItemVariants.itemId, itemIds)).orderBy(asc(schema.menuItemVariants.sortOrder))
      : [],
    imageIds.length ? d.select().from(schema.images).where(inArray(schema.images.id, imageIds)) : [],
  ]);
  const imageMap = new Map(images.map((img) => [img.id, toPickedImage(img)]));

  const data: AdminMenuCategory[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    isVisible: c.isVisible,
    items: items
      .filter((i) => i.categoryId === c.id)
      .map((i) => ({
        id: i.id,
        categoryId: i.categoryId,
        number: i.number,
        name: i.name,
        description: i.description,
        priceCents: i.priceCents,
        variants: variants.filter((v) => v.itemId === i.id).map((v) => ({ label: v.label, priceCents: v.priceCents })),
        allergens: i.allergens,
        image: i.imageId ? (imageMap.get(i.imageId) ?? null) : null,
        isVisible: i.isVisible,
        isFeatured: i.isFeatured,
      })),
  }));

  const s = settings[0];
  const pdf = s?.key && s.at ? { url: mediaUrl(s.key, 'menukaart.pdf'), updatedAt: s.at.toISOString(), bytes: s.bytes ?? 0 } : null;
  return <MenuEditor categories={data} pdf={pdf} />;
}
