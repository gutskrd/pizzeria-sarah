import 'server-only';
import type { z } from 'zod';
import { getCurrentSession, type AdminContext } from '@/lib/auth/current';
import { consumeRateLimit } from '@/lib/security/rate-limit';

export type FieldErrors = Record<string, string>;

export type ActionResult<T = null> = { ok: true; message?: string; data?: T } | { ok: false; error: string; fieldErrors?: FieldErrors; loggedOut?: boolean };

/** Throw inside an admin action to show a friendly Dutch message to the owner. */
export class UserError extends Error {
  constructor(
    message: string,
    public fieldErrors?: FieldErrors,
  ) {
    super(message);
  }
}

export const GENERIC_ERROR = 'Er is iets misgegaan. Probeer het opnieuw.';

export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Wraps a server action for the admin panel:
 *  1. verifies the session server-side (never trusts the client),
 *  2. applies a generous per-user rate limit,
 *  3. validates input with a zod schema,
 *  4. converts unexpected errors into a friendly Dutch message (details are logged server-side only).
 */
export function adminAction<S extends z.ZodType, T = null>(
  inputSchema: S,
  handler: (input: z.output<S>, ctx: AdminContext) => Promise<ActionResult<T>>,
): (input: z.input<S>) => Promise<ActionResult<T>> {
  return async (input) => {
    const ctx = await getCurrentSession();
    if (!ctx) return { ok: false, error: 'Je bent uitgelogd. Log opnieuw in om verder te gaan.', loggedOut: true };

    const limit = await consumeRateLimit(`admin:${ctx.user.id}`, 300, 60);
    if (!limit.ok) return { ok: false, error: 'Je doet dit wel heel vaak achter elkaar. Wacht even en probeer het opnieuw.' };

    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors = zodFieldErrors(parsed.error);
      return { ok: false, error: 'Controleer de gemarkeerde velden.', fieldErrors };
    }
    try {
      return await handler(parsed.data, ctx);
    } catch (error) {
      if (error instanceof UserError) return { ok: false, error: error.message, fieldErrors: error.fieldErrors };
      console.error('[admin-action]', error);
      return { ok: false, error: GENERIC_ERROR };
    }
  };
}
