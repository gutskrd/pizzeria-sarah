'use client';

import { useState } from 'react';

export type DayCount = { date: string; label: string; count: number };

/**
 * Messages per day over the last 14 days. A single series in one hue, thin
 * columns with rounded tops on a shared baseline, a hover/focus tooltip per
 * day, and a screen-reader table with every value.
 */
export function MessageChart({ data }: { data: DayCount[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((n, d) => n + d.count, 0);
  const current = active !== null ? data[active] : null;

  return (
    <figure className="m-0">
      <figcaption>
        <span className="block font-semibold">Berichten per dag</span>
        <span className="block text-sm text-muted">Afgelopen 14 dagen</span>
      </figcaption>
      <p className="mt-1 font-display text-4xl tabular-nums">{total}</p>
      <div className="relative mt-4" onMouseLeave={() => setActive(null)}>
        {current && (
          <div
            className="pointer-events-none absolute -top-11 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-xs text-paper shadow-lg"
            style={{ left: `${((active! + 0.5) / data.length) * 100}%` }}
            role="status"
          >
            <span className="font-semibold tabular-nums">{current.count}</span> {current.count === 1 ? 'bericht' : 'berichten'} · {current.label}
          </div>
        )}
        <div className="flex h-24 items-end gap-[2px] border-b border-line" aria-hidden="true">
          {data.map((d, i) => (
            <div
              key={d.date}
              className="flex h-full flex-1 cursor-default items-end justify-center"
              onMouseEnter={() => setActive(i)}
              onTouchStart={() => setActive(i)}
            >
              <div
                className={`w-full max-w-6 rounded-t-[4px] transition-opacity ${d.count ? 'bg-tomato' : 'bg-line'} ${active !== null && active !== i ? 'opacity-50' : ''}`}
                style={{ height: d.count ? `${Math.max(8, (d.count / max) * 100)}%` : '3px' }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-muted" aria-hidden="true">
          <span>{data[0]?.label}</span>
          <span>vandaag</span>
        </div>
      </div>
      <div className="sr-only">
        <table>
          <caption>Aantal berichten per dag, afgelopen 14 dagen</caption>
          <tbody>
            {data.map((d) => (
              <tr key={d.date}>
                <th scope="row">{d.label}</th>
                <td>{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
