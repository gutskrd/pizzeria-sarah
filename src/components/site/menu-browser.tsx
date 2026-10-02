'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CloseIcon, SearchIcon } from '@/components/ui/icons';
import type { PublicMenuCategory } from '@/lib/content/queries';
import { MenuItemRow } from './menu-item';

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function MenuBrowser({ menu }: { menu: PublicMenuCategory[] }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(menu[0]?.slug ?? '');
  const navRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return menu;
    return menu
      .map((c) => ({
        ...c,
        items: c.items.filter((i) => normalize(`${i.number} ${i.name} ${i.description} ${c.name}`).includes(q)),
      }))
      .filter((c) => c.items.length > 0);
  }, [menu, query]);

  const resultCount = filtered.reduce((n, c) => n + c.items.length, 0);

  // Highlight the category currently in view.
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-menu-section]'));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const first = visible[0];
        if (first) setActive((first.target as HTMLElement).dataset.menuSection ?? '');
      },
      { rootMargin: '-140px 0px -60% 0px' },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [filtered]);

  // Keep the active chip visible in the horizontal category bar (horizontal scroll only,
  // so the page itself never jumps).
  useEffect(() => {
    const nav = navRef.current;
    const chip = nav?.querySelector<HTMLElement>(`[data-chip="${active}"]`);
    if (!nav || !chip) return;
    const left = chip.offsetLeft - 16;
    const right = chip.offsetLeft + chip.offsetWidth + 16;
    if (left < nav.scrollLeft) nav.scrollTo({ left, behavior: 'smooth' });
    else if (right > nav.scrollLeft + nav.clientWidth) nav.scrollTo({ left: right - nav.clientWidth, behavior: 'smooth' });
  }, [active]);

  return (
    <div>
      <div className="sticky top-16 z-30 -mx-4 border-b border-line bg-paper/95 px-4 backdrop-blur-sm sm:-mx-6 sm:px-6 md:top-[4.5rem] lg:-mx-10 lg:px-10">
        <div className="flex flex-col gap-3 py-3 md:flex-row md:items-center">
          <label className="relative block md:w-72 md:shrink-0">
            <span className="sr-only">Zoek een gerecht</span>
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoek een gerecht"
              className="h-11 w-full rounded-sm border border-line-strong bg-cream pl-10 pr-10 text-base placeholder:text-muted focus:border-ink focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-1 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center text-muted hover:text-ink"
                aria-label="Zoekopdracht wissen"
              >
                <CloseIcon size={18} />
              </button>
            )}
          </label>
          <nav ref={navRef} aria-label="Categorieën" className="relative -mx-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ul className="flex gap-1.5 px-1">
              {filtered.map((c) => (
                <li key={c.id} className="shrink-0">
                  <a
                    href={`#${c.slug}`}
                    data-chip={c.slug}
                    aria-current={active === c.slug ? 'true' : undefined}
                    className="inline-flex min-h-10 items-center rounded-full border border-line-strong px-4 text-[0.95rem] font-medium whitespace-nowrap transition-colors hover:border-ink aria-[current=true]:border-ink aria-[current=true]:bg-ink aria-[current=true]:text-paper"
                  >
                    {c.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {query ? `${resultCount} ${resultCount === 1 ? 'gerecht' : 'gerechten'} gevonden` : ''}
      </p>

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-display text-2xl">Geen gerechten gevonden</p>
          <p className="mt-2 text-muted">Probeer een ander zoekwoord, of bekijk de hele menukaart.</p>
          <button type="button" onClick={() => setQuery('')} className="btn btn-outline mt-6">
            Hele menukaart tonen
          </button>
        </div>
      ) : (
        <div className="divide-y divide-line">
          {filtered.map((c) => (
            <section key={c.id} id={c.slug} data-menu-section={c.slug} className="scroll-mt-40 py-10 md:py-14" aria-labelledby={`cat-${c.slug}`}>
              <div className="grid gap-6 lg:grid-cols-[16rem_1fr] lg:gap-12">
                <div>
                  <h2 id={`cat-${c.slug}`} className="text-3xl md:text-4xl lg:sticky lg:top-44">
                    {c.name}
                  </h2>
                  {c.description && <p className="mt-2 text-muted">{c.description}</p>}
                </div>
                <ul>
                  {c.items.map((item) => (
                    <MenuItemRow key={item.id} item={item} />
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
