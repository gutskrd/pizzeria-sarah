'use server';

import { and, eq, gt, isNull } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth/current';
import { AUTH } from '@/lib/auth/constants';
import { cookieNames, cookieOptions } from '@/lib/auth/cookies';
import { checkPasswordPolicy, hashPassword, verifyPassword } from '@/lib/auth/password';
import {
  createSession,
  createTrustedDevice,
  findTrustedDevice,
  isKnownDevice,
  revokeOtherSessions,
  revokeSession,
  revokeTrustedDevices,
  sessionCookieMaxAge,
} from '@/lib/auth/sessions';
import { db, schema } from '@/lib/db';
import { siteUrl } from '@/lib/env';
import { sendEmail } from '@/lib/email';
import { newLoginEmail, passwordChangedEmail, passwordResetEmail, verificationCodeEmail } from '@/lib/email/templates';
import { formatDateTime } from '@/lib/format';
import { generateCode, hashToken, keyedHash, randomToken, safeEqual } from '@/lib/security/crypto';
import { recordSecurityEvent, logActivity } from '@/lib/security/events';
import { approximateLocation } from '@/lib/security/geo';
import { consumeRateLimit, resetRateLimit, waitMessage } from '@/lib/security/rate-limit';
import { getRequestInfo, type RequestInfo } from '@/lib/security/request-info';

export type FormState = { error?: string; message?: string; email?: string } | undefined;

const GENERIC_LOGIN_ERROR = 'Het e-mailadres of wachtwoord klopt niet.';
const SEND_FAILED = 'De inlogcode kon niet worden verstuurd. Probeer het over een paar minuten opnieuw.';

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === 'string' ? value : '';
  return /^\/admin(\/[a-z0-9\-/]*)?$/.test(next) && !next.startsWith('/admin/inloggen') ? next : '/admin';
}

async function startSession(userId: string, info: RequestInfo, remember: boolean, trustedDeviceId: string | null) {
  const { token, session } = await createSession(userId, info, { remember, trustedDeviceId });
  const store = await cookies();
  store.set(cookieNames().session, token, cookieOptions(sessionCookieMaxAge(session)));
  return session;
}

/* ───────────── Stap 1: e-mailadres + wachtwoord ───────────── */

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(254),
  password: z.string().min(1).max(200),
});

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const info = await getRequestInfo();
  const parsed = loginSchema.safeParse({ email: formData.get('email'), password: formData.get('password') });
  const email = typeof formData.get('email') === 'string' ? String(formData.get('email')).trim() : '';
  if (!parsed.success) return { error: 'Vul je e-mailadres en wachtwoord in.', email };

  const ipLimit = await consumeRateLimit(`login:ip:${info.ip ?? 'unknown'}`, 20, 15 * 60);
  const emailLimit = await consumeRateLimit(`login:email:${parsed.data.email}`, 8, 15 * 60);
  if (!ipLimit.ok || !emailLimit.ok) {
    return { error: waitMessage(Math.max(ipLimit.ok ? 0 : ipLimit.retryAfterSeconds, emailLimit.ok ? 0 : emailLimit.retryAfterSeconds)), email };
  }

  const [user] = await db().select().from(schema.adminUsers).where(eq(schema.adminUsers.email, parsed.data.email)).limit(1);
  const valid = await verifyPassword(user?.passwordHash ?? null, parsed.data.password);
  if (!user || !valid) {
    if (user) await recordSecurityEvent('login_failed', user.id, info);
    return { error: GENERIC_LOGIN_ERROR, email };
  }

  const remember = formData.get('remember') === 'on';
  const next = safeNext(formData.get('next'));
  const store = await cookies();
  const names = cookieNames();

  // Known, remembered device: no e-mail code needed.
  const trustedDeviceId = await findTrustedDevice(user.id, store.get(names.device)?.value);
  if (trustedDeviceId) {
    store.set(names.device, store.get(names.device)!.value, cookieOptions(AUTH.trustedDeviceMs));
    await startSession(user.id, info, remember, trustedDeviceId);
    await resetRateLimit(`login:email:${parsed.data.email}`);
    await recordSecurityEvent('login_success', user.id, info);
    redirect(next);
  }

  const code = generateCode();
  const token = randomToken();
  await db()
    .insert(schema.loginChallenges)
    .values({
      userId: user.id,
      tokenHash: hashToken(token),
      codeHash: keyedHash(code, `login:${token}`),
      remember,
      expiresAt: new Date(Date.now() + AUTH.codeTtlMs),
    });
  try {
    await sendEmail({ to: user.email, ...verificationCodeEmail(code) });
  } catch (error) {
    console.error('[login] verification e-mail failed', error instanceof Error ? error.message : error);
    return { error: SEND_FAILED, email };
  }
  await recordSecurityEvent('verification_sent', user.id, info);
  store.set(names.challenge, token, cookieOptions(AUTH.codeTtlMs + 5 * 60 * 1000));
  redirect(`/admin/inloggen/code?next=${encodeURIComponent(next)}`);
}

