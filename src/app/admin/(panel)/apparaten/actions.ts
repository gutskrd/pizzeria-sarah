'use server';

import { z } from 'zod';
import { adminAction, UserError } from '@/lib/admin/action';
import { revokeOtherSessions, revokeTrustedDevices, revokeUserSession } from '@/lib/auth/sessions';
import { logActivity, recordSecurityEvent } from '@/lib/security/events';

export const terminateSession = adminAction(z.object({ id: z.uuid() }), async ({ id }, ctx) => {
  if (id === ctx.session.id) throw new UserError('Dit is het apparaat dat je nu gebruikt. Gebruik ‘Uitloggen’ om hier uit te loggen.');
  const ok = await revokeUserSession(ctx.user.id, id, 'terminated');
  if (!ok) throw new UserError('Deze sessie was al beëindigd.');
  await recordSecurityEvent('session_terminated', ctx.user.id, ctx.info);
  await logActivity(ctx.user.id, 'beveiliging', 'Apparaat uitgelogd');
  return { ok: true, message: 'Sessie beëindigd. Dat apparaat is nu uitgelogd.' };
});

export const terminateOtherSessions = adminAction(z.object({}), async (_input, ctx) => {
  const count = await revokeOtherSessions(ctx.user.id, ctx.session.id, 'terminated_all');
  // Other devices also have to enter a code again next time.
  await revokeTrustedDevices(ctx.user.id, ctx.session.trustedDeviceId);
  await recordSecurityEvent('sessions_terminated_all', ctx.user.id, ctx.info);
  await logActivity(ctx.user.id, 'beveiliging', 'Alle andere apparaten uitgelogd');
  return {
    ok: true,
    message:
      count === 0 ? 'Er waren geen andere apparaten ingelogd.' : count === 1 ? '1 ander apparaat is uitgelogd.' : `${count} andere apparaten zijn uitgelogd.`,
  };
});

export const markNotificationsSeen = adminAction(z.object({}), async (_input, ctx) => {
  const { markAlertsSeen } = await import('@/lib/admin/status');
  await markAlertsSeen(ctx.user.id);
  return { ok: true, message: 'Meldingen gemarkeerd als gezien.' };
});
