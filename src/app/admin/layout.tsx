import localFont from 'next/font/local';

// The admin's own fonts, loaded only here (the public website uses Archivo).
const fraunces = localFont({
  src: [
    { path: '../fonts/fraunces.woff2', style: 'normal', weight: '300 800' },
    { path: '../fonts/fraunces-italic.woff2', style: 'italic', weight: '300 800' },
  ],
  variable: '--font-fraunces',
  display: 'swap',
  fallback: ['Georgia', 'serif'],
});

const instrument = localFont({
  src: '../fonts/instrument-sans.woff2',
  weight: '400 700',
  variable: '--font-instrument',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
});

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className={`admin-theme ${fraunces.variable} ${instrument.variable}`}>{children}</div>;
}
