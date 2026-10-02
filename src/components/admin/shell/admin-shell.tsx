'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { logoutAction } from '@/app/admin/(auth)/actions';
import { CloseIcon, ExternalIcon, LogoutIcon, MenuIcon, SearchIcon } from '@/components/ui/icons';
import type { Schedule } from '@/lib/opening-hours';
import { NotificationBell } from './bell';
import { Bubble } from './bubble';
import { formatClock, liveOpenState, ServerNowContext, TopbarClock, useNowMinute } from './clock';
import { CommandPalette, useIsMac } from './command-palette';
import { useLive } from './live-provider';
import { isActive, NAV_GROUPS, NAV_ITEMS, TAB_KEYS } from './nav-config';

type Props = { userName: string; userEmail: string; businessName: string; schedule: Schedule; serverNow: number; children: React.ReactNode };

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join('') || 'S'
  );
}

function NavGroups({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { status } = useLive();
  return (
    <div className="space-y-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted">{group.label}</p>
          <ul className="space-y-0.5">
            {group.items.map(({ key, href, label, icon: Icon }) => {
              const active = isActive(href, pathname);
              const badge = status.badges[key];
              return (
                <li key={key}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={`group relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-[0.97rem] font-medium transition-colors ${
                      active ? 'bg-tomato-soft text-tomato-dark' : 'text-ink-soft hover:bg-paper hover:text-ink'
                    }`}
                  >
                    {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-tomato" aria-hidden="true" />}
                    <Icon size={20} className={active ? 'text-tomato' : 'text-muted group-hover:text-ink-soft'} />
                    <span className="flex-1">{label}</span>
                    <Bubble badge={badge} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function UserCard({ userName, userEmail }: { userName: string; userEmail: string }) {
  return (
    <div className="border-t border-line pt-3">
      <div className="flex items-center gap-3 px-2 py-1.5">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-ink font-semibold text-paper" aria-hidden="true">
          {initials(userName)}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate font-semibold">{userName}</span>
          <span className="block truncate text-xs text-muted">{userEmail}</span>
        </span>
      </div>
      <form action={logoutAction} className="mt-1">
        <button
          type="submit"
          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left font-medium text-ink-soft hover:bg-paper hover:text-ink"
        >
          <LogoutIcon size={20} className="text-muted" /> Uitloggen
        </button>
      </form>
    </div>
  );
}

function SearchButton({ onOpen, compact = false }: { onOpen: () => void; compact?: boolean }) {
  const isMac = useIsMac();
  if (compact) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex size-11 items-center justify-center rounded-full text-ink-soft hover:bg-paper"
        aria-label="Zoeken"
      >
        <SearchIcon size={21} />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-11 w-full max-w-md items-center gap-3 rounded-lg border border-line bg-paper/60 px-3.5 text-left text-muted transition-colors hover:border-line-strong hover:bg-paper"
      aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}
    >
      <SearchIcon size={18} />
      <span className="flex-1 truncate">Zoeken of snel naar…</span>
      <span className="flex items-center gap-1" aria-hidden="true">
        <span className="kbd">{isMac ? '⌘' : 'Ctrl'}</span>
        <span className="kbd">K</span>
      </span>
    </button>
  );
}

/** Small clock for the phone header: "21:47" with an open/closed dot. */
function MobileClock({ schedule }: { schedule: Schedule }) {
  const now = useNowMinute();
  if (now === null) return null;
  const clock = formatClock(now);
  const open = liveOpenState(schedule, now);
  return (
    <span
      className="flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-1 text-sm font-semibold tabular-nums"
      title={`${open.headline}, ${open.countdown}`}
    >
      <span className={`size-2 rounded-full ${open.isOpen ? 'bg-[#43a047]' : 'bg-tomato'}`} aria-hidden="true" />
      {clock.hours}:{clock.minutes}
      <span className="sr-only">
        {open.headline}, {open.countdown}
      </span>
    </span>
  );
}

export function AdminShell({ userName, userEmail, businessName, schedule, serverNow, children }: Props) {
  const pathname = usePathname();
  const { status } = useLive();
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const menuButton = useRef<HTMLButtonElement>(null);

  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (drawer) setDrawer(false);
  }

  // Marks the admin as interactive (used by the automated tests).
  useEffect(() => {
    document.documentElement.dataset.adminReady = '1';
  }, []);

  // ⌘K / Ctrl+K opens the command palette; "/" too (when not typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest('input, textarea, select, [contenteditable="true"]');
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPalette((v) => !v);
      } else if (e.key === '/' && !typing && !document.querySelector('dialog[open]')) {
        e.preventDefault();
        setPalette(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawer(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [drawer]);

  const brand = (
    <Link href="/admin" className="flex min-w-0 items-center gap-2.5" aria-label={`${businessName} – Beheer, naar het dashboard`}>
      <span
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-tomato font-display text-xl font-semibold text-white"
        aria-hidden="true"
      >
        {businessName.trim()[0] ?? 'S'}
      </span>
      <span className="hidden min-w-0 leading-tight min-[400px]:block lg:block">
        <span className="block truncate font-display text-lg">{businessName}</span>
        <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted">Beheer</span>
      </span>
    </Link>
  );

  const tabs = TAB_KEYS.map((key) => NAV_ITEMS.find((n) => n.key === key)!);
  const tabLabels: Record<string, string> = { dashboard: 'Overzicht', openingstijden: 'Tijden' };

  return (
    <ServerNowContext.Provider value={serverNow}>
      <div className="min-h-[100svh] bg-[#f6f3ee]">
        {/* ── Desktop sidebar ── */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17rem] flex-col border-r border-line bg-white px-3 pb-4 pt-5 lg:flex">
          <div className="px-2 pb-6">{brand}</div>
          <nav aria-label="Beheermenu" className="min-h-0 flex-1 overflow-y-auto pb-4">
            <NavGroups />
          </nav>
          <a
            href="/"
            target="_blank"
            rel="noopener"
            className="mb-1 flex min-h-11 items-center gap-3 rounded-lg px-3 font-medium text-ink-soft hover:bg-paper hover:text-ink"
          >
            <ExternalIcon size={20} className="text-muted" /> Website bekijken
          </a>
          <UserCard userName={userName} userEmail={userEmail} />
        </aside>

        <div className="lg:pl-[17rem]">
          {/* ── Desktop top bar ── */}
          <header className="sticky top-0 z-20 hidden h-[4.5rem] items-center gap-4 border-b border-line bg-white/95 px-6 lg:flex xl:px-10">
            <SearchButton onOpen={() => setPalette(true)} />
            <div className="ml-auto flex items-center gap-4">
              <TopbarClock schedule={schedule} />
              <span className="h-8 w-px bg-line" aria-hidden="true" />
              <NotificationBell />
            </div>
          </header>

          {/* ── Phone header ── */}
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-2 border-b border-line bg-white px-3 lg:hidden">
            {brand}
            <div className="flex items-center gap-0.5">
              <MobileClock schedule={schedule} />
              <SearchButton compact onOpen={() => setPalette(true)} />
              <NotificationBell />
              <button
                ref={menuButton}
                type="button"
                onClick={() => setDrawer((v) => !v)}
                aria-expanded={drawer}
                aria-controls="beheer-menu"
                aria-label="Menu"
                className="relative inline-flex size-11 items-center justify-center rounded-full text-ink-soft hover:bg-paper"
              >
                {drawer ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
              </button>
            </div>
          </header>

          <div id="beheer-menu" hidden={!drawer} className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto bg-white px-3 pb-24 pt-4 lg:hidden">
            <nav aria-label="Beheermenu">
              <NavGroups onNavigate={() => setDrawer(false)} />
            </nav>
            <a
              href="/"
              target="_blank"
              rel="noopener"
              className="mt-4 flex min-h-11 items-center gap-3 rounded-lg px-3 font-medium text-ink-soft hover:bg-paper"
            >
              <ExternalIcon size={20} className="text-muted" /> Website bekijken
            </a>
            <div className="mt-2">
              <UserCard userName={userName} userEmail={userEmail} />
            </div>
          </div>

          <main id="inhoud">
            <div className="mx-auto w-full max-w-5xl px-4 pb-32 pt-6 sm:px-6 lg:px-10 lg:pb-24 lg:pt-8">{children}</div>
          </main>

          {/* ── Phone tab bar ── */}
          <nav aria-label="Snelmenu" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
            <ul className="grid grid-cols-5">
              {tabs.map(({ key, href, label, icon: Icon }) => {
                const active = isActive(href, pathname);
                return (
                  <li key={key}>
                    <Link
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={`flex h-16 flex-col items-center justify-center gap-1 text-[0.66rem] font-semibold min-[360px]:text-[0.7rem] ${active ? 'text-tomato' : 'text-muted'}`}
                    >
                      <span className="relative">
                        <Icon size={22} />
                        <Bubble overlay badge={status.badges[key]} />
                      </span>
                      <span className="max-w-full truncate px-0.5">{tabLabels[key] ?? label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <CommandPalette open={palette} onClose={() => setPalette(false)} />
      </div>
    </ServerNowContext.Provider>
  );
}
