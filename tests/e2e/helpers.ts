import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';

export const ADMIN = { email: 'eigenaar@example.com', password: 'Pizzaoven-Dodewaard-1995' };
export const WIDTHS = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920];

type Mail = { to: string; subject: string; text: string; html: string; replyTo?: string };

/** E-mails written by the development outbox (never used in production). */
export function outbox(): Mail[] {
  const dir = path.resolve('data/outbox');
  let files: string[] = [];
  try {
    files = readdirSync(dir).sort();
  } catch {
    return [];
  }
  return files.map((f) => JSON.parse(readFileSync(path.join(dir, f), 'utf8')) as Mail);
}

export function lastMail(filter?: (m: Mail) => boolean): Mail {
  const mails = outbox().filter(filter ?? (() => true));
  const mail = mails.at(-1);
  if (!mail) throw new Error('No e-mail in outbox');
  return mail;
}

export async function waitForMail(count: number, filter?: (m: Mail) => boolean): Promise<Mail> {
  await expect.poll(() => outbox().filter(filter ?? (() => true)).length, { timeout: 10_000 }).toBeGreaterThanOrEqual(count);
  return lastMail(filter);
}

export function codeFrom(mail: Mail): string {
  const m = mail.subject.match(/(\d{6})/);
  if (!m) throw new Error('No code in mail');
  return m[1]!;
}

/** Full login: password + e-mailed 6-digit code. */
export async function login(page: Page, opts: { remember?: boolean; password?: string } = {}) {
  await page.goto('/admin/inloggen');
  await page.getByLabel('E-mailadres').fill(ADMIN.email);
  await page.locator('#password').fill(opts.password ?? ADMIN.password);
  const remember = page.getByRole('checkbox', { name: /Dit apparaat onthouden/ });
  if (opts.remember === false) await remember.uncheck();
  else await remember.check();
  const before = outbox().filter((m) => /inlogcode/.test(m.subject)).length;
  await page.getByRole('button', { name: 'Inloggen' }).click();
  await page.waitForURL(/\/admin\/inloggen\/code|\/admin$/);
  if (page.url().includes('/code')) {
    const mail = await waitForMail(before + 1, (m) => /inlogcode/.test(m.subject));
    await page.getByLabel('Code').fill(codeFrom(mail));
    await page.getByRole('button', { name: 'Bevestigen' }).click();
  }
  await page.waitForURL(/\/admin$/);
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `horizontal overflow on ${page.url()}`).toBeLessThanOrEqual(0);
}

export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.getByRole('status').filter({ hasText: text }).first()).toBeVisible();
}
