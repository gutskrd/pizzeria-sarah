import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';
import { getSchedule, getSettings } from '@/lib/content/queries';
import { telHref } from '@/lib/format';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, schedule] = await Promise.all([getSettings(), getSchedule()]);
  const now = new Date();
  return (
    <>
      <SiteHeader businessName={settings.businessName} city={settings.city} phoneDisplay={settings.phoneDisplay} phoneHref={telHref(settings.phoneE164)} />
      <main id="inhoud" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter settings={settings} schedule={schedule} now={now} />
    </>
  );
}
