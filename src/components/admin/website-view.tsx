'use client';

/* eslint-disable @next/next/no-img-element -- admin preview */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { saveHighlights, savePageSeo, saveWebsiteContent } from '@/app/admin/(panel)/website/actions';
import { Field, Toggle } from '@/components/admin/fields';
import { PageTitle } from '@/components/admin/page-title';
import { ImagePicker, type PickedImage } from '@/components/admin/photos/image-picker';
import { SectionForm } from '@/components/admin/section-form';
import { useAdminAction } from '@/components/admin/use-admin-action';
import { useUnsavedChanges } from '@/components/admin/use-unsaved-changes';
import { ArrowRightIcon, ChevronDownIcon, ChevronUpIcon, EditIcon, ExternalIcon, PlusIcon, TrashIcon } from '@/components/ui/icons';
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
  /** For the preview: what the website shows from other parts of the admin. */
  featured: Array<{ name: string; price: string }>;
  categories: string[];
  todayHours: string;
};

type Highlight = WebsiteData['highlights'][number];

/** Everything that can be edited here, in one flat object (the live preview reads it). */
type Draft = {
  heroTitle: string;
  heroText: string;
  heroImage: PickedImage;
  introTitle: string;
  introText: string;
  aboutTitle: string;
  aboutText: string;
  aboutStory: string;
  aboutImage: PickedImage;
  reservationText: string;
  waitingAreaText: string;
  allergenText: string;
  footerText: string;
  showFeaturedMenuOnHome: boolean;
  showGalleryOnHome: boolean;
  highlights: Highlight[];
};

type BlockId = 'hero' | 'intro' | 'populair' | 'about' | 'highlights' | 'gallery' | 'reservation' | 'footer' | 'story' | 'waiting' | 'allergen';
type Tab = 'home' | 'over-ons' | 'menukaart' | 'google';

const BLOCKS: Record<BlockId, { title: string; where: string; keys: Array<keyof Draft> }> = {
  hero: {
    title: 'Bovenaan de homepage',
    where: 'Het eerste wat bezoekers zien: de naam, een korte zin en eventueel een grote foto.',
    keys: ['heroTitle', 'heroText', 'heroImage'],
  },
  intro: { title: 'Welkomsttekst', where: 'Op de homepage, naast de populaire gerechten.', keys: ['introTitle', 'introText'] },
  populair: {
    title: 'Populaire gerechten',
    where: 'Op de homepage. Welke gerechten hier staan, kies je met de ster bij Menukaart.',
    keys: ['showFeaturedMenuOnHome'],
  },
  about: {
    title: 'Over ons (homepage)',
    where: 'Het donkere blok op de homepage, met een foto als je die kiest.',
    keys: ['aboutTitle', 'aboutText', 'aboutImage'],
  },
  highlights: { title: 'Waarom bij ons', where: 'De korte punten onder Over ons, op de homepage en op de pagina Over ons.', keys: ['highlights'] },
  gallery: { title: "Foto's op de homepage", where: "Een paar foto's uit de galerij. De foto's zelf beheer je bij Foto's.", keys: ['showGalleryOnHome'] },
  reservation: { title: 'Eten in het restaurant', where: 'De rode balk onderaan de homepage, en bij Contact en Over ons.', keys: ['reservationText'] },
  footer: { title: 'Onderaan elke pagina', where: 'De korte tekst in de zwarte balk onderaan.', keys: ['footerText'] },
  story: { title: 'Ons verhaal', where: 'De pagina Over ons. De titel is dezelfde als op de homepage.', keys: ['aboutStory'] },
  waiting: { title: 'Wachtruimte', where: 'De pagina Over ons.', keys: ['waitingAreaText'] },
  allergen: { title: 'Allergeneninformatie', where: 'Goed zichtbaar bovenaan de menukaart.', keys: ['allergenText'] },
};

