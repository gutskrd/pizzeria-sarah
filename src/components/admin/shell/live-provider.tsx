'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/admin/toast';
import type { AdminStatus } from '@/lib/admin/status-types';

type LiveContextValue = { status: AdminStatus; refresh: () => Promise<void> };

const LiveContext = createContext<LiveContextValue | null>(null);

const POLL_MS = 30_000;

/**
 * Keeps notification bubbles, the bell and the tab title up to date while the
 * admin is open: polls every 30 seconds (only while the tab is visible) and
 * immediately when the owner returns to the tab.
 */
export function LiveProvider({ initial, children }: { initial: AdminStatus; children: React.ReactNode }) {
  const [status, setStatus] = useState(initial);
  const [syncedFrom, setSyncedFrom] = useState(initial);
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const lastNewest = useRef(initial.newestUnread?.id ?? null);

  // Server-rendered data after a navigation or router.refresh() wins.
  if (initial !== syncedFrom) {
    setSyncedFrom(initial);
    if (initial.generatedAt > status.generatedAt) setStatus(initial);
  }

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/status', { cache: 'no-store' });
      if (res.status === 401) {
        router.push(`/admin/inloggen?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      const body = (await res.json()) as { ok: boolean; data?: AdminStatus };
      if (body.ok && body.data) setStatus(body.data);
    } catch {
      // Offline for a moment: keep the last known status.
    }
  }, [router]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, [refresh]);

  // A message that arrives while the admin is open gets a toast.
  useEffect(() => {
    const newest = status.newestUnread;
    if (newest && newest.id !== lastNewest.current && !pathname.startsWith(`/admin/berichten/${newest.id}`)) {
      toast.success(`Nieuw bericht van ${newest.name}: ${newest.subject}`, { label: 'Bekijken', onClick: () => router.push(`/admin/berichten/${newest.id}`) });
    }
    lastNewest.current = newest?.id ?? null;
  }, [status.newestUnread, pathname, router, toast]);

  // "(3) Berichten – Beheer" in the browser tab.
  useEffect(() => {
    const apply = () => {
      const base = document.title.replace(/^\(\d+\+?\)\s/, '');
      const next = status.unread > 0 ? `(${status.unread > 99 ? '99+' : status.unread}) ${base}` : base;
      if (document.title !== next) document.title = next;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [status.unread, pathname]);

  return <LiveContext.Provider value={{ status, refresh }}>{children}</LiveContext.Provider>;
}

export function useLive(): LiveContextValue {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error('useLive must be used inside LiveProvider');
  return ctx;
}
