'use server';

import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { adminAction, UserError } from '@/lib/admin/action';
import { invalidatePublicContent } from '@/lib/content/cache';
import { db, schema } from '@/lib/db';
import { logActivity } from '@/lib/security/events';

const optionalDate = z
  .string()
  .regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Kies een geldige datum.')
  .transform((v) => v || null);

export const saveOffer = adminAction(
  z
    .object({
      id: z.uuid().optional(),
      title: z.string().trim().min(1, 'Geef de aanbieding een titel.').max(120, 'Maximaal 120 tekens.'),
      description: z.string().trim().max(1000, 'Maximaal 1000 tekens.'),
      priceText: z.string().trim().max(60, 'Maximaal 60 tekens.'),
      imageId: z.uuid().nullable(),
      startsOn: optionalDate,
      endsOn: optionalDate,
      isVisible: z.boolean(),
    })
    .refine((v) => !v.startsOn || !v.endsOn || v.endsOn >= v.startsOn, { message: 'De einddatum moet op of na de begindatum liggen.', path: ['endsOn'] }),
  async (input, ctx) => {
    const values = {
      title: input.title,
      description: input.description,
      priceText: input.priceText,
      imageId: input.imageId,
      startsOn: input.startsOn,
      endsOn: input.endsOn,
      isVisible: input.isVisible,
      updatedAt: new Date(),
    };
    if (input.id) {
      const rows = await db().update(schema.offers).set(values).where(eq(schema.offers.id, input.id)).returning({ id: schema.offers.id });
      if (!rows.length) throw new UserError('Deze aanbieding bestaat niet meer. Vernieuw de pagina.');
    } else {
      const [max] = await db()
        .select({ v: sql<number>`coalesce(max(${schema.offers.sortOrder}), -1)::int` })
        .from(schema.offers);
      await db()
        .insert(schema.offers)
        .values({ ...values, sortOrder: (max?.v ?? -1) + 1 });
    }
    await logActivity(ctx.user.id, 'aanbiedingen', input.id ? `Aanbieding aangepast: ${input.title}` : `Nieuwe aanbieding toegevoegd: ${input.title}`);
    invalidatePublicContent();
    return { ok: true, message: input.id ? 'Wijzigingen opgeslagen.' : 'Aanbieding toegevoegd.' };
  },
);

export const setOfferVisible = adminAction(z.object({ id: z.uuid(), isVisible: z.boolean() }), async ({ id, isVisible }, ctx) => {
  const [row] = await db()
    .update(schema.offers)
    .set({ isVisible, updatedAt: new Date() })
    .where(eq(schema.offers.id, id))
    .returning({ title: schema.offers.title });
  if (!row) throw new UserError('Deze aanbieding bestaat niet meer.');
  await logActivity(ctx.user.id, 'aanbiedingen', `${isVisible ? 'Aanbieding zichtbaar gemaakt' : 'Aanbieding verborgen'}: ${row.title}`);
  invalidatePublicContent();
  return { ok: true, message: isVisible ? 'Aanbieding is zichtbaar.' : 'Aanbieding is verborgen.' };
});

export const deleteOffer = adminAction(z.object({ id: z.uuid() }), async ({ id }, ctx) => {
  const [row] = await db().delete(schema.offers).where(eq(schema.offers.id, id)).returning({ title: schema.offers.title });
  if (!row) throw new UserError('Deze aanbieding bestaat niet meer.');
  await logActivity(ctx.user.id, 'aanbiedingen', `Aanbieding verwijderd: ${row.title}`);
  invalidatePublicContent();
  return { ok: true, message: 'Aanbieding verwijderd.' };
});
