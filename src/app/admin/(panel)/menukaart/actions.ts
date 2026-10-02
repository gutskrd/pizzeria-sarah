'use server';

import { and, eq, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { adminAction, UserError } from '@/lib/admin/action';
import { invalidatePublicContent } from '@/lib/content/cache';
import { db, schema } from '@/lib/db';
import { parsePrice } from '@/lib/format';
import { deleteMedia } from '@/lib/images/storage';
import { logActivity } from '@/lib/security/events';
import { slugify } from '@/lib/slug';

const id = z.uuid();

async function uniqueSlug(name: string, exceptId?: string): Promise<string> {
  const base = slugify(name);
  for (let n = 1; n < 100; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const where = exceptId ? and(eq(schema.menuCategories.slug, slug), ne(schema.menuCategories.id, exceptId)) : eq(schema.menuCategories.slug, slug);
    const [clash] = await db().select({ id: schema.menuCategories.id }).from(schema.menuCategories).where(where).limit(1);
    if (!clash) return slug;
  }
  return `${base}-${Date.now()}`;
}

const priceField = z
  .string()
  .trim()
  .max(20)
  .transform((value, ctx) => {
    const cents = parsePrice(value);
    if (cents !== null && Number.isNaN(cents)) {
      ctx.addIssue({ code: 'custom', message: 'Vul een geldige prijs in, bijvoorbeeld 12,50.' });
      return z.NEVER;
    }
    return cents;
  });

/* ───────────── Categorieën ───────────── */

const categoryInput = z.object({
  name: z.string().trim().min(1, 'Geef de categorie een naam.').max(80, 'De naam mag maximaal 80 tekens zijn.'),
  description: z.string().trim().max(300, 'De omschrijving mag maximaal 300 tekens zijn.'),
  isVisible: z.boolean(),
});

export const createCategory = adminAction(categoryInput, async (input, ctx) => {
  const [max] = await db()
    .select({ v: sql<number>`coalesce(max(${schema.menuCategories.sortOrder}), -1)::int` })
    .from(schema.menuCategories);
  await db()
    .insert(schema.menuCategories)
    .values({ ...input, slug: await uniqueSlug(input.name), sortOrder: (max?.v ?? -1) + 1 });
  await logActivity(ctx.user.id, 'menukaart', `Categorie toegevoegd: ${input.name}`);
  invalidatePublicContent();
  return { ok: true, message: 'Categorie toegevoegd.' };
});

export const updateCategory = adminAction(categoryInput.extend({ id }), async (input, ctx) => {
  const rows = await db()
    .update(schema.menuCategories)
    .set({ name: input.name, description: input.description, isVisible: input.isVisible, slug: await uniqueSlug(input.name, input.id), updatedAt: new Date() })
    .where(eq(schema.menuCategories.id, input.id))
    .returning({ id: schema.menuCategories.id });
  if (!rows.length) throw new UserError('Deze categorie bestaat niet meer. Vernieuw de pagina.');
  await logActivity(ctx.user.id, 'menukaart', `Categorie aangepast: ${input.name}`);
  invalidatePublicContent();
  return { ok: true, message: 'Wijzigingen opgeslagen.' };
});

export const setCategoryVisible = adminAction(z.object({ id, isVisible: z.boolean() }), async ({ id: categoryId, isVisible }, ctx) => {
  await db().update(schema.menuCategories).set({ isVisible, updatedAt: new Date() }).where(eq(schema.menuCategories.id, categoryId));
  await logActivity(ctx.user.id, 'menukaart', isVisible ? 'Categorie zichtbaar gemaakt' : 'Categorie verborgen');
  invalidatePublicContent();
  return { ok: true, message: isVisible ? 'Categorie staat weer op de menukaart.' : 'Categorie is verborgen op de menukaart.' };
});

export const deleteCategory = adminAction(z.object({ id }), async ({ id: categoryId }, ctx) => {
  const [row] = await db().delete(schema.menuCategories).where(eq(schema.menuCategories.id, categoryId)).returning({ name: schema.menuCategories.name });
  if (!row) throw new UserError('Deze categorie bestaat niet meer. Vernieuw de pagina.');
  await logActivity(ctx.user.id, 'menukaart', `Categorie verwijderd: ${row.name}`);
  invalidatePublicContent();
  return { ok: true, message: 'Categorie verwijderd.' };
});

export const reorderCategories = adminAction(z.object({ ids: z.array(id).min(1).max(200) }), async ({ ids }, ctx) => {
  await db().transaction(async (tx) => {
    for (const [i, categoryId] of ids.entries()) await tx.update(schema.menuCategories).set({ sortOrder: i }).where(eq(schema.menuCategories.id, categoryId));
  });
  await logActivity(ctx.user.id, 'menukaart', 'Volgorde van categorieën aangepast');
  invalidatePublicContent();
  return { ok: true, message: 'Volgorde opgeslagen.' };
});

/* ───────────── Gerechten ───────────── */

const itemInput = z.object({
  id: id.optional(),
  categoryId: id,
  number: z.string().trim().max(10, 'Het nummer mag maximaal 10 tekens zijn.'),
  name: z.string().trim().min(1, 'Geef het gerecht een naam.').max(120, 'De naam mag maximaal 120 tekens zijn.'),
  description: z.string().trim().max(600, 'De beschrijving mag maximaal 600 tekens zijn.'),
  price: priceField,
  variants: z
    .array(
      z.object({
        label: z.string().trim().min(1, 'Vul een naam in voor deze prijs, bijvoorbeeld Klein.').max(40, 'Maximaal 40 tekens.'),
        price: priceField.refine((v) => v !== null, 'Vul een prijs in.'),
      }),
    )
    .max(8, 'Maximaal 8 prijsvarianten.'),
  allergens: z.string().trim().max(400, 'Maximaal 400 tekens.'),
  imageId: id.nullable(),
  isVisible: z.boolean(),
  isFeatured: z.boolean(),
});

export const saveMenuItem = adminAction(itemInput, async (input, ctx) => {
  const [category] = await db()
    .select({ id: schema.menuCategories.id })
    .from(schema.menuCategories)
    .where(eq(schema.menuCategories.id, input.categoryId))
    .limit(1);
  if (!category) throw new UserError('Kies een categorie.', { categoryId: 'Kies een categorie.' });
  const values = {
    categoryId: input.categoryId,
    number: input.number,
    name: input.name,
    description: input.description,
    priceCents: input.price,
    allergens: input.allergens,
    imageId: input.imageId,
    isVisible: input.isVisible,
    isFeatured: input.isFeatured,
    updatedAt: new Date(),
  };
  await db().transaction(async (tx) => {
    let itemId = input.id;
    if (itemId) {
      const rows = await tx.update(schema.menuItems).set(values).where(eq(schema.menuItems.id, itemId)).returning({ id: schema.menuItems.id });
      if (!rows.length) throw new UserError('Dit gerecht bestaat niet meer. Vernieuw de pagina.');
      await tx.delete(schema.menuItemVariants).where(eq(schema.menuItemVariants.itemId, itemId));
    } else {
      const [max] = await tx
        .select({ v: sql<number>`coalesce(max(${schema.menuItems.sortOrder}), -1)::int` })
        .from(schema.menuItems)
        .where(eq(schema.menuItems.categoryId, input.categoryId));
      const [row] = await tx
        .insert(schema.menuItems)
        .values({ ...values, sortOrder: (max?.v ?? -1) + 1 })
        .returning({ id: schema.menuItems.id });
      itemId = row!.id;
    }
    if (input.variants.length) {
      await tx.insert(schema.menuItemVariants).values(input.variants.map((v, i) => ({ itemId: itemId!, label: v.label, priceCents: v.price!, sortOrder: i })));
    }
  });
  await logActivity(ctx.user.id, 'menukaart', input.id ? `Gerecht aangepast: ${input.name}` : `Gerecht toegevoegd: ${input.name}`);
  invalidatePublicContent();
  return { ok: true, message: input.id ? 'Wijzigingen opgeslagen.' : 'Gerecht toegevoegd.' };
});

export const setMenuItemFlags = adminAction(z.object({ id, isVisible: z.boolean().optional(), isFeatured: z.boolean().optional() }), async (input, ctx) => {
  const [row] = await db()
    .update(schema.menuItems)
    .set({
      ...(input.isVisible !== undefined ? { isVisible: input.isVisible } : {}),
      ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
      updatedAt: new Date(),
    })
    .where(eq(schema.menuItems.id, input.id))
    .returning({ name: schema.menuItems.name });
  if (!row) throw new UserError('Dit gerecht bestaat niet meer. Vernieuw de pagina.');
  const message =
    input.isVisible !== undefined
      ? input.isVisible
        ? `${row.name} staat weer op de menukaart.`
        : `${row.name} is verborgen op de menukaart.`
      : input.isFeatured
        ? `${row.name} wordt uitgelicht op de homepage.`
        : `${row.name} wordt niet meer uitgelicht.`;
  await logActivity(ctx.user.id, 'menukaart', message.replace(/\.$/, ''));
  invalidatePublicContent();
  return { ok: true, message };
});

export const deleteMenuItem = adminAction(z.object({ id }), async ({ id: itemId }, ctx) => {
  const [row] = await db().delete(schema.menuItems).where(eq(schema.menuItems.id, itemId)).returning({ name: schema.menuItems.name });
  if (!row) throw new UserError('Dit gerecht bestaat niet meer. Vernieuw de pagina.');
  await logActivity(ctx.user.id, 'menukaart', `Gerecht verwijderd: ${row.name}`);
  invalidatePublicContent();
  return { ok: true, message: 'Gerecht verwijderd.' };
});

export const reorderMenuItems = adminAction(z.object({ categoryId: id, ids: z.array(id).min(1).max(500) }), async ({ categoryId, ids }, ctx) => {
  await db().transaction(async (tx) => {
    for (const [i, itemId] of ids.entries()) {
      await tx
        .update(schema.menuItems)
        .set({ sortOrder: i })
        .where(and(eq(schema.menuItems.id, itemId), eq(schema.menuItems.categoryId, categoryId)));
    }
  });
  await logActivity(ctx.user.id, 'menukaart', 'Volgorde van gerechten aangepast');
  invalidatePublicContent();
  return { ok: true, message: 'Volgorde opgeslagen.' };
});

export const removeMenuPdf = adminAction(z.object({}), async (_input, ctx) => {
  const [row] = await db().select({ key: schema.siteSettings.menuPdfKey }).from(schema.siteSettings).limit(1);
  await db().update(schema.siteSettings).set({ menuPdfKey: null, menuPdfBytes: null, menuPdfUpdatedAt: null }).where(eq(schema.siteSettings.id, 1));
  if (row?.key) await deleteMedia(row.key).catch(() => {});
  await logActivity(ctx.user.id, 'menukaart', 'PDF-menukaart verwijderd');
  invalidatePublicContent();
  return { ok: true, message: 'PDF-menukaart verwijderd.' };
});
