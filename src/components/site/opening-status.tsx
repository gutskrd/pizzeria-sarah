'use client';

import { useEffect, useState } from 'react';
import { orderHint, statusSnapshot, type Schedule, type StatusSnapshot } from '@/lib/opening-hours';

/**
 * Live "Nu geopend / Vandaag gesloten" indicator. The server renders the
 * current status; the browser keeps it up to date while the page stays open.
 */
export function OpeningStatus({
  schedule,
  initial,
  tone = 'light',
  showDetail = true,
  initialHint,
}: {
  schedule: Schedule;
  initial: StatusSnapshot;
  tone?: 'light' | 'dark';
  showDetail?: boolean;
  /** Pass the server's orderHint() to show the "bel je bestelling door" nudge. */
  initialHint?: string | null;
}) {
  const [status, setStatus] = useState(initial);
  const [hint, setHint] = useState(initialHint ?? null);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = new Date();
      setStatus(statusSnapshot(schedule, now));
      if (initialHint !== undefined) setHint(orderHint(schedule, now));
    }, 60_000);
    return () => window.clearInterval(id);
  }, [schedule, initialHint]);

  const dot = status.isOpenNow ? 'bg-[#4caf50]' : tone === 'dark' ? 'bg-[#e8a87c]' : 'bg-tomato';
  const line = (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1" aria-live="polite">
      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
          tone === 'dark' ? 'bg-white/10 text-paper' : status.isOpenNow ? 'bg-basil-soft text-basil' : 'bg-tomato-soft text-tomato-dark'
        }`}
      >
        <span className={`relative inline-flex size-2 rounded-full ${dot}`}>
          {status.isOpenNow && <span className="absolute inset-0 animate-ping rounded-full bg-[#4caf50] opacity-60 motion-reduce:hidden" />}
        </span>
        {status.headline}
      </span>
      {showDetail && <span className={tone === 'dark' ? 'text-sm text-paper/80' : 'text-sm text-muted'}>{status.detail}</span>}
    </p>
  );
  if (initialHint === undefined) return line;
  return (
    <div>
      {line}
      {hint && (
        <p className={`mt-2 text-[0.95rem] font-semibold ${tone === 'dark' ? 'text-white' : 'text-ink'}`} aria-live="polite">
          {hint}
        </p>
      )}
    </div>
  );
}
