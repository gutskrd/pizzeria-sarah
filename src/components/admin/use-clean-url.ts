'use client';

import { useEffect } from 'react';

/** Removes one-time query parameters (deep links such as ?gerecht=…) from the address bar after use. */
export function useCleanUrl(params: string[]) {
  useEffect(() => {
    const url = new URL(window.location.href);
    let changed = false;
    for (const p of params) {
      if (url.searchParams.has(p)) {
        url.searchParams.delete(p);
        changed = true;
      }
    }
    if (changed) window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
