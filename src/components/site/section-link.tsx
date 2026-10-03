'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NAV_ITEMS, type SectionId } from './nav-items';

/** Fired when a link starts a smooth scroll, so the menu highlight follows at once. */
const EVENT = 'section-nav';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Space for the sticky header (and the menu bar on the menu), so headings are not hidden under it. */
function headerOffset(): number {
  return (document.querySelector('header')?.getBoundingClientRect().height ?? 72) + 12;
}

/**
 * Glides to a section of the homepage. Uses one precise scroll (no CSS
 * scroll-snapping or repeated jumps), updates the address bar without adding
 * a history step, and moves keyboard focus to the section for screen readers.
 */
export function scrollToSection(id: string) {
  const target = id === 'home' ? null : document.getElementById(id);
  if (id !== 'home' && !target) return false;
  const top = target ? target.getBoundingClientRect().top + window.scrollY - headerOffset() : 0;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
  window.scrollTo({ top: Math.max(0, top), behavior: reducedMotion() ? 'auto' : 'smooth' });
  history.replaceState(history.state, '', id === 'home' ? '/' : `#${id}`);
  if (target) {
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
  return true;
}

type Props = Omit<React.ComponentProps<'a'>, 'href'> & { section: string; onNavigate?: () => void };

/** A link to a section: smooth scrolling on the homepage, a normal link from other pages. */
export function SectionLink({ section, onNavigate, onClick, children, ...rest }: Props) {
  const pathname = usePathname();
  const href = section === 'home' ? '/' : `/#${section}`;
  return (
    <Link
      href={href}
      scroll={section === 'home' ? true : undefined}
      onClick={(e) => {
        onClick?.(e);
        onNavigate?.();
        if (pathname !== '/' || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        // Let a closing mobile menu give the page back its scrollbar first.
        requestAnimationFrame(() => scrollToSection(section));
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}

/**
 * Which section of the homepage is on screen (for the menu highlight).
 * Follows the scroll position; while a link is gliding to a section, it keeps
 * that section highlighted so the menu does not flicker through the ones in between.
 */
export function useActiveSection(): SectionId | null {
  const pathname = usePathname();
  const [active, setActive] = useState<SectionId | null>(null);

  useEffect(() => {
    if (pathname !== '/') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no sections on other pages
      setActive(null);
      return;
    }
    let lockedUntil = 0;
    let frame = 0;
    const ids = NAV_ITEMS.map((n) => n.id);

    const measure = () => {
      frame = 0;
      if (Date.now() < lockedUntil) return;
      const line = headerOffset() + window.innerHeight * 0.3;
      let current: SectionId = 'home';
      for (const id of ids) {
        if (id === 'home') continue;
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      // At the very bottom, the last section counts as reached.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        const last = [...ids].reverse().find((id) => document.getElementById(id));
        if (last) current = last;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const onNav = (e: Event) => {
      const id = (e as CustomEvent<SectionId>).detail;
      setActive(id);
      lockedUntil = Date.now() + 1200;
    };
    const onScrollEnd = () => {
      lockedUntil = 0;
      measure();
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('scrollend', onScrollEnd);
    window.addEventListener(EVENT, onNav);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scrollend', onScrollEnd);
      window.removeEventListener(EVENT, onNav);
    };
  }, [pathname]);

  return active;
}
