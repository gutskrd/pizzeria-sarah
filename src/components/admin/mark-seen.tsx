'use client';

import { useEffect } from 'react';
import { markNotificationsSeen } from '@/app/admin/(panel)/apparaten/actions';
import { useLive } from './shell/live-provider';

/** Opening "Ingelogde apparaten" counts as having seen the security notifications. */
export function MarkSecuritySeen({ pending }: { pending: boolean }) {
  const { refresh } = useLive();
  useEffect(() => {
    if (!pending) return;
    void markNotificationsSeen({})
      .then(() => refresh())
      .catch(() => undefined);
  }, [pending, refresh]);
  return null;
}