const HASH_TARGETS: Record<string, { tab: Tab; block?: BlockId }> = {
  zoekmachines: { tab: 'google' },
  hoofdfoto: { tab: 'home', block: 'hero' },
  welkom: { tab: 'home', block: 'intro' },
  'over-ons': { tab: 'home', block: 'about' },
  waarom: { tab: 'home', block: 'highlights' },
  teksten: { tab: 'home', block: 'reservation' },
  footer: { tab: 'home', block: 'footer' },
  allergenen: { tab: 'menukaart', block: 'allergen' },
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function WebsiteView({ data, previewClassName = '' }: { data: WebsiteData; previewClassName?: string }) {
  const initial: Draft = {
    ...data.hero,
    ...data.intro,
    ...data.about,
    ...data.texts,
    ...data.home,
    ...data.footer,
    highlights: data.highlights,
  };
  const [draft, setDraft] = useState<Draft>(initial);
  const [saved, setSaved] = useState<Draft>(initial);
  const [tab, setTab] = useState<Tab>('home');
  const [active, setActive] = useState<BlockId>('hero');
  const [saving, setSaving] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { run, fieldErrors } = useAdminAction();

  // Links from elsewhere in the admin, e.g. /admin/website#hoofdfoto or #zoekmachines.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const target = HASH_TARGETS[hash];
    if (!target) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the URL once after load
    setTab(target.tab);
    if (target.block) setActive(target.block);
  }, []);

  const isDirty = (id: BlockId) => BLOCKS[id].keys.some((k) => !same(draft[k], saved[k]));
  const anyDirty = (Object.keys(BLOCKS) as BlockId[]).some(isDirty);
  useUnsavedChanges(anyDirty);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const select = (id: BlockId) => {
    setActive(id);
    // On a phone the editor is below the preview: bring it into view.
    if (window.matchMedia('(max-width: 1279px)').matches) panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const save = async (id: BlockId) => {
    setSaving(true);
    const keys = BLOCKS[id].keys;
    let result;
    if (id === 'highlights') {
      result = await run(() => saveHighlights({ items: draft.highlights }));
    } else {
      const payload: Record<string, unknown> = {};
      for (const k of keys) {
        if (k === 'heroImage') payload.heroImageId = draft.heroImage?.id ?? null;
        else if (k === 'aboutImage') payload.aboutImageId = draft.aboutImage?.id ?? null;
        else payload[k] = draft[k];
      }
      result = await run(() => saveWebsiteContent(payload));
    }
    setSaving(false);
    if (result.ok) setSaved((s) => ({ ...s, ...Object.fromEntries(keys.map((k) => [k, draft[k]])) }));
  };

  const undo = (id: BlockId) => setDraft((d) => ({ ...d, ...Object.fromEntries(BLOCKS[id].keys.map((k) => [k, saved[k]])) }));

  const tabs: Array<{ id: Tab; label: string; first: BlockId | null }> = [
    { id: 'home', label: 'Homepage', first: 'hero' },
    { id: 'over-ons', label: 'Over ons', first: 'story' },
    { id: 'menukaart', label: 'Menukaart', first: 'allergen' },
    { id: 'google', label: 'Google', first: null },
  ];

  const block = (id: BlockId, children: React.ReactNode, className = '') => (
    <EditableBlock id={id} active={active === id} dirty={isDirty(id)} onSelect={select} className={className}>
      {children}
    </EditableBlock>
  );

  return (
    <>
      <PageTitle
        title="Website"
        description="Klik in het voorbeeld op het stuk dat je wilt veranderen. Je ziet je wijziging meteen; druk daarna op Opslaan."
        actions={
          <a href="/" target="_blank" rel="noopener" className="admin-btn admin-btn-secondary">
            <ExternalIcon size={18} /> Website bekijken
          </a>
        }
      />

      <div
        role="tablist"
        aria-label="Pagina"
        className="mb-5 grid grid-cols-4 gap-1 rounded-full border border-line bg-white p-1 sm:inline-grid sm:auto-cols-max sm:grid-flow-col sm:grid-cols-none"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              if (t.first) setActive(t.first);
            }}
            className="min-h-10 whitespace-nowrap rounded-full px-1.5 text-sm font-semibold text-ink-soft sm:px-4 sm:text-[0.95rem] transition-colors hover:text-ink aria-selected:bg-ink aria-selected:text-white"
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'google' ? (
        <SeoEditor data={data} />
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,1fr)]">
          {/* ───────── Live preview ───────── */}
          <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_24px_60px_-30px_rgba(35,26,21,0.35)]">
            <div className="flex items-center gap-2 border-b border-line bg-paper px-4 py-2.5" aria-hidden="true">
              <span className="size-2.5 rounded-full bg-[#e0a49a]" />
              <span className="size-2.5 rounded-full bg-[#e8cf98]" />
              <span className="size-2.5 rounded-full bg-[#a9cf9b]" />
              <span className="ml-2 truncate rounded-md bg-white px-3 py-1 text-xs text-muted">
                {data.host}
                {tab === 'home' ? '' : `/${tab}`}
              </span>
            </div>
            <div className={previewClassName}>
              <div className="text-[0.8rem] leading-normal" aria-label="Voorbeeld van de website">
                <PreviewHeader name={data.businessName} />
                {tab === 'home' && (
                  <>
                    {block(
                      'hero',
                      <div className="relative isolate overflow-hidden bg-char px-6 pb-7 pt-10 text-white">
                        {draft.heroImage ? (
                          <>
                            <img src={draft.heroImage.thumbUrl} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
                            <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(15,15,15,0.94),rgba(15,15,15,0.5))]" />
                          </>
                        ) : (
                          <div className="absolute -right-10 top-1/2 -z-10 h-10 w-2/3 -rotate-[8deg] bg-tomato" />
                        )}
                        <p className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-white/70">{data.tagline}</p>
                        <p className="mt-1 text-[2.4rem] font-extrabold uppercase leading-[0.9] [font-stretch:68%]">{draft.heroTitle || '…'}</p>
                        <p className="mt-3 max-w-sm text-white/85">{draft.heroText}</p>
                        <div className="mt-4 flex gap-2">
                          <span className="rounded-[3px] bg-tomato px-3 py-1.5 text-[0.65rem] font-bold uppercase">Bel {data.contact.phone}</span>
                          <span className="rounded-[3px] border border-white/70 px-3 py-1.5 text-[0.65rem] font-bold uppercase">Menukaart</span>
                        </div>
                      </div>,
                    )}
                    <Elsewhere label="Vandaag, adres en telefoon" href="/admin/instellingen" linkLabel="Instellingen">
                      <div className="grid grid-cols-3 divide-x divide-line border-b border-line bg-white px-6 py-3 text-[0.7rem]">
                        <span className="pr-2 font-bold">{data.todayHours}</span>
                        <span className="truncate px-2 font-bold">{data.contact.address}</span>
                        <span className="pl-2 font-bold">{data.contact.phone}</span>
                      </div>
                    </Elsewhere>
                    <Elsewhere label="Waar heb je zin in?" href="/admin/menukaart" linkLabel="Menukaart">
                      <div className="px-6 pt-5">
                        <p className="text-lg font-extrabold uppercase [font-stretch:78%]">Waar heb je zin in?</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {data.categories.slice(0, 10).map((c) => (
                            <span key={c} className="rounded-[3px] border border-line bg-white px-2 py-1 text-[0.65rem] font-bold uppercase">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    </Elsewhere>
                    <div className="grid gap-3 px-6 py-5 sm:grid-cols-[1fr_1.4fr]">
                      {block(
                        'intro',
                        <div className="p-2">
                          <p className="text-xl font-extrabold uppercase leading-none [font-stretch:78%]">{draft.introTitle || '…'}</p>
                          <p className="mt-2 line-clamp-5 text-ink-soft">{draft.introText}</p>
                        </div>,
                      )}
                      {block(
                        'populair',
                        <div className={`p-2 ${draft.showFeaturedMenuOnHome ? '' : 'opacity-40'}`}>
                          <span className="menu-banner !min-h-0 !py-0.5 text-[0.8rem]">Populair</span>
                          <ul className="mt-1.5 space-y-1">
                            {(data.featured.length ? data.featured : [{ name: 'Gerechten met een ster', price: '' }]).slice(0, 4).map((f) => (
                              <li key={f.name} className="flex justify-between gap-2 border-b border-line pb-1 text-[0.72rem] font-semibold">
                                <span className="truncate">{f.name}</span>
                                <span>{f.price}</span>
                              </li>
                            ))}
                          </ul>
                          {!draft.showFeaturedMenuOnHome && <p className="mt-1 text-[0.7rem] font-semibold text-tomato-dark">Verborgen</p>}
                        </div>,
                      )}
                    </div>
                    <div className="bg-char px-6 py-5 text-white">
                      {block(
                        'about',
                        <div className={`grid items-center gap-3 p-2 ${draft.aboutImage ? 'grid-cols-[1fr_1.5fr]' : ''}`}>
                          {draft.aboutImage && <img src={draft.aboutImage.thumbUrl} alt="" className="aspect-[4/3] w-full rounded-[3px] object-cover" />}
                          <div>
                            <p className="text-xl font-extrabold uppercase leading-none [font-stretch:78%]">{draft.aboutTitle || '…'}</p>
                            <p className="mt-2 line-clamp-4 text-white/80">{draft.aboutText}</p>
                          </div>
                        </div>,
                      )}
                      {block('highlights', <HighlightsPreview items={draft.highlights} dark />, 'mt-2')}
                    </div>
                    {block(
                      'gallery',
                      <div className={`px-6 py-4 ${draft.showGalleryOnHome ? '' : 'opacity-40'}`}>
                        <p className="text-lg font-extrabold uppercase [font-stretch:78%]">Een kijkje bij ons</p>
                        <div className="mt-2 grid grid-cols-4 gap-1.5">
                          {[0, 1, 2, 3].map((i) => (
                            <span key={i} className="aspect-square rounded-[3px] bg-line" />
                          ))}
                        </div>
                        {!draft.showGalleryOnHome && <p className="mt-1 text-[0.7rem] font-semibold text-tomato-dark">Verborgen</p>}
                      </div>,
                    )}
                    <Elsewhere label="Openingstijden en kaart" href="/admin/openingstijden" linkLabel="Openingstijden">
                      <div className="grid grid-cols-2 gap-3 border-t border-line bg-white px-6 py-4">
                        <p className="text-lg font-extrabold uppercase [font-stretch:78%]">Openingstijden</p>
                        <p className="text-lg font-extrabold uppercase [font-stretch:78%]">Zo vind je ons</p>
                      </div>
                    </Elsewhere>
                    {block(
                      'reservation',
                      <div className="bg-tomato px-6 py-4 text-white">
                        <p className="text-lg font-extrabold uppercase [font-stretch:78%]">Eten in ons restaurant</p>
                        <p className="mt-1">{draft.reservationText}</p>
                      </div>,
                    )}
                    {block('footer', <PreviewFooter name={data.businessName} text={draft.footerText} />)}
                  </>
                )}

                {tab === 'over-ons' && (
                  <>
                    <div className="bg-char px-6 py-6 text-white">
                      <p className="text-[2rem] font-extrabold uppercase leading-none [font-stretch:72%]">Over ons</p>
                    </div>
                    {block(
                      'story',
                      <div className="px-6 py-5">
                        <p className="text-xl font-extrabold uppercase leading-none [font-stretch:78%]">{draft.aboutTitle}</p>
                        <div className="mt-2 space-y-2 text-ink-soft">
                          {draft.aboutStory
                            .split(/\n{2,}/)
                            .filter(Boolean)
                            .map((p, i) => (
                              <p key={i}>{p}</p>
                            ))}
                        </div>
                      </div>,
                    )}
                    {block('highlights', <HighlightsPreview items={draft.highlights} />, 'border-y border-line bg-white px-4')}
                    {block(
                      'waiting',
                      <div className="px-6 py-5">
                        <p className="text-lg font-extrabold uppercase [font-stretch:78%]">Restaurant en wachtruimte</p>
                        <p className="mt-1 text-ink-soft">{draft.waitingAreaText}</p>
                        <p className="mt-1 text-ink-soft">{draft.reservationText}</p>
                      </div>,
                    )}
                    {block('footer', <PreviewFooter name={data.businessName} text={draft.footerText} />)}
                  </>
                )}

                {tab === 'menukaart' && (
                  <>
                    <div className="bg-char px-6 py-6 text-white">
                      <p className="text-[2rem] font-extrabold uppercase leading-none [font-stretch:72%]">Menukaart</p>
                    </div>
                    {block(
                      'allergen',
                      <div className="mx-6 my-4 border-l-4 border-tomato bg-white p-3">
                        <p className="font-bold">Voedselallergie?</p>
                        <p className="mt-1 text-ink-soft">{draft.allergenText.replace(/^Voedselallergie\?\s*/i, '')}</p>
                      </div>,
                    )}
                    <Elsewhere label="De gerechten en prijzen" href="/admin/menukaart" linkLabel="Menukaart">
                      <div className="space-y-2 px-6 pb-6">
                        {data.categories.slice(0, 3).map((c) => (
                          <div key={c}>
                            <span className="menu-banner !min-h-0 !py-0.5 text-[0.8rem]">{c}</span>
                            <div className="mt-1 h-2 w-3/4 rounded bg-line" />
                            <div className="mt-1 h-2 w-2/3 rounded bg-line" />
                          </div>
                        ))}
                      </div>
                    </Elsewhere>
                    {block('footer', <PreviewFooter name={data.businessName} text={draft.footerText} />)}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ───────── Editor for the chosen part ───────── */}
          <div ref={panelRef} className="scroll-mt-24 xl:sticky xl:top-24">
            <section className="admin-card p-5 sm:p-6" aria-labelledby="blok-titel">
              <p className="text-xs font-semibold uppercase tracking-wider text-tomato">Je bewerkt</p>
              <h2 id="blok-titel" className="mt-1 font-display text-2xl">
                {BLOCKS[active].title}
              </h2>
              <p className="mt-1 text-[0.95rem] text-muted">{BLOCKS[active].where}</p>
              <form
                className="mt-5 space-y-5"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  void save(active);
                }}
              >
                <BlockFields id={active} draft={draft} set={set} errors={fieldErrors} />
                <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-end">
                  {isDirty(active) && (
                    <button type="button" className="admin-btn admin-btn-ghost" onClick={() => undo(active)}>
                      Wijzigingen ongedaan maken
                    </button>
                  )}
                  <button type="submit" className="admin-btn admin-btn-primary" disabled={!isDirty(active) || saving}>
                    {saving ? 'Bezig met opslaan…' : isDirty(active) ? 'Opslaan' : 'Opgeslagen'}
                  </button>
                </div>
              </form>
            </section>
            {anyDirty && (
              <p className="mt-3 rounded-md bg-warning-soft px-4 py-2.5 text-sm text-warning" role="status">
                Niet opgeslagen:{' '}
                {(Object.keys(BLOCKS) as BlockId[])
                  .filter(isDirty)
                  .map((id) => BLOCKS[id].title)
                  .join(', ')}
              </p>
            )}
            <div className="mt-4 rounded-md border border-line bg-white p-4 text-sm">
              <p className="font-semibold">Naam, telefoon, adres of e-mail wijzigen?</p>
              <p className="text-muted">
                {data.contact.phone} · {data.contact.email}
              </p>
              <Link href="/admin/instellingen#bedrijf" className="mt-1 inline-flex items-center gap-1 font-semibold text-tomato hover:underline">
                Naar Instellingen <ArrowRightIcon size={16} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ───────────────────────── Preview pieces ───────────────────────── */

