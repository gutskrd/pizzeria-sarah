import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=(), interest-cohort=()',
  },
];

/** Old WordPress addresses → new pages, so existing links and search results keep working. */
const legacyRedirects: Array<[string, string]> = [
  ['/home', '/'],
  ['/index.php', '/'],
  ['/menu', '/menukaart'],
  ['/menu-kaart', '/menukaart'],
  ['/onze-menukaart', '/menukaart'],
  ['/kaart', '/menukaart'],
  ['/over', '/over-ons'],
  ['/about', '/over-ons'],
  ['/over-pizzeria-sarah', '/over-ons'],
  ['/galerie', '/galerij'],
  ['/gallery', '/galerij'],
  ['/fotos', '/galerij'],
  ['/foto-s', '/galerij'],
  ['/contact-2', '/contact'],
  ['/contactgegevens', '/contact'],
  ['/openingstijden', '/contact'],
  ['/reserveren', '/contact'],
  ['/privacybeleid', '/privacy'],
  ['/privacyverklaring', '/privacy'],
  ['/privacy-policy', '/privacy'],
  ['/algemene-voorwaarden', '/voorwaarden'],
  ['/wp-content/uploads/2025/11/menu-2025-modern-3.pdf', '/menukaart'],
  ['/wp-content/uploads/2025/11/menu-2025-nieuwe-fotos.pdf', '/menukaart'],
];

const nextConfig: NextConfig = {
  output: 'standalone',
  // Separate build folder for the end-to-end test server, so it can run next to `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  // No floating dev badge (keeps screenshots and accessibility checks clean).
  devIndicators: false,
  reactStrictMode: true,
  images: { unoptimized: true },
  serverExternalPackages: ['sharp', '@node-rs/argon2'],
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'X-Robots-Tag', value: 'noindex' },
        ],
      },
    ];
  },
  async redirects() {
    return legacyRedirects.map(([source, destination]) => ({ source, destination, permanent: true }));
  },
};

export default nextConfig;
