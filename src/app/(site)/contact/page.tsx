import { headers } from 'next/headers';
import { ContactForm } from '@/components/site/contact-form';
import { HoursTable } from '@/components/site/hours-table';
import { JsonLd } from '@/components/site/json-ld';
import { LocationCard } from '@/components/site/location-card';
import { OpeningStatus } from '@/components/site/opening-status';
import { PageHeader } from '@/components/site/page-header';
import { MailIcon, PhoneIcon, PinIcon } from '@/components/ui/icons';
import { getSchedule, getSettings } from '@/lib/content/queries';
import { env } from '@/lib/env';
import { telHref } from '@/lib/format';
import { statusSnapshot } from '@/lib/opening-hours';
import { issueFormToken } from '@/lib/security/crypto';
import { breadcrumbJsonLd, pageMetadata, restaurantJsonLd } from '@/lib/seo';

export const generateMetadata = () => pageMetadata('contact');

export default async function ContactPage() {
  const [settings, schedule, h] = await Promise.all([getSettings(), getSchedule(), headers()]);
  const now = new Date();
  const phoneHref = telHref(settings.phoneE164);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Contact', path: '/contact' }])} />
      <JsonLd data={restaurantJsonLd(settings, schedule)} />
      <PageHeader title="Contact" intro="Bel ons voor een bestelling of reservering, of stuur een bericht. We helpen je graag." />

      <div className="container-site grid gap-14 py-14 md:py-20 lg:grid-cols-12 lg:gap-16">
        <div className="space-y-12 lg:col-span-5">
          <section aria-labelledby="direct-titel">
            <h2 id="direct-titel" className="text-3xl">
              Direct contact
            </h2>
            <ul className="mt-5 space-y-2 text-lg">
              <li>
                <a href={phoneHref} className="inline-flex min-h-11 items-center gap-3 font-semibold hover:text-tomato">
                  <PhoneIcon className="text-tomato" /> {settings.phoneDisplay}
                </a>
              </li>
              <li>
                <a href={`mailto:${settings.email}`} className="inline-flex min-h-11 items-center gap-3 break-all hover:text-tomato">
                  <MailIcon className="shrink-0 text-tomato" /> {settings.email}
                </a>
              </li>
            </ul>
          </section>

          <section aria-labelledby="reserveren-titel" className="rounded-[3px] bg-char p-6 text-paper on-dark">
            <h2 id="reserveren-titel" className="text-2xl">
              Reserveren
            </h2>
            <p className="mt-2 text-paper/85">{settings.reservationText}</p>
            <a href={phoneHref} className="btn btn-primary mt-5">
              <PhoneIcon size={18} /> Bel om te reserveren
            </a>
          </section>

          <section aria-labelledby="adres-titel">
            <h2 id="adres-titel" className="text-3xl">
              Adres
            </h2>
            <div className="mt-5">
              {settings.street ? (
                <LocationCard businessName={settings.businessName} street={settings.street} postalCode={settings.postalCode} city={settings.city} />
              ) : (
                <address className="flex gap-3 text-lg not-italic">
                  <PinIcon className="mt-1 shrink-0 text-tomato" />
                  {settings.city}
                </address>
              )}
            </div>
          </section>

          <section id="openingstijden" aria-labelledby="tijden-titel">
            <h2 id="tijden-titel" className="text-3xl">
              Openingstijden
            </h2>
            <div className="mt-4">
              <OpeningStatus schedule={schedule} initial={statusSnapshot(schedule, now)} />
            </div>
            <div className="mt-5">
              <HoursTable schedule={schedule} now={now} />
            </div>
          </section>
        </div>

        <section aria-labelledby="formulier-titel" className="lg:col-span-7">
          <div className="rounded-md border border-line bg-cream p-5 sm:p-8">
            <h2 id="formulier-titel" className="text-3xl">
              Stuur ons een bericht
            </h2>
            <p className="mb-6 mt-2 text-ink-soft">Voor vragen en opmerkingen. Wil je bestellen of reserveren? Bel ons dan even, dat gaat het snelst.</p>
            <ContactForm formToken={issueFormToken()} turnstileSiteKey={env().TURNSTILE_SITE_KEY} nonce={h.get('x-nonce') ?? undefined} />
          </div>
        </section>
      </div>
    </>
  );
}