function EditableBlock({
  id,
  active,
  dirty,
  onSelect,
  className = '',
  children,
}: {
  id: BlockId;
  active: boolean;
  dirty: boolean;
  onSelect: (id: BlockId) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={active}
      aria-label={`${BLOCKS[id].title} wijzigen`}
      onClick={() => onSelect(id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(id);
        }
      }}
      className={`group relative cursor-pointer outline-offset-[-3px] transition-shadow ${
        active ? 'z-10 shadow-[inset_0_0_0_3px_#d81f26]' : 'hover:shadow-[inset_0_0_0_2px_rgba(216,31,38,0.6)] hover:bg-[rgba(216,31,38,0.04)]'
      } ${className}`}
    >
      {children}
      <span
        className={`pointer-events-none absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-sans text-[0.68rem] font-semibold shadow-sm transition-opacity ${
          active
            ? 'bg-tomato text-white opacity-100'
            : 'bg-white text-ink opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-90'
        } ${dirty && !active ? '!opacity-100' : ''}`}
        aria-hidden="true"
      >
        <EditIcon size={12} /> {active ? 'Je bewerkt dit' : 'Wijzigen'}
        {dirty && <span className="ml-0.5 size-1.5 rounded-full bg-[#f5b400]" />}
      </span>
    </div>
  );
}

