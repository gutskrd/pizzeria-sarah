import { asc, desc, inArray } from 'drizzle-orm';
import { OffersEditor, type AdminOffer } from '@/components/admin/offers-editor';
import { requireAdmin } from '@/lib/auth/current';
import { db, schema } from '@/lib/db';
import { todayInAmsterdam } from '@/lib/format';
import { toPickedImage } from '@/lib/admin/images';

export const metadata = { title: 'Aanbiedingen – Beheer' };

export default async function AdminOffersPage({ searchParams }: { searchParams: Promise<{ aanbieding?: string }> }) {
  await requireAdmin();
  const rows = await db().select().from(schema.offers).orderBy(asc(schema.offers.sortOrder), desc(schema.offers.createdAt));
  const ids = rows.map((r) => r.imageId).filter((x): x is string => Boolean(x));
  const images = ids.length ? await db().select().from(schema.images).where(inArray(schema.images.id, ids)) : [];
  const map = new Map(images.map((i) => [i.id, toPickedImage(i)]));
  const offers: AdminOffer[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    priceText: r.priceText,
    image: r.imageId ? (map.get(r.imageId) ?? null) : null,
    startsOn: r.startsOn,
    endsOn: r.endsOn,
    isVisible: r.isVisible,
  }));
  const { aanbieding } = await searchParams;
  return <OffersEditor offers={offers} today={todayInAmsterdam()} openOffer={aanbieding} />;
}
