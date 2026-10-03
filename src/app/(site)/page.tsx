import Link from 'next/link';
import { HoursTable } from '@/components/site/hours-table';
import { CategoryTiles } from '@/components/site/category-tiles';
import { JsonLd } from '@/components/site/json-ld';
import { LocationCard } from '@/components/site/location-card';
import { MenuFolder } from '@/components/site/menu-folder';
import { MenuItemRow } from '@/components/site/menu-item';
import { OffersList } from '@/components/site/offers';
import { OpeningStatus } from '@/components/site/opening-status';
import { Picture } from '@/components/site/picture';
import { ArrowRightIcon, DownloadIcon, MailIcon, PhoneIcon, PinIcon } from '@/components/ui/icons';
import { getActiveOffers, getFeaturedMenuItems, getGalleryPreview, getHighlights, getMenu, getSchedule, getSettings } from '@/lib/content/queries';
import { telHref } from '@/lib/format';
import { orderHint, statusSnapshot } from '@/lib/opening-hours';
import { pageMetadata, restaurantJsonLd, websiteJsonLd } from '@/lib/seo';

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
  const status = statusSnapshot(schedule, now);
  const aboutImage = settings.aboutImage ?? gallery.find((g) => g.id !== settings.heroImage?.id) ?? null;
  const showGallery = settings.showGalleryOnHome && gallery.length > 0;
  const showFeatured = settings.showFeaturedMenuOnHome && featured.length > 0;

  return (
    <>
      <JsonLd data={restaurantJsonLd(settings, schedule, menu)} />
      <JsonLd data={websiteJsonLd(settings)} />

      {/* ───────── Hero ───────── */}
      <section className="on-dark relative isolate overflow-hidden bg-char text-white" aria-labelledby="hero-titel">
        {settings.heroImage ? (
          <>
            <Picture image={settings.heroImage} sizes="100vw" priority className="absolute inset-0 -z-20 h-full w-full object-cover" />
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(15,15,15,0.94)_0%,rgba(15,15,15,0.75)_55%,rgba(15,15,15,0.45)_100%)]" />
          </>
        ) : (
          // The red diagonal from the printed menu.
          <div
            aria-hidden="true"
            className="hero-band absolute -right-1/4 top-[58%] -z-10 h-24 w-[90%] -rotate-[8deg] bg-tomato md:top-1/2 md:h-32 md:w-[60%]"
          />
        )}
        <div className="container-site grid items-center gap-12 py-14 md:py-20 lg:grid-cols-[1fr_auto] lg:gap-20 lg:py-24">
          <div>
            <p className="reveal text-sm font-bold uppercase tracking-[0.12em] text-white/70 [font-stretch:85%]">
              {settings.tagline}
              {settings.city && <span className="hidden sm:inline"> · {settings.city}</span>}
            </p>
            <h1
              id="hero-titel"
              className="reveal mt-3 max-w-4xl text-[clamp(3.6rem,14vw,8.75rem)] leading-[0.86] tracking-[-0.015em] [animation-delay:60ms] [font-stretch:68%]"
            >
              {settings.heroTitle}
            </h1>
            <p className="reveal mt-6 max-w-xl text-lg text-white/85 [animation-delay:120ms] md:text-xl">{settings.heroText}</p>
            <div className="reveal mt-8 flex flex-col gap-3 [animation-delay:180ms] min-[420px]:flex-row min-[420px]:flex-wrap">
              <a href={phoneHref} className="btn btn-primary">
                <PhoneIcon size={18} /> Bel {settings.phoneDisplay}
              </a>
              <Link href="/menukaart" className="btn btn-outline">
                Menukaart <ArrowRightIcon size={18} />
              </Link>
            </div>
            <div className="reveal mt-8 [animation-delay:240ms]">
              <OpeningStatus schedule={schedule} initial={status} tone="dark" initialHint={orderHint(schedule, now)} />
            </div>
          </div>
          {settings.folder && (
            <div className="reveal flex justify-center [animation-delay:200ms] lg:justify-end">
              <MenuFolder key={settings.folder.version} folder={settings.folder} tone="dark" />
            </div>
          )}
        </div>
      </section>

      {/* ───────── Snel naar: vandaag, adres, bellen ───────── */}
      <section className="border-b border-line bg-white" aria-label="Snel naar">
        <dl className="container-site grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="py-5 sm:pr-6">
            <dt className="text-xs font-bold uppercase tracking-[0.1em] text-muted [font-stretch:85%]">Vandaag</dt>
            <dd className="mt-1 text-lg font-bold tabular-nums">{status.todayHours}</dd>
            <dd>
              <a href="#openingstijden" className="text-sm font-semibold underline decoration-tomato decoration-2 underline-offset-4 hover:text-tomato-dark">
                Alle openingstijden
              </a>
            </dd>
          </div>
          {settings.street && (
            <div className="py-5 sm:px-6">
              <dt className="text-xs font-bold uppercase tracking-[0.1em] text-muted [font-stretch:85%]">Adres</dt>
              <dd className="mt-1 text-lg font-bold">
                {settings.street}, {settings.city}
              </dd>
              {settings.routeUrl && (
                <dd>
                  <a
                    href={settings.routeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold underline decoration-tomato decoration-2 underline-offset-4 hover:text-tomato-dark"
                  >
                    Route plannen
                  </a>
                </dd>
              )}
            </div>
          )}
          <div className="py-5 sm:pl-6">
            <dt className="text-xs font-bold uppercase tracking-[0.1em] text-muted [font-stretch:85%]">Bestellen en reserveren</dt>
            <dd className="mt-1 text-lg font-bold tabular-nums">
              <a href={phoneHref} className="hover:text-tomato-dark">
                {settings.phoneDisplay}
              </a>
            </dd>
            <dd>
              <Link href="/contact" className="text-sm font-semibold underline decoration-tomato decoration-2 underline-offset-4 hover:text-tomato-dark">
                Of stuur een bericht
              </Link>
            </dd>
          </div>
        </dl>
      </section>

      {/* ───────── Waar heb je zin in? ───────── */}
      {menu.length > 1 && (
        <section className="container-site pt-16 md:pt-20" aria-labelledby="zin-titel">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between" data-reveal>
            <div>
              <h2 id="zin-titel" className="text-[2.4rem] md:text-6xl">
                Waar heb je zin in?
              </h2>
              <p className="mt-2 text-lg text-ink-soft">Kies je favoriet, bekijk de gerechten en bel je bestelling door.</p>
            </div>
            <Link href="/menukaart" className="link-arrow self-start md:self-auto">
              Hele menukaart <ArrowRightIcon size={18} />
            </Link>
          </div>
          <div className="mt-8">
            <CategoryTiles menu={menu} />
          </div>
        </section>
      )}

      {/* ───────── Welkom en populaire gerechten ───────── */}
      <section className="container-site grid gap-12 py-16 md:py-24 lg:grid-cols-12 lg:gap-16" aria-labelledby="intro-titel">
        <div className="lg:col-span-4" data-reveal>
          <h2 id="intro-titel" className="text-[2.4rem] md:text-6xl">
            {settings.introTitle}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-soft">{settings.introText}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/menukaart" className="btn btn-primary">
              Hele menukaart <ArrowRightIcon size={18} />
            </Link>
            {settings.menuPdfUrl && (
              <a href={settings.menuPdfUrl} className="btn btn-outline">
                <DownloadIcon size={18} /> PDF
              </a>
            )}
          </div>
        </div>
        <div className="lg:col-span-8" aria-labelledby={showFeatured ? 'menu-titel' : undefined}>
          {showFeatured ? (
            <>
              <h2 id="menu-titel" className="menu-banner text-[1.35rem]" data-reveal>
                Populair
              </h2>
              <ul className="mt-3 grid md:grid-cols-2 md:gap-x-12">
                {featured.map((item, i) => (
                  <MenuItemRow key={item.id} item={item} showCategory reveal={i} />
                ))}
              </ul>
            </>
          ) : (
            menu.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Categorieën op de menukaart">
                {menu.map((c) => (
                  <li key={c.id}>
                    <Link href={`/menukaart#${c.slug}`} className="menu-banner text-lg hover:bg-tomato-dark">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      </section>

      {/* ───────── Aanbiedingen (alleen als er actieve aanbiedingen zijn) ───────── */}
      {offers.length > 0 && (
        <section className="container-site pb-16 md:pb-24" aria-labelledby="aanbiedingen-titel">
          <h2 id="aanbiedingen-titel" className="mb-8 text-[2.4rem] md:text-5xl" data-reveal>
            Aanbiedingen
          </h2>
          <OffersList offers={offers} />
        </section>
      )}

      {/* ───────── Over ons ───────── */}
      <section className="on-dark bg-char text-white" aria-labelledby="over-titel">
        <div className={`container-site grid items-center gap-10 py-16 md:py-24 ${aboutImage ? 'md:grid-cols-2 md:gap-16' : ''}`}>
          {aboutImage && (
            <div className="overflow-hidden rounded-[3px]" data-reveal>
              <Picture image={aboutImage} sizes="(min-width: 768px) 50vw, 100vw" className="aspect-[4/3] w-full object-cover" />
            </div>
          )}
          <div className={aboutImage ? '' : 'max-w-3xl'} data-reveal>
            <h2 id="over-titel" className="text-[2.4rem] md:text-6xl">
              {settings.aboutTitle}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-white/80">{settings.aboutText}</p>
            <Link href="/over-ons" className="link-arrow mt-5">
              Meer over ons <ArrowRightIcon size={18} />
            </Link>
          </div>
        </div>
        {highlights.length > 0 && (
          <div className="container-site pb-16 md:pb-24">
            <ul className="grid gap-8 md:grid-cols-3 md:gap-10">
              {highlights.map((h, i) => (
                <li key={h.id} className="border-t-[3px] border-tomato pt-5" data-reveal style={{ '--reveal-i': i } as React.CSSProperties}>
                  <h3 className="text-[1.6rem]">{h.title}</h3>
                  <p className="mt-2 text-white/75">{h.body}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ───────── Galerij-voorproefje ───────── */}
      {showGallery && (
        <section className="container-site py-16 md:py-24" aria-labelledby="galerij-titel">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <h2 id="galerij-titel" className="text-[2.4rem] md:text-6xl" data-reveal>
              Een kijkje bij ons
            </h2>
            <Link href="/galerij" className="link-arrow self-start md:self-auto">
              Bekijk alle foto&apos;s <ArrowRightIcon size={18} />
            </Link>
          </div>
          {gallery.length >= 5 ? (
            // Mosaic: one large photo and four smaller ones.
            <ul className="mt-8 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 md:grid-rows-2">
              {gallery.slice(0, 5).map((img, i) => (
                <li
                  key={img.id}
                  className={`overflow-hidden rounded-[3px] bg-line ${i === 0 ? 'col-span-2 row-span-2' : ''} ${i === 4 ? 'hidden md:block' : ''}`}
                >
                  <Link href="/galerij" className="group block h-full" aria-label={`Bekijk alle foto's${img.alt ? `: ${img.alt}` : ''}`}>
                    <Picture
                      image={img}
                      sizes={i === 0 ? '(min-width: 768px) 50vw, 100vw' : '(min-width: 768px) 25vw, 50vw'}
                      alt=""
                      className="aspect-square h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            // Few photos: an even row that never looks half-empty.
            <ul
              className={`mt-8 grid gap-2 sm:gap-3 ${gallery.length === 1 ? 'grid-cols-1' : gallery.length === 2 ? 'grid-cols-2' : gallery.length === 3 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-4'}`}
            >
              {gallery.map((img, i) => (
                <li key={img.id} className={`overflow-hidden rounded-[3px] bg-line ${gallery.length === 3 && i === 2 ? 'col-span-2 md:col-span-1' : ''}`}>
                  <Link href="/galerij" className="group block h-full" aria-label={`Bekijk alle foto's${img.alt ? `: ${img.alt}` : ''}`}>
                    <Picture
                      image={img}
                      sizes={gallery.length === 1 ? '100vw' : '(min-width: 768px) 33vw, 50vw'}
                      alt=""
                      className={`h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] ${gallery.length === 1 ? 'aspect-[16/9]' : 'aspect-[4/3]'}`}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ───────── Openingstijden en locatie ───────── */}
      <section id="openingstijden" className="border-t border-line bg-white" aria-labelledby="tijden-titel">
        <div className="container-site grid gap-12 py-16 md:py-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <div data-reveal>
            <h2 id="tijden-titel" className="text-[2.4rem] md:text-5xl">
              Openingstijden
            </h2>
            <div className="mt-4">
              <OpeningStatus schedule={schedule} initial={status} />
            </div>
            <div className="mt-6">
              <HoursTable schedule={schedule} now={now} />
            </div>
            <ul className="mt-8 space-y-1 text-lg">
              <li>
                <a href={phoneHref} className="inline-flex min-h-11 items-center gap-3 font-semibold hover:text-tomato-dark">
                  <PhoneIcon className="text-tomato" /> {settings.phoneDisplay}
                </a>
              </li>
              <li>
                <a href={`mailto:${settings.email}`} className="inline-flex min-h-11 items-center gap-3 break-all hover:text-tomato-dark">
                  <MailIcon className="shrink-0 text-tomato" /> {settings.email}
                </a>
              </li>
            </ul>
          </div>
          <div data-reveal style={{ '--reveal-i': 1 } as React.CSSProperties}>
            <h2 id="locatie-titel" className="text-[2.4rem] md:text-5xl">
              Zo vind je ons
            </h2>
            <p className="mt-3 text-lg text-ink-soft">
              {settings.businessName} in {settings.city}. Kom langs om af te halen of om in ons restaurant te eten.
            </p>
            <div className="mt-6">
              {settings.street ? (
                <LocationCard businessName={settings.businessName} street={settings.street} postalCode={settings.postalCode} city={settings.city} />
              ) : (
                <address className="flex gap-3 text-lg not-italic">
                  <PinIcon className="mt-1 shrink-0 text-tomato" />
                  {settings.city}
                </address>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Restaurant / reserveren ───────── */}
      <section className="on-dark bg-tomato text-white" aria-labelledby="reserveren-titel">
        <div className="container-site flex flex-col gap-6 py-12 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl" data-reveal>
            <h2 id="reserveren-titel" className="text-[2rem] md:text-5xl">
              Eten in ons restaurant
            </h2>
            <p className="mt-2 text-lg text-white">{settings.reservationText}</p>
          </div>
          <a href={phoneHref} className="btn shrink-0 bg-white !text-ink hover:bg-paper">
            <PhoneIcon size={18} /> Bel {settings.phoneDisplay}
          </a>
        </div>
      </section>
    </>
  );
}
