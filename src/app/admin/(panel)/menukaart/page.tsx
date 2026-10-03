import { asc, inArray } from 'drizzle-orm';
import { MenuEditor } from '@/components/admin/menu/menu-editor';
import { toPickedImage } from '@/lib/admin/images';
import type { AdminFolder, AdminMenuCategory } from '@/lib/admin/types';
import { requireAdmin } from '@/lib/auth/current';
import { db, schema } from '@/lib/db';
import { DEFAULT_FOLDER_CUTS } from '@/lib/db/schema';
import { mediaUrl } from '@/lib/images/storage';

export const metadata = { title: 'Menukaart – Beheer' };

export default async function AdminMenuPage({ searchParams }: { searchParams: Promise<{ gerecht?: string }> }) {
  await requireAdmin();
  const d = db();
  const [categories, items, settings] = await Promise.all([
    d.select().from(schema.menuCategories).orderBy(asc(schema.menuCategories.sortOrder), asc(schema.menuCategories.name)),
    d.select().from(schema.menuItems).orderBy(asc(schema.menuItems.sortOrder), asc(schema.menuItems.name)),
    d
      .select({
        key: schema.siteSettings.menuPdfKey,
        at: schema.siteSettings.menuPdfUpdatedAt,
        bytes: schema.siteSettings.menuPdfBytes,
        folderKey: schema.siteSettings.folderKey,
        folderHasInside: schema.siteSettings.folderHasInside,
        folderHasOutside: schema.siteSettings.folderHasOutside,
        folderCuts: schema.siteSettings.folderCuts,
        folderLabel: schema.siteSettings.folderLabel,
        folderVisible: schema.siteSettings.folderVisible,
        folderUpdatedAt: schema.siteSettings.folderUpdatedAt,
      })
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
  const folderKey = s?.folderKey ?? null;
  const folder: AdminFolder = {
    sheets: {
      binnen: folderKey && s?.folderHasInside ? mediaUrl(folderKey, 'binnenkant.webp') : null,
      buiten: folderKey && s?.folderHasOutside ? mediaUrl(folderKey, 'buitenkant.webp') : null,
    },
    cuts: s?.folderCuts ?? DEFAULT_FOLDER_CUTS,
    label: s?.folderLabel ?? '',
    visible: s?.folderVisible ?? true,
    updatedAt: folderKey ? (s?.folderUpdatedAt?.toISOString() ?? null) : null,
    version: folderKey ?? 'leeg',
  };
  const { gerecht } = await searchParams;
  return <MenuEditor categories={data} pdf={pdf} folder={folder} openItem={gerecht} />;
}