/** A part of the page that is managed elsewhere in the admin. */
function Elsewhere({ label, href, linkLabel, children }: { label: string; href: string; linkLabel: string; children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="opacity-60">{children}</div>
      <Link
        href={href}
        className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-full border border-line-strong bg-white/95 px-2 py-0.5 font-sans text-[0.68rem] font-semibold text-ink-soft shadow-sm hover:border-ink hover:text-ink"
        aria-label={`${label}: wijzigen bij ${linkLabel}`}
      >
        Wijzigen bij {linkLabel} <ArrowRightIcon size={12} />
      </Link>
    </div>
  );
}

function PreviewHeader({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-between border-b-2 border-tomato bg-char px-6 py-2.5 text-white">
      <span className="text-sm font-extrabold uppercase [font-stretch:72%]">{name}</span>
      <span className="hidden gap-3 text-[0.55rem] font-bold uppercase tracking-wider text-white/70 sm:flex">
        <span>Home</span>
        <span>Menukaart</span>
        <span>Over ons</span>
        <span>Contact</span>
      </span>
    </div>
  );
}

function PreviewFooter({ name, text }: { name: string; text: string }) {
  return (
    <div className="border-t-2 border-tomato bg-char px-6 py-4 text-white">
      <p className="text-base font-extrabold uppercase [font-stretch:72%]">{name}</p>
      <p className="mt-1 max-w-xs text-white/75">{text}</p>
    </div>
  );
}

