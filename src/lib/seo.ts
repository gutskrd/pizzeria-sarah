import type { Metadata } from 'next';
import { getPageSeo, getSettings, type PublicMenuCategory, type SiteSettings } from '@/lib/content/queries';
import type { PageKey } from '@/lib/db/schema';
import { siteUrl } from '@/lib/env';
import { toSchemaOrgHours, type Schedule } from '@/lib/opening-hours';

export const PAGE_PATHS: Record<PageKey, string> = {
  home: '/',
  menukaart: '/menukaart',
  'over-ons': '/over-ons',
  galerij: '/galerij',
  contact: '/contact',
  privacy: '/privacy',
  voorwaarden: '/voorwaarden',
};

export const PAGE_LABELS: Record<PageKey, string> = {
  home: 'Homepage',
  menukaart: 'Menukaart',
  'over-ons': 'Over ons',
  galerij: "Foto's (galerij)",
  contact: 'Contact',
  privacy: 'Privacyverklaring',
  voorwaarden: 'Voorwaarden',
};

/** Per-page metadata: unique title, description, canonical URL, Open Graph and Twitter cards. */
export async function pageMetadata(key: PageKey, opts: { noindex?: boolean } = {}): Promise<Metadata> {
  const [seo, settings] = await Promise.all([getPageSeo(key), getSettings()]);
  const title = seo?.title ?? settings.businessName;
  const description = seo?.description ?? settings.footerText;
  const path = PAGE_PATHS[key];
  const image = settings.heroImage?.ogUrl ?? '/opengraph-image';
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      locale: 'nl_NL',
      siteName: settings.businessName,
      title,
      description,
      url: path,
      images: [{ url: image, width: 1200, height: 630, alt: settings.businessName }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
    robots: opts.noindex ? { index: false, follow: true } : { index: true, follow: true },
  };
}

/** Lowest and highest price on the menu, e.g. "€3–€27" (only real prices). */
export function menuPriceRange(menu: PublicMenuCategory[]): string | null {
  const prices = menu.flatMap((c) =>
    c.items.flatMap((i) => (i.variants.length ? i.variants.map((v) => v.priceCents) : i.priceCents !== null ? [i.priceCents] : [])),
  );
  if (!prices.length) return null;
  const euro = (cents: number) => `€${Number.isInteger(cents / 100) ? cents / 100 : (cents / 100).toFixed(2).replace('.', ',')}`;
  return `${euro(Math.min(...prices))}–${euro(Math.max(...prices))}`;
}

export function websiteJsonLd(settings: SiteSettings) {
  const base = siteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${base}/#website`,
    name: settings.businessName,
    url: `${base}/`,
    inLanguage: 'nl-NL',
    publisher: { '@id': `${base}/#restaurant` },
  };
}

export function restaurantJsonLd(settings: SiteSettings, schedule: Schedule, menu: PublicMenuCategory[] = []) {
  const base = siteUrl();
  const special = schedule.exceptions.map((e) =>
    e.isClosed || e.periods.length === 0
      ? { '@type': 'OpeningHoursSpecification', validFrom: e.startsOn, validThrough: e.endsOn, opens: '00:00', closes: '00:00' }
      : e.periods.map((p) => ({ '@type': 'OpeningHoursSpecification', validFrom: e.startsOn, validThrough: e.endsOn, opens: p.opens, closes: p.closes })),
  );
  const sameAs = [settings.facebookUrl, settings.instagramUrl].filter(Boolean);
  const priceRange = menuPriceRange(menu);
  const images = [
    settings.heroImage ? `${base}${settings.heroImage.ogUrl}` : null,
    settings.folder ? `${base}${settings.folder.panels.buiten[2]}` : null,
  ].filter((x): x is string => Boolean(x));
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': `${base}/#restaurant`,
    name: settings.businessName,
    description: settings.introText,
    url: `${base}/`,
    telephone: settings.phoneE164,
    email: settings.email,
    ...(settings.foundedYear ? { foundingDate: String(settings.foundedYear) } : {}),
    address: {
      '@type': 'PostalAddress',
      ...(settings.street ? { streetAddress: settings.street } : {}),
      ...(settings.postalCode ? { postalCode: settings.postalCode } : {}),
      addressLocality: settings.city,
      addressCountry: 'NL',
    },
    // As printed on the menu: pizza's, shoarma, döner, pasta, kip (grillroom).
    servesCuisine: ['Pizza', 'Italiaans', 'Shoarma', 'Döner', 'Pasta', 'Grill'],
    hasMenu: { '@id': `${base}/menukaart#menu`, url: `${base}/menukaart` },
    acceptsReservations: true,
    ...(priceRange ? { priceRange } : {}),
    ...(images.length ? { image: images } : {}),
    ...(settings.routeUrl ? { hasMap: settings.routeUrl } : {}),
    openingHoursSpecification: toSchemaOrgHours(schedule),
    ...(special.length ? { specialOpeningHoursSpecification: special.flat() } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  const base = siteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Home', path: '/' }, ...items].map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${base}${item.path === '/' ? '/' : item.path}`,
    })),
  };
}

export function menuJsonLd(menu: PublicMenuCategory[]) {
  const base = siteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    '@id': `${base}/menukaart#menu`,
    name: 'Menukaart',
    url: `${base}/menukaart`,
    inLanguage: 'nl-NL',
    isPartOf: { '@id': `${base}/#website` },
    hasMenuSection: menu.map((c) => ({
      '@type': 'MenuSection',
      name: c.name,
      ...(c.description ? { description: c.description } : {}),
      hasMenuItem: c.items.map((i) => {
        const prices = i.variants.length ? i.variants.map((v) => v.priceCents) : i.priceCents !== null ? [i.priceCents] : [];
        return {
          '@type': 'MenuItem',
          '@id': `${base}/menukaart#gerecht-${i.id}`,
          name: i.number ? `${i.number}. ${i.name}` : i.name,
          ...(i.description ? { description: i.description } : {}),
          ...(i.image ? { image: `${base}${i.image.ogUrl}` } : {}),
          ...(i.variants.length
            ? {
                offers: i.variants.map((v) => ({ '@type': 'Offer', name: v.label, priceCurrency: 'EUR', price: (v.priceCents / 100).toFixed(2) })),
              }
            : prices.length
              ? { offers: { '@type': 'Offer', priceCurrency: 'EUR', price: (prices[0]! / 100).toFixed(2) } }
              : {}),
        };
      }),
    })),
  };
}
