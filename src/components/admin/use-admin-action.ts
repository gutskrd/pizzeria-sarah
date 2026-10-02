'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import type { ActionResult } from '@/lib/admin/action';
import { useToast } from './toast';

export const NETWORK_ERROR = 'Opslaan is niet gelukt. Controleer je internetverbinding en probeer het opnieuw.';

/**
 * Runs an admin server action with consistent feedback: a Dutch success toast,
 * friendly errors, a redirect to the login page when the session has ended,
 * and a refresh of the server-rendered data.
 */
export function useAdminAction() {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const run = useCallback(
    async <T>(
      fn: () => Promise<ActionResult<T>>,
      opts: { success?: string; message?: string; refresh?: boolean; silent?: boolean; undo?: { label: string; onClick: () => void } } = {},
    ): Promise<ActionResult<T>> => {
      let result: ActionResult<T>;
      try {
        result = await fn();
      } catch {
        result = { ok: false, error: NETWORK_ERROR };
      }
      if (result.ok) {
        setFieldErrors({});
        if (!opts.silent) toast.success(opts.message ?? result.message ?? opts.success ?? 'Wijzigingen opgeslagen.', opts.undo);
        if (opts.refresh !== false) startTransition(() => router.refresh());
      } else {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        if (result.loggedOut) router.push(`/admin/inloggen?next=${encodeURIComponent(window.location.pathname)}`);
      }
      return result;
    },
    [router, toast],
  );

  return { run, refreshing: pending, fieldErrors, setFieldErrors };
}
