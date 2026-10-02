'use server';

import { and, eq, ne } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { adminAction, UserError } from '@/lib/admin/action';
import { cookieNames, cookieOptions } from '@/lib/auth/cookies';
import { checkPasswordPolicy, hashPassword, verifyPassword } from '@/lib/auth/password';
import { revokeOtherSessions, revokeTrustedDevices, sessionCookieMaxAge } from '@/lib/auth/sessions';
import { invalidatePublicContent } from '@/lib/content/cache';
import { db, schema } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { passwordChangedEmail } from '@/lib/email/templates';
import { formatDateTime } from '@/lib/format';
import { hashToken, randomToken } from '@/lib/security/crypto';
import { logActivity, recordSecurityEvent } from '@/lib/security/events';
import { consumeRateLimit } from '@/lib/security/rate-limit';

/** "0488 - 411 767" → "+31488411767" */
function toE164(display: string): string | null {
  const digits = display.replace(/[^\d+]/g, '');
  if (/^\+\d{8,15}$/.test(digits)) return digits;
  if (/^00\d{8,15}$/.test(digits)) return `+${digits.slice(2)}`;
  if (/^0\d{9}$/.test(digits)) return `+31${digits.slice(1)}`;
  return null;
}

export const saveBusinessInfo = adminAction(
  z.object({
    businessName: z.string().trim().min(1, 'Vul de naam van de zaak in.').max(80),
    tagline: z.string().trim().min(1, 'Vul een korte omschrijving in.').max(80),
    phoneDisplay: z.string().trim().min(6, 'Vul een telefoonnummer in.').max(30),
    email: z.email('Vul een geldig e-mailadres in.').max(254),
    street: z.string().trim().max(100),
    postalCode: z
      .string()
      .trim()
      .max(10)
      .refine((v) => v === '' || /^\d{4}\s?[A-Za-z]{2}$/.test(v), 'Vul een geldige postcode in, bijvoorbeeld 6669 AP.')
      .transform((v) => (v ? `${v.slice(0, 4)} ${v.replace(/\s/g, '').slice(4).toUpperCase()}` : v)),
    city: z.string().trim().min(1, 'Vul de plaats in.').max(60),
    foundedYear: z
      .string()
      .trim()
      .refine((v) => v === '' || (/^\d{4}$/.test(v) && Number(v) >= 1900 && Number(v) <= new Date().getFullYear()), 'Vul een geldig jaartal in.')
      .transform((v) => (v ? Number(v) : null)),
  }),
  async (input, ctx) => {
    const phoneE164 = toE164(input.phoneDisplay);
    if (!phoneE164) throw new UserError('Controleer het telefoonnummer.', { phoneDisplay: 'Vul een geldig telefoonnummer in, bijvoorbeeld 0488 - 411 767.' });
    await db()
      .update(schema.siteSettings)
      .set({ ...input, phoneE164, email: input.email.toLowerCase(), updatedAt: new Date() })
      .where(eq(schema.siteSettings.id, 1));
    await logActivity(ctx.user.id, 'instellingen', 'Bedrijfsgegevens aangepast');
    invalidatePublicContent();
    return { ok: true, message: 'Wijzigingen opgeslagen.' };
  },
);

const socialUrl = (host: string) =>
  z
    .string()
    .trim()
    .max(200)
    .refine((v) => {
      if (!v) return true;
      try {
        const u = new URL(v);
        return u.protocol === 'https:' && (u.hostname === host || u.hostname.endsWith(`.${host}`));
      } catch {
        return false;
      }
    }, `Plak hier de volledige link naar je pagina, beginnend met https://www.${host}/`);

export const saveSocialLinks = adminAction(
  z.object({ facebookUrl: socialUrl('facebook.com'), instagramUrl: socialUrl('instagram.com') }),
  async (input, ctx) => {
    await db()
      .update(schema.siteSettings)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(schema.siteSettings.id, 1));
    await logActivity(ctx.user.id, 'instellingen', 'Social media aangepast');
    invalidatePublicContent();
    return { ok: true, message: 'Wijzigingen opgeslagen.' };
  },
);

export const saveNotifications = adminAction(z.object({ newDeviceAlerts: z.boolean(), messageAlerts: z.boolean() }), async (input, ctx) => {
  await db()
    .update(schema.siteSettings)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(schema.siteSettings.id, 1));
  await logActivity(ctx.user.id, 'instellingen', 'Meldingen aangepast');
  invalidatePublicContent();
  return { ok: true, message: 'Wijzigingen opgeslagen.' };
});

