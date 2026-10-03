import { JsonLd } from '@/components/site/json-ld';
import { PageHeader } from '@/components/site/page-header';
import { getSettings } from '@/lib/content/queries';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';

export const generateMetadata = () => pageMetadata('privacy');

export default async function PrivacyPage() {
  const s = await getSettings();
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Privacyverklaring', path: '/privacy' }])} />
      <PageHeader title={'Privacy\u00ADverklaring'} />
      <div className="container-site py-14 md:py-20">
        <div className="prose-site max-w-3xl text-[1.05rem] leading-relaxed text-ink-soft">
          <p>
            {s.businessName} vindt het belangrijk dat er zorgvuldig met je persoonsgegevens wordt omgegaan. In deze privacyverklaring lees je welke gegevens we
            via deze website verwerken, waarom we dat doen en welke rechten je hebt.
          </p>

          <h2>Wie zijn wij?</h2>
          <p>
            {s.businessName}
            {s.fullAddress ? `, ${s.fullAddress}` : `, ${s.city}`}. Je kunt ons bereiken via <a href={`mailto:${s.email}`}>{s.email}</a> of telefonisch op{' '}
            {s.phoneDisplay}.
          </p>

          <h2>Welke gegevens verwerken we?</h2>
          <h3>Contactformulier</h3>
          <p>
            Als je het contactformulier invult, ontvangen we je naam, e-mailadres, het onderwerp en je bericht. We gebruiken deze gegevens alleen om je vraag te
            beantwoorden. De grondslag hiervoor is je toestemming en ons gerechtvaardigd belang om op vragen te reageren. Berichten worden uiterlijk twaalf
            maanden na ontvangst automatisch verwijderd.
          </p>
          <h3>Bescherming tegen spam</h3>
          <p>
            Om misbruik van het formulier te voorkomen, kunnen we gebruikmaken van Cloudflare Turnstile. Daarbij worden technische gegevens van je browser
            gecontroleerd om te bepalen of het formulier door een mens wordt ingevuld. Daarnaast wordt het aantal verzonden berichten per internetverbinding
            tijdelijk beperkt; hiervoor bewaren we een onherleidbare code, geen leesbaar IP-adres.
          </p>
          <h3>Bezoek aan de website</h3>
          <p>
            We gebruiken geen trackingcookies, geen advertentiecookies en geen analysediensten van derden. Onze server houdt, zoals bij elke website, tijdelijk
            technische logbestanden bij voor de beveiliging en het oplossen van storingen.
          </p>
          <h3>Cookies</h3>
          <p>
            Wij plaatsen zelf geen cookies bij bezoekers van de website (zie hieronder voor de kaart van Google Maps). Alleen het beheergedeelte, dat
            uitsluitend door de eigenaar wordt gebruikt, gebruikt strikt noodzakelijke cookies om ingelogd te blijven.
          </p>
          <h3>Kaart en route plannen</h3>
          <p>
            De kaart van Google Maps op onze website wordt pas geladen als je op &lsquo;Kaart tonen&rsquo; klikt. Pas dan maakt je browser verbinding met
            Google, dat daarbij cookies kan plaatsen. Klik je op &lsquo;Route plannen&rsquo; of &lsquo;Apple Kaarten&rsquo;, dan word je doorgestuurd naar die
            dienst. Op het gebruik daarvan is het privacybeleid van die dienst van toepassing.
          </p>

          <h2>Met wie delen we gegevens?</h2>
          <p>
            We verkopen je gegevens nooit. Voor het versturen van e-mail en het hosten van de website maken we gebruik van zorgvuldig gekozen dienstverleners
            die je gegevens alleen in onze opdracht verwerken.
          </p>

          <h2>Je rechten</h2>
          <p>
            Je hebt het recht om je gegevens in te zien, te laten corrigeren of te laten verwijderen. Stuur hiervoor een e-mail naar{' '}
            <a href={`mailto:${s.email}`}>{s.email}</a>. Ben je niet tevreden over hoe we met je gegevens omgaan, dan kun je een klacht indienen bij de
            Autoriteit Persoonsgegevens.
          </p>

          <h2>Wijzigingen</h2>
          <p>We kunnen deze privacyverklaring aanpassen. De meest actuele versie staat altijd op deze pagina.</p>
        </div>
      </div>
    </>
  );
}
