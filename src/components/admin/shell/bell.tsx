'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { markNotificationsSeen } from '@/app/admin/(panel)/apparaten/actions';
import { BellIcon, CheckIcon, ClockIcon, CloseIcon, GlobeIcon, ImageIcon, ListIcon, MailIcon, ShieldIcon, TagIcon, AlertIcon } from '@/components/ui/icons';
import type { AdminNotification, NotificationKind } from '@/lib/admin/status-types';
import { timeAgo } from '@/lib/format';
import { Bubble } from './bubble';
import { useLive } from './live-provider';

const KIND_ICONS: Record<NotificationKind, typeof BellIcon> = {
  message: MailIcon,
  security: ShieldIcon,
  hours: ClockIcon,
  offer: TagIcon,
  photos: ImageIcon,
  menu: ListIcon,
  website: GlobeIcon,
  email: AlertIcon,
};

const TONE_STYLES: Record<AdminNotification['tone'], string> = {
  danger: 'bg-tomato-soft text-tomato-dark',
  warning: 'bg-[#fdf1d8] text-[#8a5a00]',
  info: 'bg-[#e3eff6] text-[#2b6c8f]',
};

/** The notification centre: everything that needs attention, in one list. */
export function NotificationBell({ align = 'right' }: { align?: 'right' | 'left' }) {
  const { status, refresh } = useLive();
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const attention = status.notifications.filter((n) => n.tone !== 'info' || n.isNew);
  const tone = status.notifications.some((n) => n.tone === 'danger') ? 'danger' : attention.length ? 'warning' : 'info';
  const hasNewSecurity = status.notifications.some((n) => n.kind === 'security');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node) && !buttonRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    void refresh();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open, refresh]);

  const label = attention.length ? `Meldingen: ${attention.length} ${attention.length === 1 ? 'melding vraagt' : 'meldingen vragen'} aandacht` : 'Meldingen';

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        className={`relative inline-flex size-11 items-center justify-center rounded-full transition-colors hover:bg-paper ${open ? 'bg-paper text-ink' : 'text-ink-soft'}`}
      >
        <BellIcon size={22} />
        {attention.length > 0 ? (
          <Bubble overlay badge={{ count: attention.length, tone, label }} />
        ) : status.notifications.length > 0 ? (
          <Bubble overlay badge={{ count: null, tone: 'info', label }} />
        ) : null}
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label="Meldingen"
          className={`reveal fixed inset-x-2 top-16 z-50 flex max-h-[calc(100dvh-5rem)] flex-col overflow-hidden rounded-xl border border-line bg-white shadow-[0_20px_50px_-12px_rgba(35,26,21,0.35)] sm:absolute sm:inset-x-auto sm:top-full sm:mt-2 sm:w-[25rem] ${
            align === 'right' ? 'sm:right-0' : 'sm:left-0'
          }`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <h2 className="font-display text-xl">Meldingen</h2>
              <p className="text-xs text-muted">Verdwijnen vanzelf zodra ze zijn opgelost.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex size-9 items-center justify-center rounded-full text-muted hover:bg-paper hover:text-ink"
              aria-label="Meldingen sluiten"
            >
              <CloseIcon size={18} />
            </button>
          </div>

          {status.notifications.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <span className="inline-flex size-12 items-center justify-center rounded-full bg-basil-soft text-basil">
                <CheckIcon size={24} />
              </span>
              <p className="mt-3 font-semibold">Alles is in orde</p>
              <p className="text-sm text-muted">Er zijn geen meldingen.</p>
            </div>
          ) : (
            <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
              {status.notifications.map((n) => {
                const Icon = KIND_ICONS[n.kind];
                return (
                  <li key={n.id}>
                    <Link href={n.href} onClick={() => setOpen(false)} className="flex gap-3 px-4 py-3 transition-colors hover:bg-paper/70">
                      <span className={`mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full ${TONE_STYLES[n.tone]}`}>
                        <Icon size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className={`text-[0.95rem] leading-snug ${n.isNew && n.tone !== 'info' ? 'font-semibold' : 'font-medium'}`}>{n.title}</span>
                          {n.at && <span className="shrink-0 pt-0.5 text-xs text-muted">{timeAgo(new Date(n.at))}</span>}
                        </span>
                        {n.detail && <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{n.detail}</span>}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-line bg-paper/50 px-4 py-2.5">
            <Link href="/admin" onClick={() => setOpen(false)} className="whitespace-nowrap text-sm font-semibold text-tomato hover:underline">
              Naar het dashboard
            </Link>
            {hasNewSecurity && (
              <button
                type="button"
                disabled={marking}
                onClick={async () => {
                  setMarking(true);
                  await markNotificationsSeen({}).catch(() => null);
                  await refresh();
                  setMarking(false);
                }}
                className="admin-btn admin-btn-ghost admin-btn-sm"
              >
                <CheckIcon size={16} /> Markeer als gezien
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
