'use client';

import { useState } from 'react';
import { RouteIcon } from '@/components/ui/icons';

/**
 * Where to find us: a drawn street map with a pin, and the real Google map
 * only after the visitor asks for it (until then nothing is loaded from Google).
 */
export function LocationCard({ businessName, street, postalCode, city }: { businessName: string; street: string; postalCode: string; city: string }) {
  const [showMap, setShowMap] = useState(false);
  const address = [street, [postalCode, city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const query = encodeURIComponent(`${businessName}, ${address}`);
  const routes = [
    { label: 'Google Maps', href: `https://www.google.com/maps/dir/?api=1&destination=${query}` },
    { label: 'Apple Kaarten', href: `https://maps.apple.com/?daddr=${query}` },
  ];

  return (
    <div className="location-card relative overflow-hidden rounded-[3px] bg-char text-white shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)]">
      <div className="relative aspect-[5/4] w-full sm:aspect-[16/10]">
        {showMap ? (
          <iframe
            title={`Kaart: ${businessName}, ${address}`}
            src={`https://www.google.com/maps?q=${query}&z=16&hl=nl&output=embed`}
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        ) : (
          <>
            <StreetArt />
            <div className="location-pin absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-full" aria-hidden="true">
              <span className="location-pulse" />
              <span className="location-pulse [animation-delay:1.1s]" />
              <svg viewBox="0 0 40 52" className="relative h-14 w-11 drop-shadow-[0_10px_12px_rgba(0,0,0,0.55)]">
                <path d="M20 0C9 0 0 8.6 0 19.4 0 33.5 20 52 20 52s20-18.5 20-32.6C40 8.6 31 0 20 0Z" fill="#d81f26" />
                <circle cx="20" cy="19" r="7.5" fill="#fff" />
              </svg>
            </div>
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-3 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-4 pt-16 sm:flex-row sm:items-end sm:justify-between sm:p-5 sm:pt-20">
              <p className="max-w-xs text-xs text-white/80 sm:text-sm">De kaart komt van Google Maps en wordt pas geladen als je erom vraagt.</p>
              <button type="button" onClick={() => setShowMap(true)} className="btn btn-primary shrink-0 !min-h-11">
                Kaart tonen
              </button>
            </div>
          </>
        )}
      </div>
      <div className="flex flex-col gap-4 border-t-[3px] border-tomato p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <p className="leading-snug">
          <span className="block text-xl font-extrabold uppercase [font-stretch:78%]">{street}</span>
          <span className="text-white/75">{[postalCode, city].filter(Boolean).join(' ')}</span>
        </p>
        <ul className="flex flex-wrap gap-2" aria-label="Route plannen">
          {routes.map((r) => (
            <li key={r.label}>
              <a
                href={r.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/25 px-3.5 text-sm font-semibold transition-colors hover:border-white hover:bg-white hover:text-ink"
              >
                {r.label === 'Google Maps' && <RouteIcon size={16} />}
                {r.label === 'Google Maps' ? 'Route plannen' : r.label}
                {r.label === 'Google Maps' && <span className="sr-only"> met Google Maps</span>}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** A drawn, made-up street pattern: decoration only, not the real streets. */
function StreetArt() {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <rect width="400" height="300" fill="#141414" />
      <defs>
        <radialGradient id="loc-glow" cx="50%" cy="42%" r="45%">
          <stop offset="0%" stopColor="#d81f26" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#d81f26" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g fill="#1c1c1c">
        <rect x="18" y="20" width="96" height="70" rx="4" />
        <rect x="132" y="20" width="70" height="52" rx="4" />
        <rect x="222" y="34" width="84" height="64" rx="4" />
        <rect x="322" y="18" width="70" height="90" rx="4" />
        <rect x="24" y="112" width="74" height="78" rx="4" />
        <rect x="248" y="122" width="62" height="56" rx="4" />
        <rect x="330" y="132" width="62" height="70" rx="4" />
        <rect x="16" y="214" width="110" height="70" rx="4" />
        <rect x="150" y="214" width="84" height="66" rx="4" />
        <rect x="262" y="204" width="56" height="80" rx="4" />
        <rect x="340" y="226" width="54" height="60" rx="4" />
      </g>
      <g stroke="#2b2b2b" strokeLinecap="round" fill="none">
        <path d="M-10 102 C 90 96, 160 110, 410 112" strokeWidth="9" />
        <path d="M-10 202 C 120 196, 250 210, 410 196" strokeWidth="9" />
        <path d="M120 -10 C 124 80, 116 180, 130 310" strokeWidth="9" />
        <path d="M318 -10 C 312 90, 326 200, 322 310" strokeWidth="9" />
        <path d="M212 -10 C 214 60, 226 120, 236 200" strokeWidth="6" />
        <path d="M236 200 C 240 240, 244 270, 246 310" strokeWidth="6" />
      </g>
      <path d="M-20 300 C 80 240, 160 170, 420 40" stroke="#333" strokeWidth="15" strokeLinecap="round" fill="none" />
      <path d="M-20 300 C 80 240, 160 170, 420 40" stroke="#454545" strokeWidth="1.5" strokeDasharray="10 9" fill="none" />
      <rect width="400" height="300" fill="url(#loc-glow)" />
    </svg>
  );
}