/* ───────────── Stap 2: verificatiecode ───────────── */

async function currentChallenge() {
  const store = await cookies();
  const token = store.get(cookieNames().challenge)?.value;
  if (!token || token.length > 200) return null;
  const [row] = await db()
    .select({ challenge: schema.loginChallenges, user: schema.adminUsers })
    .from(schema.loginChallenges)
    .innerJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.loginChallenges.userId))
    .where(and(eq(schema.loginChallenges.tokenHash, hashToken(token)), isNull(schema.loginChallenges.consumedAt)))
    .limit(1);
  return row ? { ...row, token } : null;
}

export async function hasPendingChallenge(): Promise<{ email: string } | null> {
  const row = await currentChallenge();
  if (!row || row.challenge.expiresAt.getTime() < Date.now()) return null;
  // Show a masked address only: j***@hotmail.com
  const [local = '', domain = ''] = row.user.email.split('@');
  return { email: `${local.slice(0, 1)}***@${domain}` };
}

export async function verifyCodeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const info = await getRequestInfo();
  const code = String(formData.get('code') ?? '').replace(/\D/g, '');
  const next = safeNext(formData.get('next'));

  const limit = await consumeRateLimit(`verify:ip:${info.ip ?? 'unknown'}`, 30, 15 * 60);
  if (!limit.ok) return { error: waitMessage(limit.retryAfterSeconds) };

  const row = await currentChallenge();
  if (!row || row.challenge.expiresAt.getTime() < Date.now()) {
    return { error: 'Deze code is verlopen. Log opnieuw in om een nieuwe code te ontvangen.' };
  }
  const { challenge, user, token } = row;
  if (challenge.attempts >= AUTH.codeMaxAttempts) {
    await db().update(schema.loginChallenges).set({ consumedAt: new Date() }).where(eq(schema.loginChallenges.id, challenge.id));
    return { error: 'Te veel onjuiste pogingen. Log opnieuw in om een nieuwe code te ontvangen.' };
  }
  if (code.length !== 6) return { error: 'Vul de 6 cijfers uit de e-mail in.' };

  if (!safeEqual(keyedHash(code, `login:${token}`), challenge.codeHash)) {
    const attempts = challenge.attempts + 1;
    await db().update(schema.loginChallenges).set({ attempts }).where(eq(schema.loginChallenges.id, challenge.id));
    await recordSecurityEvent('verification_failed', user.id, info);
    const left = AUTH.codeMaxAttempts - attempts;
    return {
      error:
        left > 0
          ? `Deze code klopt niet. Je kunt het nog ${left} keer proberen.`
          : 'Te veel onjuiste pogingen. Log opnieuw in om een nieuwe code te ontvangen.',
    };
  }

  // Single use: only the request that flips consumed_at may continue.
  const consumed = await db()
    .update(schema.loginChallenges)
    .set({ consumedAt: new Date() })
    .where(and(eq(schema.loginChallenges.id, challenge.id), isNull(schema.loginChallenges.consumedAt)))
    .returning({ id: schema.loginChallenges.id });
  if (consumed.length === 0) return { error: 'Deze code is al gebruikt. Log opnieuw in.' };

  const store = await cookies();
  const names = cookieNames();
  store.delete(names.challenge);

  const knownDevice = await isKnownDevice(user.id, info.device.fingerprint);
  let trustedDeviceId: string | null = null;
  if (challenge.remember) {
    const device = await createTrustedDevice(user.id);
    trustedDeviceId = device.id;
    store.set(names.device, device.token, cookieOptions(AUTH.trustedDeviceMs));
  }
  await startSession(user.id, info, challenge.remember, trustedDeviceId);
  await resetRateLimit(`login:email:${user.email}`);
  await recordSecurityEvent('verification_success', user.id, info);
  await recordSecurityEvent(knownDevice ? 'login_success' : 'login_new_device', user.id, info);

  if (!knownDevice) {
    const [settings] = await db().select({ alerts: schema.siteSettings.newDeviceAlerts }).from(schema.siteSettings).limit(1);
    if (settings?.alerts !== false) {
      const mail = newLoginEmail({
        device: info.device.deviceName,
        browser: `${info.device.browser} · ${info.device.os}`,
        location: approximateLocation(info.country, info.region, info.city),
        when: formatDateTime(new Date()),
      });
      await sendEmail({ to: user.email, ...mail }).catch((error) =>
        console.error('[login] new-device notice failed', error instanceof Error ? error.message : error),
      );
    }
  }
  redirect(next);
}

