'use client';

import { useEffect, useState } from 'react';
import { statusSnapshot, type Schedule, type StatusSnapshot } from '@/lib/opening-hours';

/**
 * Live "Nu geopend / Vandaag gesloten" indicator. The server renders the
 * current status; the browser keeps it up to date while the page stays open.
 */
export function OpeningStatus({
  schedule,
  initial,
  tone = 'light',
  showDetail = true,
}: {
  schedule: Schedule;
  initial: StatusSnapshot;
  tone?: 'light' | 'dark';
  showDetail?: boolean;
}) {
  const [status, setStatus] = useState(initial);

  useEffect(() => {
    const id = window.setInterval(() => setStatus(statusSnapshot(schedule, new Date())), 60_000);
    return () => window.clearInterval(id);
  }, [schedule]);

  const dot = status.isOpenNow ? 'bg-[#4caf50]' : tone === 'dark' ? 'bg-[#e8a87c]' : 'bg-tomato';
  return (
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
}
