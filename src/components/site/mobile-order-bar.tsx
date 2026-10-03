'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PhoneIcon, RouteIcon } from '@/components/ui/icons';
import { SectionLink } from './section-link';
import { statusSnapshot, type Schedule, type StatusSnapshot } from '@/lib/opening-hours';

/** "Nu open", "Vandaag 16:00" or "Gesloten": short enough for a phone. */
function shortStatus(status: StatusSnapshot): string {
  if (status.isOpenNow) return 'Nu open';
  const opens = status.todayHours.match(/^\d{1,2}:\d{2}/)?.[0];
  return status.headline.startsWith('Vandaag geopend') && opens ? `Vandaag ${opens}` : 'Gesloten';
}

/**
 * On phones: a slim bar at the bottom with the live status and the two things
 * people come for: calling to order and the menu. Appears after scrolling past
 * the top of the page and steps aside when the footer comes into view.
 */
export function MobileOrderBar({
  phoneHref,
  routeUrl,
  schedule,
  initial,
}: {
  phoneHref: string;
  routeUrl: string | null;
  schedule: Schedule;
  initial: StatusSnapshot;
}) {
  const pathname = usePathname();
  const [status, setStatus] = useState(initial);
  const [scrolled, setScrolled] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 420);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const footer = document.querySelector('footer');
    const observer = footer ? new IntersectionObserver(([entry]) => setFooterVisible(Boolean(entry?.isIntersecting))) : null;
    if (footer) observer?.observe(footer);
    const timer = window.setInterval(() => setStatus(statusSnapshot(schedule, new Date())), 60_000);
    return () => {
      window.removeEventListener('scroll', onScroll);
      observer?.disconnect();
      window.clearInterval(timer);
    };
  }, [schedule, pathname]);

  const shown = scrolled && !footerVisible;
  const onMenu = pathname.startsWith('/menukaart');

  return (
    <div
      className={`mobile-order-bar on-dark fixed inset-x-0 transition-transform duration-300 bottom-0 z-30 border-t border-white/10 bg-char px-3 pt-2.5 text-white shadow-[0_-12px_30px_-12px_rgba(0,0,0,0.5)] md:hidden ${
        shown ? 'translate-y-0' : 'pointer-events-none translate-y-full'
      }`}
      style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom))' }}
      aria-hidden={!shown}
      inert={!shown}
    >
      <div className="flex items-center gap-2">
        <p className="mr-auto flex min-w-0 items-center gap-2 text-sm font-semibold">
          <span className={`size-2 shrink-0 rounded-full ${status.isOpenNow ? 'bg-[#4caf50]' : 'bg-[#e8a87c]'}`} aria-hidden="true" />
          <span className="truncate">{shortStatus(status)}</span>
        </p>
        {onMenu && routeUrl ? (
          <a href={routeUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline !min-h-11 !px-3.5 !text-sm">
            <RouteIcon size={16} /> Route
          </a>
        ) : (
          !onMenu && (
            <SectionLink section="menukaart" className="btn btn-outline !min-h-11 !px-3.5 !text-sm">
              Menukaart
            </SectionLink>
          )
        )}
        <a href={phoneHref} className="btn btn-primary !min-h-11 !px-4 !text-sm">
          <PhoneIcon size={16} /> Bellen
        </a>
      </div>
    </div>
  );
}