function HighlightsPreview({ items, dark = false }: { items: Highlight[]; dark?: boolean }) {
  const visible = items.filter((h) => h.isVisible);
  return (
    <div className="grid grid-cols-3 gap-3 p-2">
      {(visible.length ? visible : [{ title: 'Nog geen punten', body: '', icon: 'heart' as IconName, isVisible: true }]).map((h, i) => (
        <div key={i} className="border-t-2 border-tomato pt-2">
          <p className="font-bold leading-tight [font-stretch:85%]">{h.title || '…'}</p>
          <p className={`mt-0.5 line-clamp-3 text-[0.7rem] ${dark ? 'text-white/70' : 'text-muted'}`}>{h.body}</p>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── Editor fields ───────────────────────── */

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

function BlockFields({
  id,
  draft,
  set,
  errors,
}: {
  id: BlockId;
  draft: Draft;
  set: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  errors: Record<string, string>;
}) {
  switch (id) {
    case 'hero':
      return (
        <>
          <Field label="Titel" htmlFor="w-hero-titel" error={errors.heroTitle} counter={{ value: draft.heroTitle.length, max: 80 }}>
            <input id="w-hero-titel" className="admin-input" maxLength={80} value={draft.heroTitle} onChange={(e) => set('heroTitle', e.target.value)} />
          </Field>
          <Field label="Korte tekst" htmlFor="w-hero-tekst" error={errors.heroText} counter={{ value: draft.heroText.length, max: 300, ideal: 160 }}>
            <TextArea id="w-hero-tekst" value={draft.heroText} max={300} onChange={(v) => set('heroText', v)} error={errors.heroText} />
          </Field>
          <div>
            <p className="mb-2 font-semibold">
              Grote foto <span className="text-sm font-normal text-muted">(optioneel)</span>
            </p>
            <ImagePicker
              label="Hoofdfoto van de homepage"
              value={draft.heroImage}
              onChange={(img) => set('heroImage', img)}
              removeLabel="Geen foto gebruiken"
              uploadVisibleByDefault
            />
            {!draft.heroImage && <p className="mt-2 text-sm text-muted">Zonder foto: zwarte achtergrond met de rode band van de folder.</p>}
          </div>
        </>
      );
    case 'intro':
      return (
        <>
          <Field label="Titel" htmlFor="w-intro-titel" error={errors.introTitle}>
            <input id="w-intro-titel" className="admin-input" maxLength={100} value={draft.introTitle} onChange={(e) => set('introTitle', e.target.value)} />
          </Field>
          <Field label="Tekst" htmlFor="w-intro-tekst" error={errors.introText} counter={{ value: draft.introText.length, max: 1000 }}>
            <TextArea id="w-intro-tekst" value={draft.introText} max={1000} rows={5} onChange={(v) => set('introText', v)} error={errors.introText} />
          </Field>
        </>
      );
    case 'populair':
      return (
        <>
          <Toggle checked={draft.showFeaturedMenuOnHome} onChange={(v) => set('showFeaturedMenuOnHome', v)} label="Populaire gerechten tonen" />
          <Link href="/admin/menukaart" className="admin-btn admin-btn-secondary">
            Gerechten kiezen bij Menukaart <ArrowRightIcon size={18} />
          </Link>
        </>
      );
    case 'about':
      return (
        <>
          <Field label="Titel" htmlFor="w-over-titel" error={errors.aboutTitle}>
            <input id="w-over-titel" className="admin-input" maxLength={100} value={draft.aboutTitle} onChange={(e) => set('aboutTitle', e.target.value)} />
          </Field>
          <Field label="Korte tekst" htmlFor="w-over-kort" error={errors.aboutText} counter={{ value: draft.aboutText.length, max: 800 }}>
            <TextArea id="w-over-kort" value={draft.aboutText} max={800} rows={4} onChange={(v) => set('aboutText', v)} error={errors.aboutText} />
          </Field>
          <div>
            <p className="mb-2 font-semibold">
              Foto <span className="text-sm font-normal text-muted">(optioneel)</span>
            </p>
            <ImagePicker label="Foto bij Over ons" value={draft.aboutImage} onChange={(img) => set('aboutImage', img)} uploadVisibleByDefault />
          </div>
        </>
      );
    case 'highlights':
      return <HighlightsFields items={draft.highlights} onChange={(items) => set('highlights', items)} errors={errors} />;
    case 'gallery':
      return (
        <>
          <Toggle checked={draft.showGalleryOnHome} onChange={(v) => set('showGalleryOnHome', v)} label="Foto's tonen op de homepage" />
          <Link href="/admin/fotos" className="admin-btn admin-btn-secondary">
            Foto&apos;s beheren <ArrowRightIcon size={18} />
          </Link>
        </>
      );
    case 'reservation':
      return (
        <Field label="Tekst" htmlFor="w-reserveren" error={errors.reservationText}>
          <TextArea
            id="w-reserveren"
            value={draft.reservationText}
            max={400}
            rows={3}
            onChange={(v) => set('reservationText', v)}
            error={errors.reservationText}
          />
        </Field>
      );
    case 'footer':
      return (
        <Field label="Tekst" htmlFor="w-footer" error={errors.footerText}>
          <TextArea id="w-footer" value={draft.footerText} max={300} rows={2} onChange={(v) => set('footerText', v)} error={errors.footerText} />
        </Field>
      );
    case 'story':
      return (
        <Field
          label="Het verhaal"
          htmlFor="w-over-verhaal"
          hint="Laat een lege regel tussen alinea's."
          error={errors.aboutStory}
          counter={{ value: draft.aboutStory.length, max: 5000 }}
        >
          <TextArea id="w-over-verhaal" value={draft.aboutStory} max={5000} rows={10} onChange={(v) => set('aboutStory', v)} error={errors.aboutStory} />
        </Field>
      );
    case 'waiting':
      return (
        <Field label="Tekst over de wachtruimte" htmlFor="w-wachtruimte" error={errors.waitingAreaText}>
          <TextArea
            id="w-wachtruimte"
            value={draft.waitingAreaText}
            max={500}
            rows={3}
            onChange={(v) => set('waitingAreaText', v)}
            error={errors.waitingAreaText}
          />
        </Field>
      );
    case 'allergen':
      return (
        <Field label="Tekst" htmlFor="w-allergenen" error={errors.allergenText}>
          <TextArea id="w-allergenen" value={draft.allergenText} max={800} rows={4} onChange={(v) => set('allergenText', v)} error={errors.allergenText} />
        </Field>
      );
  }
}

function HighlightsFields({ items, onChange, errors }: { items: Highlight[]; onChange: (items: Highlight[]) => void; errors: Record<string, string> }) {
  const update = (i: number, patch: Partial<Highlight>) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...items];
    const [m] = next.splice(i, 1);
    next.splice(i + d, 0, m!);
    onChange(next);
  };
  return (
    <>
      <ol className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="rounded-md border border-line p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-semibold">Punt {i + 1}</p>
              <div className="flex">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  className="inline-flex size-9 items-center justify-center rounded-md hover:bg-paper disabled:opacity-30"
                  aria-label={`Punt ${i + 1} omhoog`}
                >
                  <ChevronUpIcon size={18} />
                </button>
                <button
                  type="button"
                  disabled={i === items.length - 1}
                  onClick={() => move(i, 1)}
                  className="inline-flex size-9 items-center justify-center rounded-md hover:bg-paper disabled:opacity-30"
                  aria-label={`Punt ${i + 1} omlaag`}
                >
                  <ChevronDownIcon size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                  className="inline-flex size-9 items-center justify-center rounded-md text-muted hover:bg-paper hover:text-tomato-dark"
                  aria-label={`Punt ${i + 1} verwijderen`}
                >
                  <TrashIcon size={18} />
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <Field label="Titel" htmlFor={`h-titel-${i}`} error={errors[`items.${i}.title`]}>
                <input id={`h-titel-${i}`} className="admin-input" maxLength={60} value={item.title} onChange={(e) => update(i, { title: e.target.value })} />
              </Field>
              <Field label="Tekst" htmlFor={`h-tekst-${i}`} error={errors[`items.${i}.body`]}>
                <TextArea id={`h-tekst-${i}`} value={item.body} max={300} rows={2} onChange={(v) => update(i, { body: v })} />
              </Field>
              <Toggle checked={item.isVisible} onChange={(v) => update(i, { isVisible: v })} label="Tonen op de website" />
            </div>
          </li>
        ))}
      </ol>
      {items.length < 6 && (
        <button
          type="button"
          className="admin-btn admin-btn-secondary admin-btn-sm"
          onClick={() => onChange([...items, { title: '', body: '', icon: 'heart', isVisible: true }])}
        >
          <PlusIcon size={16} /> Punt toevoegen
        </button>
      )}
    </>
  );
}

