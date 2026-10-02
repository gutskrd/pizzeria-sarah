'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { logoutAction } from '@/app/admin/(auth)/actions';
import {
  ClockIcon,
  CloseIcon,
  DevicesIcon,
  ExternalIcon,
  GlobeIcon,
  HomeIcon,
  ImageIcon,
  ListIcon,
  LogoutIcon,
  MailIcon,
  MenuIcon,
  SettingsIcon,
  TagIcon,
} from '@/components/ui/icons';

const ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: HomeIcon },
  { href: '/admin/website', label: 'Website', icon: GlobeIcon },
  { href: '/admin/menukaart', label: 'Menukaart', icon: ListIcon },
  { href: '/admin/fotos', label: "Foto's", icon: ImageIcon },
  { href: '/admin/openingstijden', label: 'Openingstijden', icon: ClockIcon },
  { href: '/admin/berichten', label: 'Berichten', icon: MailIcon },
  { href: '/admin/aanbiedingen', label: 'Aanbiedingen', icon: TagIcon },
  { href: '/admin/apparaten', label: 'Ingelogde apparaten', icon: DevicesIcon },
  { href: '/admin/instellingen', label: 'Instellingen', icon: SettingsIcon },
] as const;

function NavList({ unread, onNavigate }: { unread: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));
  return (
    <ul className="space-y-0.5">
      {ITEMS.map(({ href, label, icon: Icon }) => (
        <li key={href}>
          <Link
            href={href}
            onClick={onNavigate}
            aria-current={isActive(href) ? 'page' : undefined}
            className="flex min-h-12 items-center gap-3 rounded-md px-3 text-[1rem] font-medium text-ink-soft transition-colors hover:bg-paper hover:text-ink aria-[current=page]:bg-tomato-soft aria-[current=page]:text-tomato-dark"
          >
            <Icon size={20} />
            <span className="flex-1">{label}</span>
            {href === '/admin/berichten' && unread > 0 && (
              <span className="admin-badge bg-tomato text-white" aria-label={`${unread} ongelezen`}>
                {unread}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Footer({ userName }: { userName: string }) {
  return (
    <div className="space-y-1 border-t border-line pt-3">
      <a href="/" target="_blank" rel="noopener" className="flex min-h-11 items-center gap-3 rounded-md px-3 text-ink-soft hover:bg-paper hover:text-ink">
        <ExternalIcon size={20} /> Website bekijken
      </a>
      <form action={logoutAction}>
        <button type="submit" className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-ink-soft hover:bg-paper hover:text-ink">
          <LogoutIcon size={20} /> Uitloggen
        </button>
      </form>
      <p className="px-3 pt-1 text-sm text-muted">Ingelogd als {userName}</p>
    </div>
  );
}

export function AdminNav({ unread, userName, businessName }: { unread: number; userName: string; businessName: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [lastPath, setLastPath] = useState(pathname);

  // Close the mobile menu after navigating.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const brand = (
    <Link href="/admin" className="block leading-tight">
      <span className="block font-display text-xl">{businessName}</span>
      <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted">Beheer</span>
    </Link>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-line bg-white px-3 py-5 lg:flex">
        <div className="px-3 pb-5">{brand}</div>
        <nav aria-label="Beheermenu" className="min-h-0 flex-1 overflow-y-auto">
          <NavList unread={unread} />
        </nav>
        <Footer userName={userName} />
      </aside>

      {/* Mobiel */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-line bg-white/95 px-4 backdrop-blur-sm lg:hidden">
        {brand}
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <Link href="/admin/berichten" className="admin-badge bg-tomato text-white" aria-label={`${unread} nieuwe berichten`}>
              <MailIcon size={14} /> {unread}
            </Link>
          )}
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="beheer-menu"
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line-strong px-3 font-semibold"
          >
            {open ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
            Menu
          </button>
        </div>
      </header>
      <div id="beheer-menu" hidden={!open} className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto bg-white px-3 py-4 lg:hidden">
        <nav aria-label="Beheermenu">
          <NavList unread={unread} onNavigate={() => setOpen(false)} />
        </nav>
        <div className="mt-4">
          <Footer userName={userName} />
        </div>
      </div>
    </>
  );
}
