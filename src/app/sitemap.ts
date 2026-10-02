import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const pages: Array<[string, number, MetadataRoute.Sitemap[number]['changeFrequency']]> = [
    ['/', 1, 'weekly'],
    ['/menukaart', 0.9, 'weekly'],
    ['/contact', 0.8, 'monthly'],
    ['/over-ons', 0.7, 'yearly'],
    ['/galerij', 0.6, 'monthly'],
    ['/privacy', 0.2, 'yearly'],
    ['/voorwaarden', 0.2, 'yearly'],
  ];
  return pages.map(([path, priority, changeFrequency]) => ({ url: `${base}${path === '/' ? '/' : path}`, priority, changeFrequency }));
}
