'use server';

import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { adminAction, UserError } from '@/lib/admin/action';
import { imageUsageMap } from '@/lib/admin/images';
import { invalidatePublicContent } from '@/lib/content/cache';
import { db, schema } from '@/lib/db';
import { deleteMedia } from '@/lib/images/storage';
import { logActivity } from '@/lib/security/events';

const id = z.uuid();

async function getImage(imageId: string, trashed = false) {
  const [row] = await db()
    .select()
    .from(schema.images)
    .where(and(eq(schema.images.id, imageId), trashed ? isNotNull(schema.images.deletedAt) : isNull(schema.images.deletedAt)))
    .limit(1);
  if (!row) throw new UserError('Deze foto bestaat niet meer. Vernieuw de pagina.');
  return row;
}

export const updateImageDetails = adminAction(
  z.object({
    id,
    title: z.string().trim().max(120, 'De naam mag maximaal 120 tekens zijn.'),
    altText: z.string().trim().min(3, 'Beschrijf kort wat er op de foto staat.').max(300, 'De beschrijving mag maximaal 300 tekens zijn.'),
    caption: z.string().trim().max(300, 'Het bijschrift mag maximaal 300 tekens zijn.'),
    isVisible: z.boolean(),
    isFeatured: z.boolean(),
  }),
  async (input, ctx) => {
    await getImage(input.id);
    await db()
      .update(schema.images)
      .set({
        title: input.title,
        altText: input.altText,
        caption: input.caption,
        isVisible: input.isVisible,
        isFeatured: input.isFeatured,
        updatedAt: new Date(),
      })
      .where(eq(schema.images.id, input.id));
    await logActivity(ctx.user.id, 'fotos', input.title ? `Foto bijgewerkt: ${input.title}` : 'Fotogegevens bijgewerkt');
    invalidatePublicContent();
    return { ok: true, message: 'Wijzigingen opgeslagen.' };
  },
);

export const setImageFlags = adminAction(z.object({ id, isVisible: z.boolean().optional(), isFeatured: z.boolean().optional() }), async (input, ctx) => {
  await getImage(input.id);
  await db()
    .update(schema.images)
    .set({
      ...(input.isVisible !== undefined ? { isVisible: input.isVisible } : {}),
      ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
      updatedAt: new Date(),
    })
    .where(eq(schema.images.id, input.id));
  const message =
    input.isVisible !== undefined
      ? input.isVisible
        ? 'Foto staat nu zichtbaar in de galerij.'
        : 'Foto is verborgen in de galerij.'
      : input.isFeatured
        ? 'Foto is uitgelicht op de homepage.'
        : 'Foto is niet meer uitgelicht.';
  await logActivity(
    ctx.user.id,
    'fotos',
    input.isVisible === false
      ? 'Foto verborgen'
      : input.isVisible
        ? 'Foto zichtbaar gemaakt'
        : input.isFeatured
          ? 'Foto uitgelicht'
          : 'Foto niet meer uitgelicht',
  );
  invalidatePublicContent();
  return { ok: true, message };
});

export const reorderImages = adminAction(z.object({ ids: z.array(id).min(1).max(2000) }), async ({ ids }, ctx) => {
  await db().transaction(async (tx) => {
    for (const [index, imageId] of ids.entries()) {
      await tx.update(schema.images).set({ sortOrder: index }).where(eq(schema.images.id, imageId));
    }
  });
  await logActivity(ctx.user.id, 'fotos', 'Volgorde van foto’s aangepast');
  invalidatePublicContent();
  return { ok: true, message: 'Volgorde opgeslagen.' };
});

/** Moves a photo to the trash (restorable for 30 days). Photos that the homepage depends on are protected. */
export const trashImage = adminAction(z.object({ id }), async ({ id: imageId }, ctx) => {
  const image = await getImage(imageId);
  const usages = (await imageUsageMap()).get(imageId) ?? [];
  const critical = usages.filter((u) => u.critical);
  if (critical.length > 0) {
    throw new UserError(
      `Deze foto kan niet worden verwijderd, want het is de ${critical.map((u) => u.label.toLowerCase()).join(' en de ')}. Kies eerst een andere foto onder Website, of gebruik ‘Vervangen’.`,
    );
  }
  await db().update(schema.images).set({ deletedAt: new Date(), isFeatured: false }).where(eq(schema.images.id, imageId));
  await logActivity(ctx.user.id, 'fotos', image.title ? `Foto verwijderd: ${image.title}` : 'Foto verwijderd');
  invalidatePublicContent();
  return { ok: true, message: 'Foto verwijderd.' };
});

export const restoreImage = adminAction(z.object({ id }), async ({ id: imageId }, ctx) => {
  await getImage(imageId, true);
  await db().update(schema.images).set({ deletedAt: null }).where(eq(schema.images.id, imageId));
  await logActivity(ctx.user.id, 'fotos', 'Foto teruggezet');
  invalidatePublicContent();
  return { ok: true, message: 'Foto teruggezet.' };
});

export const deleteImageForever = adminAction(z.object({ ids: z.array(id).min(1).max(500) }), async ({ ids }, ctx) => {
  const rows = await db()
    .delete(schema.images)
    .where(and(inArray(schema.images.id, ids), isNotNull(schema.images.deletedAt)))
    .returning({ key: schema.images.storageKey });
  for (const row of rows) await deleteMedia(row.key).catch(() => {});
  await logActivity(ctx.user.id, 'fotos', rows.length === 1 ? 'Foto definitief verwijderd' : `${rows.length} foto’s definitief verwijderd`);
  return { ok: true, message: rows.length === 1 ? 'Foto definitief verwijderd.' : `${rows.length} foto’s definitief verwijderd.` };
});

export const setSiteImage = adminAction(z.object({ id, role: z.enum(['hero', 'about']) }), async ({ id: imageId, role }, ctx) => {
  await getImage(imageId);
  await db()
    .update(schema.siteSettings)
    .set(role === 'hero' ? { heroImageId: imageId, updatedAt: new Date() } : { aboutImageId: imageId, updatedAt: new Date() })
    .where(eq(schema.siteSettings.id, 1));
  await logActivity(ctx.user.id, 'website', role === 'hero' ? 'Hoofdfoto van de homepage gewijzigd' : "Foto bij 'Over ons' gewijzigd");
  invalidatePublicContent();
  return { ok: true, message: role === 'hero' ? 'Dit is nu de hoofdfoto van de homepage.' : "Dit is nu de foto bij 'Over ons'." };
});

export const listPickerImages = adminAction(z.object({}), async () => {
  const { listAdminImages } = await import('@/lib/admin/images');
  return { ok: true, data: await listAdminImages() };
});
