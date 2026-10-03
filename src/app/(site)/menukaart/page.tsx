import { JsonLd } from '@/components/site/json-ld';
import { MenuBrowser } from '@/components/site/menu-browser';
import { MenuFolder } from '@/components/site/menu-folder';
import { OffersList } from '@/components/site/offers';
import { PageHeader } from '@/components/site/page-header';
import { DownloadIcon, InfoIcon, PhoneIcon } from '@/components/ui/icons';
import { getActiveOffers, getMenu, getSettings } from '@/lib/content/queries';
import { telHref } from '@/lib/format';
import { breadcrumbJsonLd, menuJsonLd, pageMetadata } from '@/lib/seo';

export const generateMetadata = () => pageMetadata('menukaart');

export default async function MenuPage() {
  const [settings, menu, offers] = await Promise.all([getSettings(), getMenu(), getActiveOffers()]);
  const phoneHref = telHref(settings.phoneE164);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Menukaart', path: '/menukaart' }])} />
      {menu.length > 0 && <JsonLd data={menuJsonLd(menu)} />}

      <PageHeader
        title="Menukaart"
        intro="Al onze gerechten en prijzen op een rij. Bestellen of afhalen? Bel ons gerust."
        aside={<MenuFolder tone="dark" className="mx-auto pr-2 md:mx-0" />}
      >
        <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap">
          <a href={phoneHref} className="btn btn-primary">
            <PhoneIcon size={18} /> Bel {settings.phoneDisplay}
          </a>
          {settings.menuPdfUrl && (
            <a href={settings.menuPdfUrl} className="btn btn-outline" type="application/pdf">
              <DownloadIcon size={18} /> Menukaart als PDF
            </a>
          )}
        </div>
      </PageHeader>

      <div className="container-site">
        <aside role="note" aria-labelledby="allergenen-titel" className="mt-10 flex gap-4 border-l-4 border-tomato bg-white p-5 md:p-6">
          <InfoIcon className="mt-0.5 shrink-0 text-tomato" size={24} />
          <div>
            <h2 id="allergenen-titel" className="text-base normal-case tracking-normal [font-stretch:100%]">
              Voedselallergie?
            </h2>
            <p className="mt-1 text-ink-soft">{settings.allergenText.replace(/^Voedselallergie\?\s*/i, '')}</p>
          </div>
        </aside>

        {offers.length > 0 && (
          <section className="mt-12" aria-labelledby="aanbiedingen-titel">
            <h2 id="aanbiedingen-titel" className="mb-6 text-3xl">
              Aanbiedingen
            </h2>
            <OffersList offers={offers} />
          </section>
        )}

        <div className="mt-8 pb-20">
          {menu.length > 0 ? (
            <MenuBrowser menu={menu} />
          ) : (
            <div className="py-16 text-center">
              <p className="text-3xl font-extrabold uppercase [font-stretch:75%]">De menukaart wordt bijgewerkt</p>
              <p className="mx-auto mt-3 max-w-lg text-lg text-ink-soft">
                {settings.menuPdfUrl
                  ? 'Bekijk in de tussentijd onze menukaart als PDF, of bel ons voor ons actuele aanbod.'
                  : `Bel ons gerust op ${settings.phoneDisplay} voor ons actuele aanbod en de prijzen.`}
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <a href={phoneHref} className="btn btn-primary">
                  <PhoneIcon size={18} /> Bel ons
                </a>
                {settings.menuPdfUrl && (
                  <a href={settings.menuPdfUrl} className="btn btn-outline">
                    <DownloadIcon size={18} /> Menukaart als PDF
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
