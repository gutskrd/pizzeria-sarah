import Link from 'next/link';
import type { SiteSettings } from '@/lib/content/queries';
import { telHref } from '@/lib/format';
import { weekRows, type Schedule } from '@/lib/opening-hours';
import { DeveloperCredit } from './developer-credit';
import { NAV_ITEMS } from './nav-items';
import { SectionLink } from './section-link';

export function SiteFooter({ settings, schedule, now, hasGallery }: { settings: SiteSettings; schedule: Schedule; now: Date; hasGallery: boolean }) {
  const rows = weekRows(schedule, now);
  // Compact: group consecutive days with identical hours ("Dinsdag t/m zondag").
  const groups: Array<{ from: string; to: string; hours: string }> = [];
  for (const row of rows) {
    const last = groups.at(-1);
    if (last && last.hours === row.hours) last.to = row.name;
    else groups.push({ from: row.name, to: row.name, hours: row.hours });
  }
  const year = now.getFullYear();
  const socials = [
    settings.facebookUrl && { href: settings.facebookUrl, label: 'Facebook' },
    settings.instagramUrl && { href: settings.instagramUrl, label: 'Instagram' },
  ].filter(Boolean) as Array<{ href: string; label: string }>;

  return (
    <footer className="on-dark border-t-[3px] border-tomato bg-char text-paper">
      <div className="container-site grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.2fr_1.2fr] lg:py-16">
        <div>
          <p className="text-[1.9rem] font-extrabold uppercase leading-none [font-stretch:72%]">{settings.businessName}</p>
          <p className="mt-3 max-w-xs text-paper/75">{settings.footerText}</p>
          {socials.length > 0 && (
            <ul className="mt-5 flex gap-4">
              {socials.map((s) => (
                <li key={s.label}>
                  <a href={s.href} rel="noopener noreferrer" target="_blank" className="link-arrow">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <nav aria-label="Footer">
          <h2 className="font-sans text-sm font-semibold uppercase tracking-wider text-paper/60">Website</h2>
          <ul className="mt-3 space-y-1">
            {NAV_ITEMS.filter((item) => item.id !== 'galerij' || hasGallery).map((item) => (
              <li key={item.id}>
                <SectionLink section={item.id} className="inline-flex min-h-9 items-center text-paper/90 hover:text-white hover:underline">
                  {item.label}
                </SectionLink>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="font-sans text-sm font-semibold uppercase tracking-wider text-paper/60">Contact</h2>
          <address className="mt-3 space-y-1 not-italic">
            {settings.street && <p>{settings.street}</p>}
            <p>{[settings.postalCode, settings.city].filter(Boolean).join(' ')}</p>
            <p className="pt-2">
              <a href={telHref(settings.phoneE164)} className="inline-flex min-h-9 items-center hover:underline">
                {settings.phoneDisplay}
              </a>
            </p>
            <p>
              <a href={`mailto:${settings.email}`} className="inline-flex min-h-9 items-center break-all hover:underline">
                {settings.email}
              </a>
            </p>
          </address>
        </div>
        <div>
          <h2 className="font-sans text-sm font-semibold uppercase tracking-wider text-paper/60">Openingstijden</h2>
          <dl className="mt-3 space-y-1.5">
            {groups.map((g) => (
              <div key={g.from} className="flex flex-wrap justify-between gap-x-4">
                <dt>{g.from === g.to ? g.from : `${g.from} t/m ${g.to.toLowerCase()}`}</dt>
                <dd className="tabular-nums text-paper/85">{g.hours}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-site flex flex-col gap-4 py-6 text-sm text-paper/65 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <p>
              © {year} {settings.businessName}, {settings.city}
            </p>
            <ul className="flex gap-5">
              <li>
                <Link href="/privacy" className="inline-flex min-h-9 items-center hover:text-white hover:underline">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/voorwaarden" className="inline-flex min-h-9 items-center hover:text-white hover:underline">
                  Voorwaarden
                </Link>
              </li>
            </ul>
          </div>
          <DeveloperCredit />
        </div>
      </div>
    </footer>
  );
}
