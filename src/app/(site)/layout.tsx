import { archivo } from '@/app/fonts/archivo';
import { SiteFooter } from '@/components/site/site-footer';
import { MobileOrderBar } from '@/components/site/mobile-order-bar';
import { ScrollReveal } from '@/components/site/scroll-reveal';
import { SiteHeader } from '@/components/site/site-header';
import { getGalleryImages, getSchedule, getSettings } from '@/lib/content/queries';
import { telHref } from '@/lib/format';
import { statusSnapshot } from '@/lib/opening-hours';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, schedule, gallery] = await Promise.all([getSettings(), getSchedule(), getGalleryImages()]);
  const hasGallery = settings.showGalleryOnHome && gallery.length > 0;
  const now = new Date();
  return (
    <div className={`site-theme ${archivo.variable}`}>
      <SiteHeader
        businessName={settings.businessName}
        tagline={settings.tagline}
        phoneDisplay={settings.phoneDisplay}
        phoneHref={telHref(settings.phoneE164)}
        hasGallery={hasGallery}
      />
      <main id="inhoud" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter settings={settings} schedule={schedule} now={now} hasGallery={hasGallery} />
      <ScrollReveal />
      <MobileOrderBar phoneHref={telHref(settings.phoneE164)} routeUrl={settings.routeUrl} schedule={schedule} initial={statusSnapshot(schedule, now)} />
    </div>
  );
}
