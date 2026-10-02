import Link from 'next/link';
import { HighlightIcon } from '@/components/site/highlight-icon';
import { HoursTable } from '@/components/site/hours-table';
import { JsonLd } from '@/components/site/json-ld';
import { MenuItemRow } from '@/components/site/menu-item';
import { OffersList } from '@/components/site/offers';
import { OpeningStatus } from '@/components/site/opening-status';
import { Picture } from '@/components/site/picture';
import { ArrowRightIcon, DownloadIcon, MailIcon, PhoneIcon, PinIcon, RouteIcon } from '@/components/ui/icons';
import { getActiveOffers, getFeaturedMenuItems, getGalleryPreview, getHighlights, getMenu, getSchedule, getSettings } from '@/lib/content/queries';
import { telHref } from '@/lib/format';
import { statusSnapshot } from '@/lib/opening-hours';
import { pageMetadata, restaurantJsonLd } from '@/lib/seo';

export const generateMetadata = () => pageMetadata('home');

export default async function HomePage() {
  const [settings, schedule, featured, menu, highlights, gallery, offers] = await Promise.all([
    getSettings(),
    getSchedule(),
    getFeaturedMenuItems(6),
    getMenu(),
    getHighlights(),
    getGalleryPreview(6),
    getActiveOffers(),
  ]);
  const now = new Date();
  const phoneHref = telHref(settings.phoneE164);
  const services = settings.tagline
    .split('·')
    .map((s) => s.trim())
    .filter(Boolean);
  const aboutImage = settings.aboutImage ?? gallery.find((g) => g.id !== settings.heroImage?.id) ?? null;
  const showGallery = settings.showGalleryOnHome && gallery.length > 0;
  const showFeatured = settings.showFeaturedMenuOnHome && featured.length > 0;

  return (
    <>
      <JsonLd data={restaurantJsonLd(settings, schedule)} />

      {/* ───────── Hero ───────── */}
      <section className="on-dark relative isolate overflow-hidden bg-char text-paper" aria-labelledby="hero-titel">
        {settings.heroImage ? (
          <>
            <Picture image={settings.heroImage} sizes="100vw" priority className="absolute inset-0 -z-20 h-full w-full object-cover" />
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgba(29,21,17,0.94)_0%,rgba(29,21,17,0.6)_45%,rgba(29,21,17,0.25)_100%)]" />
          </>
        ) : (
          <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -right-24 top-1/2 h-[46rem] w-[46rem] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(179,48,29,0.35)_0%,rgba(29,21,17,0)_65%)]" />
            {settings.foundedYear && (
              <span className="absolute -bottom-10 right-[-0.05em] select-none font-display text-[clamp(10rem,32vw,28rem)] font-light italic leading-none text-white/[0.05]">
                {settings.foundedYear}
              </span>
            )}
          </div>
        )}
        <div className="container-site flex min-h-[78svh] flex-col justify-end pb-14 pt-24 md:min-h-[82svh] md:pb-20">
          <p className="eyebrow reveal">
            {settings.tagline} · {settings.city}
          </p>
          <h1
            id="hero-titel"
            className="reveal mt-4 max-w-4xl font-display text-[clamp(3.1rem,11vw,7.5rem)] font-medium leading-[0.92] tracking-[-0.025em] [animation-delay:60ms]"
          >
            {settings.heroTitle}
          </h1>
          <p className="reveal mt-6 max-w-xl text-lg text-paper/85 [animation-delay:120ms] md:text-xl">{settings.heroText}</p>
          <div className="reveal mt-8 flex flex-col gap-3 [animation-delay:180ms] min-[420px]:flex-row min-[420px]:flex-wrap">
            <Link href="/menukaart" className="btn btn-primary">
              Menukaart bekijken <ArrowRightIcon size={18} />
            </Link>
            <a href={phoneHref} className="btn btn-outline">
              <PhoneIcon size={18} /> Bel ons
            </a>
          </div>
          <div className="reveal mt-8 [animation-delay:240ms]">
            <OpeningStatus schedule={schedule} initial={statusSnapshot(schedule, now)} tone="dark" />
          </div>
        </div>
      </section>

      {/* ───────── Introductie ───────── */}
      <section className="container-site grid gap-8 py-20 md:grid-cols-12 md:py-28" aria-labelledby="intro-titel">
        <div className="md:col-span-5">
          <p className="eyebrow">Welkom</p>
          <h2 id="intro-titel" className="mt-3 text-[2.2rem] md:text-5xl">
            {settings.introTitle}
          </h2>
        </div>
        <div className="md:col-span-6 md:col-start-7">
          <p className="text-lg leading-relaxed text-ink-soft md:text-xl">{settings.introText}</p>
          {services.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-6 text-sm font-semibold uppercase tracking-[0.12em] text-muted">
              {services.map((s) => (
                <li key={s}>{s}</li>
              ))}
              <li>Restaurant</li>
            </ul>
          )}
        </div>
      </section>

      {/* ───────── Aanbiedingen (alleen als er actieve aanbiedingen zijn) ───────── */}
      {offers.length > 0 && (
        <section className="container-site pb-20 md:pb-28" aria-labelledby="aanbiedingen-titel">
          <p className="eyebrow">Nu bij Pizzeria Sarah</p>
          <h2 id="aanbiedingen-titel" className="mb-8 mt-3 text-3xl md:text-4xl">
            Aanbiedingen
          </h2>
          <OffersList offers={offers} />
        </section>
      )}

      {/* ───────── Uit de menukaart ───────── */}
      <section className="border-y border-line bg-cream py-20 md:py-28" aria-labelledby="menu-titel">
        <div className="container-site">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">Menukaart</p>
              <h2 id="menu-titel" className="mt-3 text-[2.2rem] md:text-5xl">
                {showFeatured ? 'Uit onze menukaart' : 'Onze menukaart'}
              </h2>
            </div>
            <Link href="/menukaart" className="link-arrow self-start md:self-auto">
              Bekijk de volledige menukaart <ArrowRightIcon size={18} />
            </Link>
          </div>
          {showFeatured ? (
            <ul className="mt-10 grid gap-x-16 md:grid-cols-2">
              {featured.map((item) => (
                <MenuItemRow key={item.id} item={item} showCategory />
              ))}
            </ul>
          ) : (
            <div className="mt-10 max-w-2xl">
              <p className="text-lg text-ink-soft">
                {menu.length > 0
                  ? `Bekijk al onze gerechten en prijzen overzichtelijk op één pagina, verdeeld over ${menu.length} ${menu.length === 1 ? 'categorie' : 'categorieën'}.`
                  : `Bekijk onze gerechten en prijzen op de menukaart, of bel ons op ${settings.phoneDisplay} voor ons actuele aanbod.`}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/menukaart" className="btn btn-primary">
                  Menukaart bekijken
                </Link>
                {settings.menuPdfUrl && (
                  <a href={settings.menuPdfUrl} className="btn btn-outline">
                    <DownloadIcon size={18} /> Menukaart als PDF
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ───────── Waarom Pizzeria Sarah ───────── */}
      {highlights.length > 0 && (
        <section className="container-site py-20 md:py-28" aria-labelledby="waarom-titel">
          <p className="eyebrow">Waarom wij</p>
          <h2 id="waarom-titel" className="mt-3 max-w-2xl text-[2.2rem] md:text-5xl">
            Waarom {settings.businessName}?
          </h2>
          <ul className="mt-12 grid gap-10 md:grid-cols-3 md:gap-0">
            {highlights.map((h) => (
              <li key={h.id} className="md:border-l md:border-line md:px-8 md:first:border-l-0 md:first:pl-0">
                <span className="inline-flex size-12 items-center justify-center rounded-full bg-tomato-soft text-tomato">
                  <HighlightIcon name={h.icon} size={24} />
                </span>
                <h3 className="mt-5 text-2xl">{h.title}</h3>
                <p className="mt-2 text-ink-soft">{h.body}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ───────── Over ons ───────── */}
      <section className="on-dark bg-char-soft text-paper" aria-labelledby="over-titel">
        <div className={`container-site grid items-center gap-10 py-20 md:py-28 ${aboutImage ? 'md:grid-cols-2 md:gap-16' : ''}`}>
          {aboutImage && (
            <div className="overflow-hidden rounded-sm">
              <Picture image={aboutImage} sizes="(min-width: 768px) 50vw, 100vw" className="aspect-[4/5] w-full object-cover md:aspect-[4/5]" />
            </div>
          )}
          <div className={aboutImage ? '' : 'max-w-3xl'}>
            <p className="eyebrow">Over ons</p>
            <h2 id="over-titel" className="mt-3 text-[2.2rem] md:text-5xl">
              {settings.aboutTitle}
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-paper/85">{settings.aboutText}</p>
            <Link href="/over-ons" className="link-arrow mt-6">
              Meer over ons <ArrowRightIcon size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── Galerij-voorproefje ───────── */}
      {showGallery && (
        <section className="container-site py-20 md:py-28" aria-labelledby="galerij-titel">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">Galerij</p>
              <h2 id="galerij-titel" className="mt-3 text-[2.2rem] md:text-5xl">
                Een kijkje bij ons
              </h2>
            </div>
            <Link href="/galerij" className="link-arrow self-start md:self-auto">
              Bekijk alle foto&apos;s <ArrowRightIcon size={18} />
            </Link>
          </div>
          <ul className="mt-10 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 md:grid-rows-2">
            {gallery.map((img, i) => (
              <li key={img.id} className={`overflow-hidden rounded-sm bg-line ${i === 0 ? 'col-span-2 row-span-2' : ''} ${i > 4 ? 'hidden md:block' : ''}`}>
                <Link href="/galerij" className="group block h-full">
                  <Picture
                    image={img}
                    sizes={i === 0 ? '(min-width: 768px) 50vw, 100vw' : '(min-width: 768px) 25vw, 50vw'}
                    className="aspect-square h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ───────── Openingstijden ───────── */}
      <section id="openingstijden" className={`border-t border-line ${showGallery ? 'bg-cream' : ''}`} aria-labelledby="tijden-titel">
        <div className="container-site grid gap-12 py-20 md:grid-cols-2 md:gap-16 md:py-28">
          <div>
            <p className="eyebrow">Openingstijden</p>
            <h2 id="tijden-titel" className="mt-3 text-[2.2rem] md:text-5xl">
              Wanneer zijn we open?
            </h2>
            <div className="mt-6">
              <OpeningStatus schedule={schedule} initial={statusSnapshot(schedule, now)} />
            </div>
          </div>
          <HoursTable schedule={schedule} now={now} />
        </div>
      </section>

      {/* ───────── Restaurant / reserveren ───────── */}
      <section className="on-dark bg-tomato text-white" aria-labelledby="reserveren-titel">
        <div className="container-site flex flex-col gap-6 py-14 md:flex-row md:items-center md:justify-between md:py-16">
          <div className="max-w-2xl">
            <h2 id="reserveren-titel" className="text-3xl md:text-4xl">
              Eten in ons restaurant
            </h2>
            <p className="mt-3 text-lg text-white/90">{settings.reservationText}</p>
          </div>
          <a href={phoneHref} className="btn shrink-0 bg-white !text-tomato-dark hover:bg-paper">
            <PhoneIcon size={18} /> Bel {settings.phoneDisplay}
          </a>
        </div>
      </section>

      {/* ───────── Locatie & contact ───────── */}
      <section className="container-site grid gap-12 py-20 md:grid-cols-2 md:gap-16 md:py-28" aria-labelledby="locatie-titel">
        <div>
          <p className="eyebrow">Locatie</p>
          <h2 id="locatie-titel" className="mt-3 text-[2.2rem] md:text-5xl">
            Je vindt ons in {settings.city}
          </h2>
          <address className="mt-6 flex gap-3 text-lg not-italic">
            <PinIcon className="mt-1 shrink-0 text-tomato" />
            <span>
              {settings.businessName}
              {settings.street && (
                <>
                  <br />
                  {settings.street}
                </>
              )}
              <br />
              {[settings.postalCode, settings.city].filter(Boolean).join(' ')}
            </span>
          </address>
          {settings.routeUrl && (
            <a href={settings.routeUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline mt-6">
              <RouteIcon size={18} /> Route plannen
            </a>
          )}
        </div>
        <div className="md:pt-10">
          <h3 className="text-2xl">Contact</h3>
          <p className="mt-2 text-ink-soft">Een vraag, een bestelling of een reservering? Bel ons gerust, of stuur een bericht.</p>
          <ul className="mt-6 space-y-3 text-lg">
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
          <Link href="/contact" className="link-arrow mt-4">
            Stuur ons een bericht <ArrowRightIcon size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
