'use client';

/* eslint-disable @next/next/no-img-element -- admin preview */
import Link from 'next/link';
import { saveHighlights, savePageSeo, saveWebsiteContent } from '@/app/admin/(panel)/website/actions';
import { Field, Toggle } from '@/components/admin/fields';
import { PageTitle } from '@/components/admin/page-title';
import { ImagePicker, type PickedImage } from '@/components/admin/photos/image-picker';
import { SectionForm } from '@/components/admin/section-form';
import { HighlightIcon } from '@/components/site/highlight-icon';
import { ArrowRightIcon, ChevronDownIcon, ChevronUpIcon, ExternalIcon, PlusIcon, TrashIcon } from '@/components/ui/icons';
import type { HighlightIcon as IconName, PageKey } from '@/lib/db/schema';

export type WebsiteData = {
  hero: { heroTitle: string; heroText: string; heroImage: PickedImage };
  intro: { introTitle: string; introText: string };
  about: { aboutTitle: string; aboutText: string; aboutStory: string; aboutImage: PickedImage };
  texts: { reservationText: string; waitingAreaText: string; allergenText: string };
  home: { showFeaturedMenuOnHome: boolean; showGalleryOnHome: boolean };
  footer: { footerText: string };
  highlights: Array<{ title: string; body: string; icon: IconName; isVisible: boolean }>;
  seo: Array<{ pageKey: PageKey; label: string; path: string; title: string; description: string }>;
  contact: { phone: string; email: string; address: string };
  host: string;
  businessName: string;
  tagline: string;
};

const ICONS: Array<{ value: IconName; label: string }> = [
  { value: 'seat', label: 'Stoel' },
  { value: 'pizza', label: 'Pizza' },
  { value: 'clock', label: 'Klok' },
  { value: 'grill', label: 'Grill' },
  { value: 'heart', label: 'Hart' },
  { value: 'bag', label: 'Tas' },
];

function TextArea({
  id,
  value,
  onChange,
  max,
  rows = 3,
  error,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  rows?: number;
  error?: string;
}) {
  return (
    <textarea id={id} className="admin-input" rows={rows} maxLength={max} value={value} aria-invalid={!!error} onChange={(e) => onChange(e.target.value)} />
  );
}

