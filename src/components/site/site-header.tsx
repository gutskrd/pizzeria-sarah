'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CloseIcon, MenuIcon, PhoneIcon } from '@/components/ui/icons';
import { NAV_ITEMS } from './nav-items';
import { SectionLink, useActiveSection } from './section-link';

type Props = { businessName: string; tagline: string; phoneDisplay: string; phoneHref: string; hasGallery: boolean };

export function SiteHeader({ businessName, tagline, phoneDisplay, phoneHref, hasGallery }: Props) {
  const items = NAV_ITEMS.filter((item) => item.id !== 'galerij' || hasGallery);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const activeSection = useActiveSection();
  // On the homepage: the section on screen. On the separate pages: the matching item.
  const isActive = (id: string) => (pathname === '/' ? activeSection === id : id !== 'home' && pathname.startsWith(`/${id}`));

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLElement>('a')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <header className="on-dark sticky top-0 z-40 border-b-[3px] border-tomato bg-char text-white">
        <a href="#inhoud" className="sr-only-focusable absolute left-4 top-3 z-50 rounded-sm bg-white px-4 py-2 text-sm font-semibold text-ink">
          Direct naar de inhoud
        </a>
        <div className="container-site flex h-16 items-center justify-between gap-4 md:h-[4.5rem]">
          <SectionLink section="home" className="group flex min-w-0 flex-col leading-none" onNavigate={() => setOpen(false)}>
            <span className="truncate text-[1.5rem] font-extrabold uppercase leading-none tracking-[0.01em] [font-stretch:72%] md:text-[1.7rem]">
              {businessName}
            </span>
            <span className="mt-1 hidden truncate text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white/60 min-[400px]:block">{tagline}</span>
          </SectionLink>

          <nav aria-label="Hoofdmenu" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {items.map((item) => (
                <li key={item.id}>
                  <SectionLink
                    section={item.id}
                    aria-current={isActive(item.id) ? (pathname === '/' ? 'location' : 'page') : undefined}
                    className="relative inline-flex min-h-11 items-center px-3.5 text-[0.95rem] font-bold uppercase tracking-[0.06em] text-white/75 transition-colors duration-300 [font-stretch:85%] hover:text-white aria-[current]:text-white after:absolute after:inset-x-3.5 after:bottom-2 after:h-[2px] after:origin-left after:scale-x-0 after:bg-tomato after:transition-transform after:duration-300 hover:after:scale-x-100 aria-[current]:after:scale-x-100"
                  >
                    {item.label}
                  </SectionLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <a href={phoneHref} className="btn btn-primary hidden !min-h-11 !px-4 sm:inline-flex">
              <PhoneIcon size={18} />
              <span>
                Bel ons <span className="hidden xl:inline">· {phoneDisplay}</span>
              </span>
            </a>
            <a
              href={phoneHref}
              className="inline-flex size-11 items-center justify-center rounded-sm bg-tomato text-white sm:hidden"
              aria-label={`Bel ons: ${phoneDisplay}`}
            >
              <PhoneIcon size={20} />
            </a>
            <button
              ref={buttonRef}
              type="button"
              className="inline-flex size-11 items-center justify-center rounded-sm border border-white/25 text-white lg:hidden"
              aria-expanded={open}
              aria-controls="mobiel-menu"
              aria-label={open ? 'Menu sluiten' : 'Menu openen'}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
            </button>
          </div>
        </div>
      </header>
      <div id="mobiel-menu" ref={panelRef} hidden={!open} className="fixed inset-x-0 bottom-0 top-[67px] z-40 overflow-y-auto md:top-[75px] bg-paper lg:hidden">
        <nav aria-label="Mobiel menu" className="container-site py-6">
          <ul className="divide-y divide-line border-y border-line">
            {items.map((item) => (
              <li key={item.id}>
                <SectionLink
                  section={item.id}
                  aria-current={isActive(item.id) ? (pathname === '/' ? 'location' : 'page') : undefined}
                  onNavigate={() => setOpen(false)}
                  className="flex min-h-14 items-center justify-between py-3 text-2xl font-extrabold uppercase [font-stretch:75%] aria-[current]:text-tomato"
                >
                  {item.label}
                </SectionLink>
              </li>
            ))}
          </ul>
          <a href={phoneHref} className="btn btn-primary mt-8 w-full">
            <PhoneIcon size={18} /> Bel {phoneDisplay}
          </a>
        </nav>
      </div>
    </>
  );
}