export async function resendCodeAction(_prev: FormState): Promise<FormState> {
  const info = await getRequestInfo();
  const row = await currentChallenge();
  if (!row || row.challenge.expiresAt.getTime() < Date.now()) {
    return { error: 'Je inlogpoging is verlopen. Log opnieuw in.' };
  }
  const { challenge, user, token } = row;
  const sinceLast = Date.now() - challenge.lastSentAt.getTime();
  if (sinceLast < AUTH.codeResendCooldownMs) {
    const wait = Math.ceil((AUTH.codeResendCooldownMs - sinceLast) / 1000);
    return { error: `Wacht nog ${wait} seconden voordat je een nieuwe code aanvraagt.` };
  }
  if (challenge.sendCount >= AUTH.codeMaxSends) {
    return { error: 'Je hebt al een aantal codes aangevraagd. Log opnieuw in om het nog eens te proberen.' };
  }
  const code = generateCode();
  await db()
    .update(schema.loginChallenges)
    .set({
      codeHash: keyedHash(code, `login:${token}`),
      attempts: 0,
      sendCount: challenge.sendCount + 1,
      lastSentAt: new Date(),
      expiresAt: new Date(Date.now() + AUTH.codeTtlMs),
    })
    .where(eq(schema.loginChallenges.id, challenge.id));
  try {
    await sendEmail({ to: user.email, ...verificationCodeEmail(code) });
  } catch (error) {
    console.error('[login] resend failed', error instanceof Error ? error.message : error);
    return { error: SEND_FAILED };
  }
  await recordSecurityEvent('verification_sent', user.id, info);
  return { message: 'We hebben een nieuwe code gestuurd. De vorige code werkt niet meer.' };
}

/* ───────────── Uitloggen ───────────── */

export async function logoutAction(): Promise<void> {
  const ctx = await getCurrentSession();
  if (ctx) {
    await revokeSession(ctx.session.id, 'logout');
    await recordSecurityEvent('logout', ctx.user.id, ctx.info);
  }
  (await cookies()).delete(cookieNames().session);
  redirect('/admin/inloggen?uitgelogd=1');
}

/* ───────────── Wachtwoord vergeten ───────────── */

