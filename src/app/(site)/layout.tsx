import localFont from 'next/font/local';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';
import { getSchedule, getSettings } from '@/lib/content/queries';
import { telHref } from '@/lib/format';

// Archivo (variable weight and width): the condensed cuts echo the printed menu.
const archivo = localFont({
  src: '../fonts/archivo.woff2',
  weight: '100 900',
  declarations: [{ prop: 'font-stretch', value: '62% 125%' }],
  variable: '--font-archivo',
  display: 'swap',
  fallback: ['Arial Narrow', 'Arial', 'sans-serif'],
});

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, schedule] = await Promise.all([getSettings(), getSchedule()]);
  const now = new Date();
  return (
    <div className={`site-theme ${archivo.variable}`}>
      <SiteHeader
        businessName={settings.businessName}
        tagline={settings.tagline}
        phoneDisplay={settings.phoneDisplay}
        phoneHref={telHref(settings.phoneE164)}
      />
      <main id="inhoud" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter settings={settings} schedule={schedule} now={now} />
    </div>
  );
}
