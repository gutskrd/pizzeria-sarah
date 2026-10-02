import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { headers } from 'next/headers';
import { siteUrl } from '@/lib/env';
import './globals.css';

const fraunces = localFont({
  src: [
    { path: './fonts/fraunces.woff2', style: 'normal', weight: '300 800' },
    { path: './fonts/fraunces-italic.woff2', style: 'italic', weight: '300 800' },
  ],
  variable: '--font-fraunces',
  display: 'swap',
  fallback: ['Georgia', 'serif'],
});

const instrument = localFont({
  src: './fonts/instrument-sans.woff2',
  weight: '400 700',
  variable: '--font-instrument',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
});

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
    <html lang="nl" data-scroll-behavior="smooth" className={`${fraunces.variable} ${instrument.variable}`}>
      <body>{children}</body>
    </html>
  );
}