export function WebsiteView({ data }: { data: WebsiteData }) {
  return (
    <>
      <PageTitle
        title="Website"
        description="Pas de teksten en foto's van de website aan. Elk onderdeel heeft een eigen knop Opslaan."
        actions={
          <a href="/" target="_blank" rel="noopener" className="admin-btn admin-btn-secondary">
            <ExternalIcon size={18} /> Voorbeeld bekijken
          </a>
        }
      />

      <nav aria-label="Onderdelen" className="mb-6 flex flex-wrap gap-2 text-[0.95rem]">
        {[
          ['#hoofdfoto', 'Bovenaan de homepage'],
          ['#welkom', 'Welkomsttekst'],
          ['#over-ons', 'Over ons'],
          ['#waarom', 'Waarom wij'],
          ['#teksten', 'Restaurant en allergenen'],
          ['#homepage', 'Homepage-onderdelen'],
          ['#footer', 'Onderaan'],
          ['#zoekmachines', 'Google'],
        ].map(([href, label]) => (
          <a key={href} href={href} className="rounded-full border border-line-strong bg-white px-3.5 py-2 hover:border-ink">
            {label}
          </a>
        ))}
      </nav>

      <div className="space-y-6">
        <SectionForm
          id="hoofdfoto"
          title="Bovenaan de homepage"
          description="Het eerste wat bezoekers zien: een grote foto met de naam en een korte tekst."
          initial={data.hero}
          save={(v) => saveWebsiteContent({ heroTitle: v.heroTitle, heroText: v.heroText, heroImageId: v.heroImage?.id ?? null })}
        >
          {(v, set, e) => (
            <>
              <div>
                <p className="mb-2 font-semibold">Hoofdfoto</p>
                <ImagePicker
                  label="Hoofdfoto van de homepage"
                  value={v.heroImage}
                  onChange={(img) => set('heroImage', img)}
                  removeLabel="Geen foto gebruiken"
                  uploadVisibleByDefault
                />
                {!v.heroImage && <p className="mt-2 text-sm text-muted">Zonder foto toont de homepage een donkere achtergrond met tekst.</p>}
              </div>
              <Field label="Titel" htmlFor="w-hero-titel" error={e.heroTitle} counter={{ value: v.heroTitle.length, max: 80 }}>
                <input id="w-hero-titel" className="admin-input" maxLength={80} value={v.heroTitle} onChange={(x) => set('heroTitle', x.target.value)} />
              </Field>
              <Field label="Korte tekst" htmlFor="w-hero-tekst" error={e.heroText} counter={{ value: v.heroText.length, max: 300, ideal: 160 }}>
                <TextArea id="w-hero-tekst" value={v.heroText} max={300} onChange={(x) => set('heroText', x)} error={e.heroText} />
              </Field>
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">Voorbeeld</p>
                <div className="relative isolate overflow-hidden rounded-md bg-char px-5 pb-6 pt-16 text-paper">
                  {v.heroImage && (
                    <>
                      <img src={v.heroImage.thumbUrl} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
                      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgba(29,21,17,0.94),rgba(29,21,17,0.35))]" />
                    </>
                  )}
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#f0b48a]">{data.tagline}</p>
                  <p className="mt-1 font-display text-4xl leading-none">{v.heroTitle || ' '}</p>
                  <p className="mt-3 max-w-md text-sm text-paper/85">{v.heroText}</p>
                </div>
              </div>
            </>
          )}
        </SectionForm>

        <SectionForm
          id="welkom"
          title="Welkomsttekst"
          description="De korte introductie onder de grote foto op de homepage."
          initial={data.intro}
          save={(v) => saveWebsiteContent(v)}
        >
          {(v, set, e) => (
            <>
              <Field label="Titel" htmlFor="w-intro-titel" error={e.introTitle}>
                <input id="w-intro-titel" className="admin-input" maxLength={100} value={v.introTitle} onChange={(x) => set('introTitle', x.target.value)} />
              </Field>
              <Field label="Tekst" htmlFor="w-intro-tekst" error={e.introText} counter={{ value: v.introText.length, max: 1000 }}>
                <TextArea id="w-intro-tekst" value={v.introText} max={1000} rows={4} onChange={(x) => set('introText', x)} error={e.introText} />
              </Field>
            </>
          )}
        </SectionForm>

        <SectionForm
          id="over-ons"
          title="Over ons"
          description="De korte tekst staat op de homepage; het volledige verhaal op de pagina Over ons."
          initial={data.about}
          save={(v) =>
            saveWebsiteContent({ aboutTitle: v.aboutTitle, aboutText: v.aboutText, aboutStory: v.aboutStory, aboutImageId: v.aboutImage?.id ?? null })
          }
          extraActions={
            <a href="/over-ons" target="_blank" rel="noopener" className="admin-btn admin-btn-ghost">
              <ExternalIcon size={18} /> Voorbeeld bekijken
            </a>
          }
        >
          {(v, set, e) => (
            <>
              <Field label="Titel" htmlFor="w-over-titel" error={e.aboutTitle}>
                <input id="w-over-titel" className="admin-input" maxLength={100} value={v.aboutTitle} onChange={(x) => set('aboutTitle', x.target.value)} />
              </Field>
              <Field label="Korte tekst (homepage)" htmlFor="w-over-kort" error={e.aboutText} counter={{ value: v.aboutText.length, max: 800 }}>
                <TextArea id="w-over-kort" value={v.aboutText} max={800} rows={3} onChange={(x) => set('aboutText', x)} error={e.aboutText} />
              </Field>
              <Field
                label="Het verhaal (pagina Over ons)"
                htmlFor="w-over-verhaal"
                hint="Laat een lege regel tussen alinea's."
                error={e.aboutStory}
                counter={{ value: v.aboutStory.length, max: 5000 }}
              >
                <TextArea id="w-over-verhaal" value={v.aboutStory} max={5000} rows={8} onChange={(x) => set('aboutStory', x)} error={e.aboutStory} />
              </Field>
              <div>
                <p className="mb-2 font-semibold">
                  Foto <span className="text-sm font-normal text-muted">(optioneel)</span>
                </p>
                <ImagePicker label="Foto bij Over ons" value={v.aboutImage} onChange={(img) => set('aboutImage', img)} uploadVisibleByDefault />
                {!v.aboutImage && <p className="mt-2 text-sm text-muted">Zonder eigen foto wordt een foto uit de galerij gebruikt.</p>}
              </div>
            </>
          )}
        </SectionForm>

        <SectionForm
          id="waarom"
          title="Waarom wij"
          description="De punten in het blok ‘Waarom Pizzeria Sarah?’ op de homepage en bij Over ons. Houd het eerlijk en concreet."
          initial={{ items: data.highlights }}
          save={(v) => saveHighlights(v)}
        >
          {(v, set, e) => (
            <>
              <ol className="space-y-4">
                {v.items.map((item, i) => {
                  const update = (patch: Partial<typeof item>) =>
                    set(
                      'items',
                      v.items.map((x, j) => (j === i ? { ...x, ...patch } : x)),
                    );
                  const move = (d: -1 | 1) => {
                    const next = [...v.items];
                    const [m] = next.splice(i, 1);
                    next.splice(i + d, 0, m!);
                    set('items', next);
                  };
                  return (
                    <li key={i} className="rounded-md border border-line p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="font-semibold">Punt {i + 1}</p>
                        <div className="flex">
                          <button
                            type="button"
                            disabled={i === 0}
                            onClick={() => move(-1)}
                            className="inline-flex size-10 items-center justify-center rounded-md hover:bg-paper disabled:opacity-30"
                            aria-label={`Punt ${i + 1} omhoog`}
                          >
                            <ChevronUpIcon size={18} />
                          </button>
                          <button
                            type="button"
                            disabled={i === v.items.length - 1}
                            onClick={() => move(1)}
                            className="inline-flex size-10 items-center justify-center rounded-md hover:bg-paper disabled:opacity-30"
                            aria-label={`Punt ${i + 1} omlaag`}
                          >
                            <ChevronDownIcon size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              set(
                                'items',
                                v.items.filter((_, j) => j !== i),
                              )
                            }
                            className="inline-flex size-10 items-center justify-center rounded-md text-muted hover:bg-paper hover:text-tomato-dark"
                            aria-label={`Punt ${i + 1} verwijderen`}
                          >
                            <TrashIcon size={18} />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <Field label="Titel" htmlFor={`h-titel-${i}`} error={e[`items.${i}.title`]}>
                          <input
                            id={`h-titel-${i}`}
                            className="admin-input"
                            maxLength={60}
                            value={item.title}
                            onChange={(x) => update({ title: x.target.value })}
                          />
                        </Field>
                        <Field label="Tekst" htmlFor={`h-tekst-${i}`} error={e[`items.${i}.body`]}>
                          <TextArea id={`h-tekst-${i}`} value={item.body} max={300} rows={2} onChange={(x) => update({ body: x })} />
                        </Field>
                        <fieldset>
                          <legend className="mb-2 font-semibold">Pictogram</legend>
                          <div className="flex flex-wrap gap-2">
                            {ICONS.map((icon) => (
                              <label
                                key={icon.value}
                                className={`inline-flex size-12 cursor-pointer items-center justify-center rounded-md border ${item.icon === icon.value ? 'border-tomato bg-tomato-soft text-tomato' : 'border-line-strong text-ink-soft'}`}
                              >
                                <input
                                  type="radio"
                                  name={`icon-${i}`}
                                  className="sr-only"
                                  checked={item.icon === icon.value}
                                  onChange={() => update({ icon: icon.value })}
                                />
                                <HighlightIcon name={icon.value} size={22} />
                                <span className="sr-only">{icon.label}</span>
                              </label>
                            ))}
                          </div>
                        </fieldset>
                        <Toggle checked={item.isVisible} onChange={(x) => update({ isVisible: x })} label="Tonen op de website" />
                      </div>
                    </li>
                  );
                })}
              </ol>
              {v.items.length < 6 && (
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary admin-btn-sm"
                  onClick={() => set('items', [...v.items, { title: '', body: '', icon: 'heart', isVisible: true }])}
                >
                  <PlusIcon size={16} /> Punt toevoegen
                </button>
              )}
            </>
          )}
        </SectionForm>

        <SectionForm id="teksten" title="Restaurant, wachtruimte en allergenen" initial={data.texts} save={(v) => saveWebsiteContent(v)}>
          {(v, set, e) => (
            <>
              <Field
                label="Eten in het restaurant / reserveren"
                htmlFor="w-reserveren"
                hint="Staat op de homepage, bij Over ons en bij Contact."
                error={e.reservationText}
              >
                <TextArea
                  id="w-reserveren"
                  value={v.reservationText}
                  max={400}
                  rows={2}
                  onChange={(x) => set('reservationText', x)}
                  error={e.reservationText}
                />
              </Field>
              <Field label="Wachtruimte" htmlFor="w-wachtruimte" hint="Staat op de pagina Over ons." error={e.waitingAreaText}>
                <TextArea
                  id="w-wachtruimte"
                  value={v.waitingAreaText}
                  max={500}
                  rows={2}
                  onChange={(x) => set('waitingAreaText', x)}
                  error={e.waitingAreaText}
                />
              </Field>
              <Field label="Allergeneninformatie" htmlFor="w-allergenen" hint="Staat goed zichtbaar bovenaan de menukaart." error={e.allergenText}>
                <TextArea id="w-allergenen" value={v.allergenText} max={800} rows={3} onChange={(x) => set('allergenText', x)} error={e.allergenText} />
              </Field>
            </>
          )}
        </SectionForm>

        <SectionForm id="homepage" title="Onderdelen op de homepage" initial={data.home} save={(v) => saveWebsiteContent(v)}>
          {(v, set) => (
            <>
              <Toggle
                checked={v.showFeaturedMenuOnHome}
                onChange={(x) => set('showFeaturedMenuOnHome', x)}
                label="Uitgelichte gerechten tonen"
                description="Gerechten met een ster bij Menukaart."
              />
              <Toggle
                checked={v.showGalleryOnHome}
                onChange={(x) => set('showGalleryOnHome', x)}
                label="Foto's tonen"
                description="Een selectie uit de galerij; uitgelichte foto's komen eerst."
              />
            </>
          )}
        </SectionForm>

        <SectionForm
          id="footer"
          title="Onderaan de website"
          description="De korte tekst in de donkere balk onderaan elke pagina."
          initial={data.footer}
          save={(v) => saveWebsiteContent(v)}
        >
          {(v, set, e) => (
            <Field label="Tekst" htmlFor="w-footer" error={e.footerText}>
              <TextArea id="w-footer" value={v.footerText} max={300} rows={2} onChange={(x) => set('footerText', x)} error={e.footerText} />
            </Field>
          )}
        </SectionForm>

        <div className="admin-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="font-display text-2xl">Contactgegevens</h2>
            <p className="text-[0.95rem] text-muted">
              {data.contact.phone} · {data.contact.email}
              <br />
              {data.contact.address}
            </p>
          </div>
          <Link href="/admin/instellingen#bedrijf" className="admin-btn admin-btn-secondary">
            Wijzigen <ArrowRightIcon size={18} />
          </Link>
        </div>

        <section id="zoekmachines" className="scroll-mt-24" aria-labelledby="zoekmachines-titel">
          <h2 id="zoekmachines-titel" className="font-display text-3xl">
            Zoekmachines (Google)
          </h2>
          <p className="mb-4 mt-1 text-muted">
            Zo kan elke pagina in Google verschijnen. Houd de titel kort (rond 60 tekens) en de beschrijving rond 150 tekens.
          </p>
          <div className="space-y-4">
            {data.seo.map((page) => (
              <SectionForm
                key={page.pageKey}
                title={page.label}
                initial={{ title: page.title, description: page.description }}
                save={(v) => savePageSeo({ pageKey: page.pageKey, ...v })}
              >
                {(v, set, e) => (
                  <>
                    <Field label="Titel in Google" htmlFor={`seo-t-${page.pageKey}`} error={e.title} counter={{ value: v.title.length, max: 120, ideal: 60 }}>
                      <input
                        id={`seo-t-${page.pageKey}`}
                        className="admin-input"
                        maxLength={120}
                        value={v.title}
                        onChange={(x) => set('title', x.target.value)}
                      />
                    </Field>
                    <Field
                      label="Beschrijving in Google"
                      htmlFor={`seo-d-${page.pageKey}`}
                      error={e.description}
                      counter={{ value: v.description.length, max: 320, ideal: 155 }}
                    >
                      <TextArea
                        id={`seo-d-${page.pageKey}`}
                        value={v.description}
                        max={320}
                        rows={2}
                        onChange={(x) => set('description', x)}
                        error={e.description}
                      />
                    </Field>
                    <div className="rounded-md border border-line bg-white p-4" aria-label="Voorbeeld in Google">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Voorbeeld</p>
                      <p className="mt-2 truncate text-sm text-[#202124]">
                        {data.host}
                        {page.path === '/' ? '' : ` › ${page.path.slice(1)}`}
                      </p>
                      <p className="truncate text-lg leading-snug text-[#1a0dab]">{v.title.length > 62 ? `${v.title.slice(0, 60)}…` : v.title}</p>
                      <p className="line-clamp-2 text-sm text-[#4d5156]">{v.description.length > 160 ? `${v.description.slice(0, 157)}…` : v.description}</p>
                    </div>
                  </>
                )}
              </SectionForm>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