export const updateAccount = adminAction(
  z.object({
    name: z.string().trim().min(1, 'Vul je naam in.').max(60),
    email: z.email('Vul een geldig e-mailadres in.').max(254),
    currentPassword: z.string().max(200),
  }),
  async (input, ctx) => {
    const email = input.email.toLowerCase();
    const emailChanged = email !== ctx.user.email;
    if (emailChanged) {
      const limit = await consumeRateLimit(`reauth:${ctx.user.id}`, 5, 15 * 60);
      if (!limit.ok) throw new UserError('Te veel pogingen. Probeer het over een kwartier opnieuw.');
      const [user] = await db().select().from(schema.adminUsers).where(eq(schema.adminUsers.id, ctx.user.id)).limit(1);
      if (!(await verifyPassword(user?.passwordHash ?? null, input.currentPassword))) {
        throw new UserError('Je huidige wachtwoord klopt niet.', { currentPassword: 'Je huidige wachtwoord klopt niet.' });
      }
      const [clash] = await db()
        .select({ id: schema.adminUsers.id })
        .from(schema.adminUsers)
        .where(and(eq(schema.adminUsers.email, email), ne(schema.adminUsers.id, ctx.user.id)))
        .limit(1);
      if (clash) throw new UserError('Dit e-mailadres kan niet worden gebruikt.', { email: 'Dit e-mailadres kan niet worden gebruikt.' });
    }
    await db().update(schema.adminUsers).set({ name: input.name, email, updatedAt: new Date() }).where(eq(schema.adminUsers.id, ctx.user.id));
    if (emailChanged) {
      await recordSecurityEvent('email_changed', ctx.user.id, ctx.info);
      await sendEmail({
        to: ctx.user.email,
        subject: 'Je inlog-e-mailadres is gewijzigd',
        text: `Het e-mailadres waarmee je inlogt op het beheer van de website is op ${formatDateTime(new Date())} gewijzigd naar ${email}. Was jij dit niet? Neem dan direct contact op met je websitebeheerder.`,
        html: `<p>Het e-mailadres waarmee je inlogt op het beheer van de website is op ${formatDateTime(new Date())} gewijzigd naar <strong>${email.replace(/[<>&"]/g, '')}</strong>.</p><p>Was jij dit niet? Neem dan direct contact op met je websitebeheerder.</p>`,
      }).catch((e) => console.error('[account] notice failed', e instanceof Error ? e.message : e));
    }
    await logActivity(ctx.user.id, 'instellingen', emailChanged ? 'Inlog-e-mailadres gewijzigd' : 'Accountgegevens aangepast');
    return { ok: true, message: emailChanged ? 'Opgeslagen. Je logt voortaan in met je nieuwe e-mailadres.' : 'Wijzigingen opgeslagen.' };
  },
);

export const changePassword = adminAction(
  z.object({ currentPassword: z.string().max(200), newPassword: z.string().max(200), confirmPassword: z.string().max(200) }),
  async (input, ctx) => {
    const limit = await consumeRateLimit(`reauth:${ctx.user.id}`, 5, 15 * 60);
    if (!limit.ok) throw new UserError('Te veel pogingen. Probeer het over een kwartier opnieuw.');
    const [user] = await db().select().from(schema.adminUsers).where(eq(schema.adminUsers.id, ctx.user.id)).limit(1);
    if (!user || !(await verifyPassword(user.passwordHash, input.currentPassword))) {
      throw new UserError('Je huidige wachtwoord klopt niet.', { currentPassword: 'Je huidige wachtwoord klopt niet.' });
    }
    const policy = checkPasswordPolicy(input.newPassword, user.email);
    if (policy) throw new UserError(policy, { newPassword: policy });
    if (input.newPassword !== input.confirmPassword)
      throw new UserError('De twee wachtwoorden zijn niet hetzelfde.', { confirmPassword: 'De twee wachtwoorden zijn niet hetzelfde.' });
    if (input.newPassword === input.currentPassword)
      throw new UserError('Kies een ander wachtwoord dan je huidige.', { newPassword: 'Kies een ander wachtwoord dan je huidige.' });

    await db()
      .update(schema.adminUsers)
      .set({ passwordHash: await hashPassword(input.newPassword), passwordChangedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.adminUsers.id, user.id));
    const revoked = await revokeOtherSessions(user.id, ctx.session.id, 'password_changed');
    await revokeTrustedDevices(user.id, ctx.session.trustedDeviceId);

    // Give the current session a fresh token as well.
    const token = randomToken();
    await db()
      .update(schema.sessions)
      .set({ tokenHash: hashToken(token), prevTokenHash: null, tokenRotatedAt: new Date() })
      .where(eq(schema.sessions.id, ctx.session.id));
    (await cookies()).set(cookieNames().session, token, cookieOptions(sessionCookieMaxAge(ctx.session)));

    await recordSecurityEvent('password_changed', user.id, ctx.info);
    await logActivity(user.id, 'beveiliging', 'Wachtwoord gewijzigd');
    await sendEmail({ to: user.email, ...passwordChangedEmail(formatDateTime(new Date())) }).catch((e) =>
      console.error('[password] notice failed', e instanceof Error ? e.message : e),
    );
    return {
      ok: true,
      message:
        revoked > 0
          ? `Wachtwoord gewijzigd. ${revoked === 1 ? '1 ander apparaat is' : `${revoked} andere apparaten zijn`} uitgelogd.`
          : 'Wachtwoord gewijzigd.',
    };
  },
);
