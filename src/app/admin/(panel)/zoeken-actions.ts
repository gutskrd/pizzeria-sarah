'use server';

import { and, desc, eq, ilike, isNull, or } from 'drizzle-orm';
import { z } from 'zod';
import { adminAction } from '@/lib/admin/action';
import { toPickedImage } from '@/lib/admin/images';
import { db, schema } from '@/lib/db';
import { formatPrice } from '@/lib/format';

export type SearchResult = {
  id: string;
  group: 'Gerechten' | 'Categorieën' | 'Berichten' | "Foto's" | 'Aanbiedingen';
  title: string;
  detail: string;
  href: string;
  thumbUrl?: string;
};

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Search for the command palette (⌘K). */
export const adminSearch = adminAction(z.object({ q: z.string().trim().min(2).max(80) }), async ({ q }) => {
  const like = `%${escapeLike(q)}%`;
  const d = db();
  const [items, categories, messages, images, offers] = await Promise.all([
    d
      .select({
        id: schema.menuItems.id,
        name: schema.menuItems.name,
        number: schema.menuItems.number,
        price: schema.menuItems.priceCents,
        category: schema.menuCategories.name,
      })
      .from(schema.menuItems)
      .innerJoin(schema.menuCategories, eq(schema.menuCategories.id, schema.menuItems.categoryId))
      .where(or(ilike(schema.menuItems.name, like), ilike(schema.menuItems.description, like), eq(schema.menuItems.number, q)))
      .limit(6),
    d
      .select({ id: schema.menuCategories.id, name: schema.menuCategories.name })
      .from(schema.menuCategories)
      .where(ilike(schema.menuCategories.name, like))
      .limit(3),
    d
      .select({ id: schema.messages.id, name: schema.messages.name, subject: schema.messages.subject, status: schema.messages.status })
      .from(schema.messages)
      .where(or(ilike(schema.messages.name, like), ilike(schema.messages.email, like), ilike(schema.messages.subject, like), ilike(schema.messages.body, like)))
      .orderBy(desc(schema.messages.createdAt))
      .limit(5),
    d
      .select()
      .from(schema.images)
      .where(and(isNull(schema.images.deletedAt), or(ilike(schema.images.title, like), ilike(schema.images.altText, like), ilike(schema.images.caption, like))))
      .limit(5),
    d
      .select({ id: schema.offers.id, title: schema.offers.title, priceText: schema.offers.priceText })
      .from(schema.offers)
      .where(ilike(schema.offers.title, like))
      .limit(4),
  ]);

  const results: SearchResult[] = [
    ...items.map((i) => ({
      id: `item-${i.id}`,
      group: 'Gerechten' as const,
      title: `${i.number ? `${i.number}. ` : ''}${i.name}`,
      detail: [i.category, i.price !== null ? formatPrice(i.price) : null].filter(Boolean).join(' · '),
      href: `/admin/menukaart?gerecht=${i.id}`,
    })),
    ...categories.map((c) => ({
      id: `cat-${c.id}`,
      group: 'Categorieën' as const,
      title: c.name,
      detail: 'Categorie op de menukaart',
      href: `/admin/menukaart#categorie-${c.id}`,
    })),
    ...messages.map((m) => ({
      id: `msg-${m.id}`,
      group: 'Berichten' as const,
      title: m.subject,
      detail: `${m.name}${m.status === 'new' ? ' · nieuw' : ''}`,
      href: `/admin/berichten/${m.id}`,
    })),
    ...images.map((img) => ({
      id: `img-${img.id}`,
      group: "Foto's" as const,
      title: img.title || img.altText || 'Naamloze foto',
      detail: img.isVisible ? 'Zichtbaar in de galerij' : 'Verborgen',
      href: `/admin/fotos?foto=${img.id}`,
      thumbUrl: toPickedImage(img)?.thumbUrl,
    })),
    ...offers.map((o) => ({
      id: `offer-${o.id}`,
      group: 'Aanbiedingen' as const,
      title: o.title,
      detail: o.priceText || 'Aanbieding',
      href: `/admin/aanbiedingen?aanbieding=${o.id}`,
    })),
  ];
  return { ok: true, data: results };
});
