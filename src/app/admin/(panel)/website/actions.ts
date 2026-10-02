'use server';

import { and, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { adminAction, UserError } from '@/lib/admin/action';
import { invalidatePublicContent } from '@/lib/content/cache';
import { db, schema } from '@/lib/db';
import { HIGHLIGHT_ICONS, PAGE_KEYS } from '@/lib/db/schema';
import { logActivity } from '@/lib/security/events';

const text = (label: string, max: number) => z.string().trim().min(1, `${label} mag niet leeg zijn.`).max(max, `${label} mag maximaal ${max} tekens zijn.`);

const contentSchema = z
  .object({
    heroTitle: text('De titel', 80),
    heroText: text('De tekst', 300),
    heroImageId: z.uuid().nullable(),
    introTitle: text('De titel', 100),
    introText: text('De tekst', 1000),
    aboutTitle: text('De titel', 100),
    aboutText: text('De korte tekst', 800),
    aboutStory: text('Het verhaal', 5000),
    aboutImageId: z.uuid().nullable(),
    waitingAreaText: text('De tekst over de wachtruimte', 500),
    reservationText: text('De tekst over reserveren', 400),
    allergenText: text('De allergeneninformatie', 800),
    footerText: text('De tekst', 300),
    showGalleryOnHome: z.boolean(),
    showFeaturedMenuOnHome: z.boolean(),
  })
  .partial();

const AREA_LABELS: Partial<Record<keyof z.infer<typeof contentSchema>, string>> = {
  heroTitle: 'Bovenkant homepage aangepast',
  heroText: 'Bovenkant homepage aangepast',
  heroImageId: 'Hoofdfoto van de homepage gewijzigd',
  introTitle: 'Welkomsttekst aangepast',
  introText: 'Welkomsttekst aangepast',
  aboutTitle: "Tekst 'Over ons' aangepast",
  aboutText: "Tekst 'Over ons' aangepast",
  aboutStory: "Tekst 'Over ons' aangepast",
  aboutImageId: "Foto bij 'Over ons' gewijzigd",
  waitingAreaText: 'Teksten over restaurant en wachtruimte aangepast',
  reservationText: 'Teksten over restaurant en wachtruimte aangepast',
  allergenText: 'Allergeneninformatie aangepast',
  footerText: 'Tekst onderaan de website aangepast',
  showGalleryOnHome: 'Onderdelen van de homepage aangepast',
  showFeaturedMenuOnHome: 'Onderdelen van de homepage aangepast',
};

export const saveWebsiteContent = adminAction(contentSchema, async (input, ctx) => {
  const keys = Object.keys(input) as Array<keyof typeof input>;
  if (keys.length === 0) return { ok: true, message: 'Er was niets gewijzigd.' };
  const imageIds = [input.heroImageId, input.aboutImageId].filter((x): x is string => typeof x === 'string');
  if (imageIds.length) {
    const found = await db()
      .select({ id: schema.images.id })
      .from(schema.images)
      .where(and(inArray(schema.images.id, imageIds), isNull(schema.images.deletedAt)));
    if (found.length !== new Set(imageIds).size) throw new UserError('Deze foto bestaat niet meer. Kies een andere foto.');
  }
  await db()
    .update(schema.siteSettings)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(schema.siteSettings.id, 1));
  for (const summary of new Set(keys.map((k) => AREA_LABELS[k] ?? 'Website aangepast'))) await logActivity(ctx.user.id, 'website', summary);
  invalidatePublicContent();
  return { ok: true, message: 'Wijzigingen opgeslagen.' };
});

export const saveHighlights = adminAction(
  z.object({
    items: z
      .array(
        z.object({
          title: text('De titel', 60),
          body: text('De tekst', 300),
          icon: z.enum(HIGHLIGHT_ICONS),
          isVisible: z.boolean(),
        }),
      )
      .max(6, 'Maximaal 6 punten.'),
  }),
  async ({ items }, ctx) => {
    await db().transaction(async (tx) => {
      await tx.delete(schema.highlights);
      if (items.length) await tx.insert(schema.highlights).values(items.map((item, i) => ({ ...item, sortOrder: i })));
    });
    await logActivity(ctx.user.id, 'website', "Blok 'Waarom wij' aangepast");
    invalidatePublicContent();
    return { ok: true, message: 'Wijzigingen opgeslagen.' };
  },
);

export const savePageSeo = adminAction(
  z.object({
    pageKey: z.enum(PAGE_KEYS),
    title: z.string().trim().min(5, 'Vul een titel in.').max(120, 'Maximaal 120 tekens.'),
    description: z.string().trim().min(20, 'Vul een beschrijving van minimaal 20 tekens in.').max(320, 'Maximaal 320 tekens.'),
  }),
  async (input, ctx) => {
    await db()
      .insert(schema.pageSeo)
      .values(input)
      .onConflictDoUpdate({ target: schema.pageSeo.pageKey, set: { title: input.title, description: input.description, updatedAt: new Date() } });
    await logActivity(ctx.user.id, 'website', 'Zoekmachine-instellingen aangepast');
    invalidatePublicContent();
    return { ok: true, message: 'Wijzigingen opgeslagen.' };
  },
);
