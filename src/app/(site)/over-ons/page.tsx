import Link from 'next/link';
import { JsonLd } from '@/components/site/json-ld';
import { PageHeader } from '@/components/site/page-header';
import { Picture } from '@/components/site/picture';
import { ArrowRightIcon, PhoneIcon } from '@/components/ui/icons';
import { getGalleryPreview, getHighlights, getSettings } from '@/lib/content/queries';
import { telHref } from '@/lib/format';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';

export const generateMetadata = () => pageMetadata('over-ons');

export default async function AboutPage() {
  const [settings, highlights, gallery] = await Promise.all([getSettings(), getHighlights(), getGalleryPreview(4)]);
  const mainImage = settings.aboutImage ?? gallery[0] ?? null;
  const extraImages = gallery.filter((g) => g.id !== mainImage?.id).slice(0, 3);
  const paragraphs = settings.aboutStory
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const services = settings.tagline
    .split('·')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Over ons', path: '/over-ons' }])} />
      <PageHeader eyebrow={settings.foundedYear ? `Sinds ${settings.foundedYear} in ${settings.city}` : undefined} title="Over ons" />

      <section className="container-site grid gap-12 py-16 md:grid-cols-12 md:py-24" aria-labelledby="verhaal-titel">
        <div className={mainImage ? 'md:col-span-6 lg:col-span-5' : 'md:col-span-8'}>
          <h2 id="verhaal-titel" className="text-3xl md:text-4xl">
            {settings.aboutTitle}
          </h2>
          <div className="prose-site mt-6 text-lg leading-relaxed text-ink-soft">
            {paragraphs.map((p) => (
              <p key={p.slice(0, 32)}>{p}</p>
            ))}
          </div>
        </div>
        {mainImage && (
          <div className="md:col-span-6 lg:col-span-6 lg:col-start-7">
            <figure>
              <div className="overflow-hidden rounded-sm bg-line">
                <Picture image={mainImage} sizes="(min-width: 768px) 50vw, 100vw" priority className="aspect-[4/3] w-full object-cover" />
              </div>
              {mainImage.caption && <figcaption className="mt-3 text-sm text-muted">{mainImage.caption}</figcaption>}
            </figure>
          </div>
        )}
      </section>

      {highlights.length > 0 && (
        <section className="border-y border-line bg-white" aria-labelledby="bij-ons-titel">
          <div className="container-site py-16 md:py-24">
            <h2 id="bij-ons-titel" className="text-3xl md:text-4xl">
              Bij ons
            </h2>
            <ul className="mt-10 grid gap-10 md:grid-cols-3">
              {highlights.map((h, i) => (
                <li key={h.id} className="border-t-[3px] border-tomato pt-5" data-reveal style={{ '--reveal-i': i } as React.CSSProperties}>
                  <h3 className="text-2xl">{h.title}</h3>
                  <p className="mt-2 text-ink-soft">{h.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="container-site grid gap-12 py-16 md:grid-cols-2 md:gap-16 md:py-24" aria-labelledby="restaurant-titel">
        <div data-reveal>
          <h2 id="restaurant-titel" className="text-3xl md:text-4xl">
            Restaurant en wachtruimte
          </h2>
          <p className="mt-5 text-lg text-ink-soft">{settings.waitingAreaText}</p>
          <p className="mt-4 text-lg text-ink-soft">{settings.reservationText}</p>
          <a href={telHref(settings.phoneE164)} className="btn btn-primary mt-8">
            <PhoneIcon size={18} /> Bel {settings.phoneDisplay}
          </a>
        </div>
        <div data-reveal style={{ '--reveal-i': 1 } as React.CSSProperties}>
          <h2 className="text-3xl md:text-4xl">Bedrijfsgegevens</h2>
          <dl className="mt-6 divide-y divide-line border-y border-line">
            {[
              ['Naam', settings.businessName],
              [
                'Soort zaak',
                [...services, 'restaurant']
                  .join(', ')
                  .toLowerCase()
                  .replace(/^./, (c) => c.toUpperCase()),
              ],
              settings.foundedYear ? ['Gevestigd sinds', String(settings.foundedYear)] : null,
              ['Adres', settings.fullAddress],
              ['Telefoon', settings.phoneDisplay],
              ['E-mail', settings.email],
            ]
              .filter((row): row is string[] => Boolean(row && row[1]))
              .map(([label, value]) => (
                <div key={label} className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between sm:gap-6">
                  <dt className="text-muted">{label}</dt>
                  <dd className="break-words font-medium sm:text-right">{value}</dd>
                </div>
              ))}
          </dl>
        </div>
      </section>

      {extraImages.length > 0 && (
        <section className="container-site pb-16 md:pb-24" aria-label="Foto's">
          <ul className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3">
            {extraImages.map((img, i) => (
              <li key={img.id} className={`overflow-hidden rounded-sm bg-line ${i === 2 ? 'hidden md:block' : ''}`}>
                <Picture image={img} sizes="(min-width: 768px) 33vw, 50vw" className="aspect-square w-full object-cover" />
              </li>
            ))}
          </ul>
          <Link href="/galerij" className="link-arrow mt-6">
            Bekijk alle foto&apos;s <ArrowRightIcon size={18} />
          </Link>
        </section>
      )}

      <section className="on-dark bg-char text-paper" aria-labelledby="cta-titel">
        <div className="container-site flex flex-col gap-6 py-14 md:flex-row md:items-center md:justify-between">
          <h2 id="cta-titel" className="text-3xl md:text-4xl">
            Zin gekregen?
          </h2>
          <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap">
            <Link href="/menukaart" className="btn btn-primary">
              Menukaart bekijken
            </Link>
            <Link href="/contact" className="btn btn-outline">
              Contact en openingstijden
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
