'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CloseIcon, MenuIcon, PhoneIcon } from '@/components/ui/icons';
import { NAV_ITEMS } from './nav-items';

type Props = { businessName: string; city: string; phoneDisplay: string; phoneHref: string };

export function SiteHeader({ businessName, city, phoneDisplay, phoneHref }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

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
      <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/95 backdrop-blur-sm supports-[backdrop-filter]:bg-paper/85">
        <a href="#inhoud" className="sr-only-focusable absolute left-4 top-3 z-50 rounded-sm bg-ink px-4 py-2 text-sm font-semibold text-paper">
          Direct naar de inhoud
        </a>
        <div className="container-site flex h-16 items-center justify-between gap-4 md:h-[4.5rem]">
          <Link href="/" className="group flex min-w-0 flex-col leading-none" onClick={() => setOpen(false)}>
            <span className="truncate font-display text-[1.45rem] font-semibold tracking-tight md:text-[1.6rem]">{businessName}</span>
            <span className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted">{city}</span>
          </Link>

          <nav aria-label="Hoofdmenu" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className="relative inline-flex min-h-11 items-center px-3.5 text-[0.98rem] font-medium text-ink-soft transition-colors hover:text-ink aria-[current=page]:text-ink after:absolute after:inset-x-3.5 after:bottom-2 after:h-[2px] after:origin-left after:scale-x-0 after:bg-tomato after:transition-transform after:duration-200 hover:after:scale-x-100 aria-[current=page]:after:scale-x-100"
                  >
                    {item.label}
                  </Link>
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
              className="inline-flex size-11 items-center justify-center rounded-sm border border-line-strong text-ink lg:hidden"
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
      <div id="mobiel-menu" ref={panelRef} hidden={!open} className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto bg-paper lg:hidden">
        <nav aria-label="Mobiel menu" className="container-site py-6">
          <ul className="divide-y divide-line border-y border-line">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                  className="flex min-h-14 items-center justify-between py-3 font-display text-2xl aria-[current=page]:text-tomato"
                >
                  {item.label}
                </Link>
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
