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
      <div className="sticky top-[67px] z-30 -mx-4 border-b border-line bg-paper/95 px-4 backdrop-blur-sm sm:-mx-6 sm:px-6 md:top-[75px] lg:-mx-10 lg:px-10">
        <div className="flex flex-col gap-3 py-3 md:flex-row md:items-center">
          <label className="relative block md:w-72 md:shrink-0">
            <span className="sr-only">Zoek een gerecht</span>
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoek een gerecht"
              className="h-11 w-full rounded-[3px] border border-line-strong bg-white pl-10 pr-10 text-base placeholder:text-muted focus:border-ink focus:outline-none"
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
                    className="inline-flex min-h-10 items-center rounded-[3px] border border-line-strong bg-white px-3.5 text-[0.9rem] font-bold uppercase tracking-[0.04em] whitespace-nowrap transition-colors [font-stretch:85%] hover:border-ink aria-[current=true]:border-tomato aria-[current=true]:bg-tomato aria-[current=true]:text-white"
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
          <p className="text-2xl font-extrabold uppercase [font-stretch:78%]">Geen gerechten gevonden</p>
          <p className="mt-2 text-muted">Probeer een ander zoekwoord, of bekijk de hele menukaart.</p>
          <button type="button" onClick={() => setQuery('')} className="btn btn-outline mt-6">
            Hele menukaart tonen
          </button>
        </div>
      ) : (
        <div>
          {filtered.map((c) => (
            <section key={c.id} id={c.slug} data-menu-section={c.slug} className="scroll-mt-40 pt-10 md:pt-14" aria-labelledby={`cat-${c.slug}`}>
              <h2 id={`cat-${c.slug}`} className="menu-banner text-[1.35rem] md:text-[1.5rem]">
                {c.name}
              </h2>
              {c.description && <p className="mt-3 max-w-2xl text-muted">{c.description}</p>}
              <ul className="mt-3 grid lg:grid-cols-2 lg:gap-x-14">
                {c.items.map((item) => (
                  <MenuItemRow key={item.id} item={item} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
