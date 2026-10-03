import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { siteUrl } from '@/lib/env';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(siteUrl()),
    applicationName: 'Pizzeria Sarah',
    formatDetection: { telephone: false, address: false, email: false },
  };
}

export const viewport: Viewport = {
  themeColor: '#1d1511',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading request headers makes every page render per request, which is
  // needed for the per-request CSP nonce that Next.js applies to its scripts.
  await headers();
  return (
    <html lang="nl" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