/* ───────────────────────── Google ───────────────────────── */

function SeoEditor({ data }: { data: WebsiteData }) {
  return (
    <section id="zoekmachines" className="scroll-mt-24" aria-labelledby="zoekmachines-titel">
      <h2 id="zoekmachines-titel" className="font-display text-3xl">
        Zo staat je website in Google
      </h2>
      <p className="mb-4 mt-1 max-w-2xl text-muted">
        Per pagina de titel en de korte beschrijving die Google toont. Houd de titel kort (rond 60 tekens) en de beschrijving rond 150 tekens. Je ziet meteen
        hoe het eruitziet.
      </p>
      <div className="grid gap-4 xl:grid-cols-2">
        {data.seo.map((page) => (
          <SectionForm
            key={page.pageKey}
            title={page.label}
            initial={{ title: page.title, description: page.description }}
            save={(v) => savePageSeo({ pageKey: page.pageKey, ...v })}
          >
            {(v, set, e) => (
              <>
                <div className="rounded-md border border-line bg-white p-4" aria-label="Voorbeeld in Google">
                  <p className="truncate text-sm text-[#202124]">
                    {data.host}
                    {page.path === '/' ? '' : ` › ${page.path.slice(1)}`}
                  </p>
                  <p className="truncate text-lg leading-snug text-[#1a0dab]">{v.title.length > 62 ? `${v.title.slice(0, 60)}…` : v.title || '…'}</p>
                  <p className="line-clamp-2 text-sm text-[#4d5156]">{v.description.length > 160 ? `${v.description.slice(0, 157)}…` : v.description}</p>
                </div>
                <Field label="Titel in Google" htmlFor={`seo-t-${page.pageKey}`} error={e.title} counter={{ value: v.title.length, max: 120, ideal: 60 }}>
                  <input id={`seo-t-${page.pageKey}`} className="admin-input" maxLength={120} value={v.title} onChange={(x) => set('title', x.target.value)} />
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
              </>
            )}
          </SectionForm>
        ))}
      </div>
    </section>
  );
}
