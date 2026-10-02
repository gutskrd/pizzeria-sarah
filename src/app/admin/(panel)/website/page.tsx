import { asc, inArray } from 'drizzle-orm';
import { WebsiteView } from '@/components/admin/website-view';
import { toPickedImage } from '@/lib/admin/images';
import { requireAdmin } from '@/lib/auth/current';
import { db, schema } from '@/lib/db';
import { PAGE_KEYS } from '@/lib/db/schema';
import { siteUrl } from '@/lib/env';
import { PAGE_LABELS, PAGE_PATHS } from '@/lib/seo';

export const metadata = { title: 'Website – Beheer' };

export default async function WebsiteAdminPage() {
  await requireAdmin();
  const d = db();
  const [[s], highlights, seo] = await Promise.all([
    d.select().from(schema.siteSettings).limit(1),
    d.select().from(schema.highlights).orderBy(asc(schema.highlights.sortOrder)),
    d.select().from(schema.pageSeo),
  ]);
  if (!s) throw new Error('site_settings missing');
  const imageIds = [s.heroImageId, s.aboutImageId].filter((x): x is string => Boolean(x));
  const images = imageIds.length ? await d.select().from(schema.images).where(inArray(schema.images.id, imageIds)) : [];
  const img = (id: string | null) => toPickedImage(images.find((i) => i.id === id));

  return (
    <WebsiteView
      data={{
        hero: { heroTitle: s.heroTitle, heroText: s.heroText, heroImage: img(s.heroImageId) },
        intro: { introTitle: s.introTitle, introText: s.introText },
        about: { aboutTitle: s.aboutTitle, aboutText: s.aboutText, aboutStory: s.aboutStory, aboutImage: img(s.aboutImageId) },
        texts: { reservationText: s.reservationText, waitingAreaText: s.waitingAreaText, allergenText: s.allergenText },
        home: { showFeaturedMenuOnHome: s.showFeaturedMenuOnHome, showGalleryOnHome: s.showGalleryOnHome },
        footer: { footerText: s.footerText },
        highlights: highlights.map((h) => ({ title: h.title, body: h.body, icon: h.icon, isVisible: h.isVisible })),
        seo: PAGE_KEYS.map((key) => {
          const row = seo.find((r) => r.pageKey === key);
          return { pageKey: key, label: PAGE_LABELS[key], path: PAGE_PATHS[key], title: row?.title ?? '', description: row?.description ?? '' };
        }),
        contact: { phone: s.phoneDisplay, email: s.email, address: [s.street, [s.postalCode, s.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') },
        host: new URL(siteUrl()).host,
        businessName: s.businessName,
        tagline: s.tagline,
      }}
    />
  );
}
