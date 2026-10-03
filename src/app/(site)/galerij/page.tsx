import Link from 'next/link';
import { GalleryGrid } from '@/components/site/gallery-grid';
import { JsonLd } from '@/components/site/json-ld';
import { PageHeader } from '@/components/site/page-header';
import { getGalleryImages } from '@/lib/content/queries';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';

export const generateMetadata = () => pageMetadata('galerij');

export default async function GalleryPage() {
  const images = await getGalleryImages();
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Foto's", path: '/galerij' }])} />
      <PageHeader title="Foto's" intro="Een kijkje in onze zaak en bij onze gerechten." />
      <div className="container-site py-12 md:py-16">
        {images.length > 0 ? (
          <GalleryGrid images={images} />
        ) : (
          <div className="py-16 text-center">
            <p className="font-display text-3xl">Binnenkort meer foto&apos;s</p>
            <p className="mx-auto mt-3 max-w-md text-lg text-ink-soft">Er staan op dit moment nog geen foto&apos;s online. Kom gerust eens langs!</p>
            <Link href="/menukaart" className="btn btn-primary mt-8">
              Menukaart bekijken
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