const RESET_SENT =
  'Als dit e-mailadres bij ons bekend is, ontvang je binnen een paar minuten een e-mail met een link om een nieuw wachtwoord in te stellen. Kijk ook even in je map met ongewenste e-mail.';

export async function forgotPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const info = await getRequestInfo();
  const parsed = z.email().safeParse(
    String(formData.get('email') ?? '')
      .trim()
      .toLowerCase(),
  );
  if (!parsed.success) return { error: 'Vul een geldig e-mailadres in.' };
  const email = parsed.data;

  const ipLimit = await consumeRateLimit(`reset:ip:${info.ip ?? 'unknown'}`, 5, 60 * 60);
  const emailLimit = await consumeRateLimit(`reset:email:${email}`, 3, 60 * 60);
  // Same answer whether or not the address exists, and whether or not we are rate limited.
  if (!ipLimit.ok || !emailLimit.ok) return { message: RESET_SENT };

  const [user] = await db().select().from(schema.adminUsers).where(eq(schema.adminUsers.email, email)).limit(1);
  if (user) {
    const token = randomToken();
    await db()
      .insert(schema.passwordResetTokens)
      .values({ userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + AUTH.resetTokenTtlMs) });
    await recordSecurityEvent('password_reset_requested', user.id, info);
    const url = `${siteUrl()}/admin/wachtwoord-herstellen?token=${encodeURIComponent(token)}`;
    await sendEmail({ to: user.email, ...passwordResetEmail(url) }).catch((error) =>
      console.error('[reset] e-mail failed', error instanceof Error ? error.message : error),
    );
  }
  return { message: RESET_SENT };
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const info = await getRequestInfo();
  const token = String(formData.get('token') ?? '');
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  const limit = await consumeRateLimit(`reset-submit:ip:${info.ip ?? 'unknown'}`, 10, 60 * 60);
  if (!limit.ok) return { error: waitMessage(limit.retryAfterSeconds) };

  if (!token || token.length > 200) return { error: 'Deze link is ongeldig of verlopen. Vraag een nieuwe link aan.' };
  const [row] = await db()
    .select({ reset: schema.passwordResetTokens, user: schema.adminUsers })
    .from(schema.passwordResetTokens)
    .innerJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.passwordResetTokens.userId))
    .where(
      and(
        eq(schema.passwordResetTokens.tokenHash, hashToken(token)),
        isNull(schema.passwordResetTokens.usedAt),
        gt(schema.passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!row) return { error: 'Deze link is ongeldig of verlopen. Vraag een nieuwe link aan.' };

  const policy = checkPasswordPolicy(password, row.user.email);
  if (policy) return { error: policy };
  if (password !== confirm) return { error: 'De twee wachtwoorden zijn niet hetzelfde.' };

  const used = await db()
    .update(schema.passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(schema.passwordResetTokens.userId, row.user.id), isNull(schema.passwordResetTokens.usedAt)))
    .returning({ id: schema.passwordResetTokens.id });
  if (!used.some((u) => u.id === row.reset.id)) return { error: 'Deze link is al gebruikt. Vraag een nieuwe link aan.' };

  await db()
    .update(schema.adminUsers)
    .set({ passwordHash: await hashPassword(password), passwordChangedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.adminUsers.id, row.user.id));
  await revokeOtherSessions(row.user.id, null, 'password_reset');
  await revokeTrustedDevices(row.user.id, null);
  await recordSecurityEvent('password_reset_completed', row.user.id, info);
  await logActivity(row.user.id, 'beveiliging', 'Wachtwoord opnieuw ingesteld');
  await sendEmail({ to: row.user.email, ...passwordChangedEmail(formatDateTime(new Date())) }).catch((error) =>
    console.error('[reset] notice failed', error instanceof Error ? error.message : error),
  );
  const store = await cookies();
  store.delete(cookieNames().session);
  store.delete(cookieNames().device);
  redirect('/admin/inloggen?wachtwoord=gewijzigd');
}
