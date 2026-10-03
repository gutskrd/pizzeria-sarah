import { JsonLd } from '@/components/site/json-ld';
import { PageHeader } from '@/components/site/page-header';
import { getSettings } from '@/lib/content/queries';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';

export const generateMetadata = () => pageMetadata('voorwaarden');

export default async function TermsPage() {
  const s = await getSettings();
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Voorwaarden', path: '/voorwaarden' }])} />
      <PageHeader title="Voorwaarden" />
      <div className="container-site py-14 md:py-20">
        <div className="prose-site max-w-3xl text-[1.05rem] leading-relaxed text-ink-soft">
          <p>Deze voorwaarden gelden voor het gebruik van de website van {s.businessName}. Door de website te gebruiken, ga je hiermee akkoord.</p>

          <h2>Informatie op de website</h2>
          <p>
            We doen ons best om de informatie op deze website, zoals de menukaart, prijzen, aanbiedingen en openingstijden, juist en actueel te houden. Toch kan
            het voorkomen dat informatie niet helemaal klopt of verouderd is. Aan de inhoud van deze website kunnen daarom geen rechten worden ontleend. De
            prijzen en het aanbod in de zaak zijn leidend.
          </p>

          <h2>Aanbiedingen</h2>
          <p>Aanbiedingen zijn geldig zolang ze op de website staan, binnen de vermelde periode en zolang de voorraad strekt, tenzij anders aangegeven.</p>

          <h2>Allergenen</h2>
          <p>
            In onze producten kunnen verschillende soorten allergenen aanwezig zijn. De informatie op de website is geen vervanging voor persoonlijk advies. Heb
            je een allergie, vraag dan altijd een medewerker naar de samenstelling van een product.
          </p>

          <h2>Bestellen en reserveren</h2>
          <p>Via deze website kun je niet online bestellen of betalen. Bestellingen en reserveringen gaan telefonisch via {s.phoneDisplay} of in de zaak.</p>

          <h2>Foto&apos;s en teksten</h2>
          <p>
            De teksten en foto&apos;s op deze website zijn eigendom van {s.businessName}. Het is niet toegestaan deze zonder toestemming over te nemen of te
            gebruiken.
          </p>

          <h2>Links naar andere websites</h2>
          <p>Deze website kan links bevatten naar websites van anderen, zoals Google Maps. Voor de inhoud van die websites zijn wij niet verantwoordelijk.</p>

          <h2>Vragen</h2>
          <p>
            Heb je een vraag over deze voorwaarden? Neem dan contact met ons op via <a href={`mailto:${s.email}`}>{s.email}</a> of bel {s.phoneDisplay}.
          </p>
        </div>
      </div>
    </>
  );
}
