import { expect, test } from '@playwright/test';
import { ADMIN, codeFrom, login, outbox, waitForMail } from './helpers';

const PROTECTED = [
  '/admin',
  '/admin/website',
  '/admin/menukaart',
  '/admin/fotos',
  '/admin/fotos/prullenbak',
  '/admin/openingstijden',
  '/admin/berichten',
  '/admin/aanbiedingen',
  '/admin/apparaten',
  '/admin/instellingen',
];

test.describe('Zonder inloggen', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const path of PROTECTED) {
    test(`${path} stuurt door naar inloggen`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status()).toBe(307);
      expect(res.headers().location).toMatch(/\/admin\/inloggen/);
    });
  }

  test('een bericht bekijken kan niet', async ({ request }) => {
    const res = await request.get('/admin/berichten/00000000-0000-0000-0000-000000000000', { maxRedirects: 0 });
    expect(res.status()).toBe(307);
  });

  test('foto-upload weigert zonder sessie', async ({ request }) => {
    const res = await request.post('/api/admin/images', {
      headers: { origin: 'http://localhost:3100' },
      multipart: { file: { name: 'a.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]) } },
    });
    expect(res.status()).toBe(401);
    expect((await res.json()).error).toMatch(/uitgelogd/);
  });

  test('foto vervangen en PDF-upload weigeren zonder sessie', async ({ request }) => {
    for (const url of ['/api/admin/images/00000000-0000-0000-0000-000000000000/replace', '/api/admin/menu-pdf']) {
      const res = await request.post(url, {
        headers: { origin: 'http://localhost:3100' },
        multipart: { file: { name: 'x.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') } },
      });
      expect(res.status()).toBe(401);
    }
  });

  test('uploads van een ander domein worden geweigerd', async ({ request }) => {
    const res = await request.post('/api/admin/images', {
      headers: { origin: 'https://evil.example' },
      multipart: { file: { name: 'a.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff]) } },
    });
    expect(res.status()).toBe(403);
  });

  test('een verzonnen sessiecookie werkt niet', async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ name: 'ps_session', value: 'a'.repeat(43), domain: 'localhost', path: '/' }]);
    const page = await context.newPage();
    await page.goto('/admin/instellingen');
    await expect(page).toHaveURL(/\/admin\/inloggen/);
    await context.close();
  });

  test('verkeerd wachtwoord geeft een algemene melding', async ({ page }) => {
    await page.goto('/admin/inloggen');
    await page.getByLabel('E-mailadres').fill(ADMIN.email);
    await page.locator('#password').fill('helemaal-verkeerd-123');
    await page.getByRole('button', { name: 'Inloggen' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toHaveText('Het e-mailadres of wachtwoord klopt niet.');
  });

  test('een onbekend e-mailadres geeft dezelfde melding', async ({ page }) => {
    await page.goto('/admin/inloggen');
    await page.getByLabel('E-mailadres').fill('bestaat-niet@example.com');
    await page.locator('#password').fill('helemaal-verkeerd-123');
    await page.getByRole('button', { name: 'Inloggen' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toHaveText('Het e-mailadres of wachtwoord klopt niet.');
  });

  test('wachtwoord vergeten verraadt niet of een adres bestaat', async ({ page }) => {
    const isReset = (m: { subject: string }) => m.subject === 'Nieuw wachtwoord instellen';
    const before = outbox().filter(isReset).length;
    await page.goto('/admin/wachtwoord-vergeten');
    await page.getByLabel('E-mailadres').fill('onbekend@example.com');
    await page.getByRole('button', { name: 'Stuur link' }).click();
    const unknownText = await page.getByRole('status').textContent();
    await page.goto('/admin/wachtwoord-vergeten');
    await page.getByLabel('E-mailadres').fill(ADMIN.email);
    await page.getByRole('button', { name: 'Stuur link' }).click();
    await expect(page.getByRole('status')).toHaveText(unknownText!);
    await waitForMail(before + 1, isReset);
    expect(outbox().filter(isReset).length).toBe(before + 1);
  });
});

test.describe('Inloggen met verificatiecode', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('verkeerde code, juiste code, uitloggen', async ({ page, context }) => {
    await page.goto('/admin/inloggen');
    await page.getByLabel('E-mailadres').fill(ADMIN.email);
    await page.locator('#password').fill(ADMIN.password);
    await page.getByRole('checkbox', { name: /Dit apparaat onthouden/ }).uncheck();
    const before = outbox().filter((m) => /inlogcode/.test(m.subject)).length;
    await page.getByRole('button', { name: 'Inloggen' }).click();
    await expect(page).toHaveURL(/\/admin\/inloggen\/code/);
    const mail = await waitForMail(before + 1, (m) => /inlogcode/.test(m.subject));
    const code = codeFrom(mail);
    expect(mail.text).toContain('10 minuten');

    const wrong = code === '000000' ? '111111' : '000000';
    await page.getByLabel('Code').fill(wrong);
    await page.getByRole('button', { name: 'Bevestigen' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toContainText('Deze code klopt niet. Je kunt het nog 4 keer proberen.');

    await page.getByLabel('Code').fill(code);
    await page.getByRole('button', { name: 'Bevestigen' }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Sarah');

    // Not remembered: browser-session cookie without expiry.
    const session = (await context.cookies()).find((c) => c.name === 'ps_session');
    expect(session?.httpOnly).toBe(true);
    expect(session?.sameSite).toBe('Lax');
    expect(session?.expires).toBe(-1);

    // Code is single use.
    await page.goto('/admin/inloggen/code');
    await expect(page.getByRole('heading', { name: 'Code verlopen' })).toBeVisible();

    await page.goto('/admin');
    await page.getByRole('button', { name: 'Uitloggen' }).first().click();
    await expect(page).toHaveURL(/\/admin\/inloggen\?uitgelogd=1/);
    await expect(page.getByText('Je bent uitgelogd.')).toBeVisible();
    await page.goto('/admin/menukaart');
    await expect(page).toHaveURL(/\/admin\/inloggen/);
  });

  test('“Dit apparaat onthouden” houdt je lang ingelogd en vraagt daarna geen code meer', async ({ page, context }) => {
    await login(page, { remember: true });
    const cookies = await context.cookies();
    const session = cookies.find((c) => c.name === 'ps_session')!;
    const days = (session.expires * 1000 - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29);
    expect(days).toBeLessThan(31);
    expect(cookies.find((c) => c.name === 'ps_device')?.httpOnly).toBe(true);

    await page.getByRole('button', { name: 'Uitloggen' }).first().click();
    await expect(page).toHaveURL(/uitgelogd=1/);

    // Same device: password only, no code.
    const before = outbox().filter((m) => /inlogcode/.test(m.subject)).length;
    await page.getByLabel('E-mailadres').fill(ADMIN.email);
    await page.locator('#password').fill(ADMIN.password);
    await page.getByRole('button', { name: 'Inloggen' }).click();
    await expect(page).toHaveURL(/\/admin$/);
    expect(outbox().filter((m) => /inlogcode/.test(m.subject)).length).toBe(before);
  });
});

test.describe('Ingelogde apparaten', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('een andere sessie beëindigen en alle andere sessies beëindigen', async ({ browser }) => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
    const phone = await browser.newContext({ userAgent: ua, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const phonePage = await phone.newPage();
    const desktopPage = await desktop.newPage();
    await login(phonePage, { remember: true });
    await login(desktopPage, { remember: true });

    // New-device notification e-mail.
    expect(outbox().some((m) => m.subject === 'Nieuwe aanmelding bij Pizzeria Sarah' && /iPhone/.test(m.text) && /Was jij dit niet\?/.test(m.text))).toBe(true);

    await desktopPage.goto('/admin/apparaten');
    await expect(desktopPage.getByText('Deze sessie')).toBeVisible();
    const iphoneCard = desktopPage.getByRole('listitem').filter({ hasText: 'iPhone' }).filter({ hasText: 'Safari · iOS' }).first();
    await expect(iphoneCard).toBeVisible();
    await iphoneCard.getByRole('button', { name: 'Beëindigen' }).first().click();
    await desktopPage.getByRole('dialog').getByRole('button', { name: 'Beëindigen' }).click();
    await expect(desktopPage.getByRole('status').filter({ hasText: 'Sessie beëindigd' })).toBeVisible();

    // The phone is signed out immediately.
    await phonePage.goto('/admin/menukaart');
    await expect(phonePage).toHaveURL(/\/admin\/inloggen/);

    // Sign the phone in again, then end all other sessions from the desktop.
    await login(phonePage, { remember: true });
    await desktopPage.goto('/admin/apparaten');
    await desktopPage.getByRole('button', { name: 'Alle andere sessies beëindigen' }).click();
    await desktopPage.getByRole('dialog').getByRole('button', { name: 'Alle andere beëindigen' }).click();
    await expect(desktopPage.getByRole('status').filter({ hasText: /uitgelogd/ })).toBeVisible();
    await phonePage.goto('/admin');
    await expect(phonePage).toHaveURL(/\/admin\/inloggen/);
    // The current session stays active.
    await desktopPage.goto('/admin/apparaten');
    await expect(desktopPage).toHaveURL(/\/admin\/apparaten/);
    await expect(desktopPage.getByText('Je bent alleen op dit apparaat ingelogd.')).toBeVisible();

    // Security activity is visible.
    await expect(desktopPage.getByText('Alle andere apparaten uitgelogd').first()).toBeVisible();
    await phone.close();
    await desktop.close();
  });

  test('een gestolen cookie in een andere browser wordt geweigerd', async ({ browser }) => {
    const original = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await original.newPage();
    await login(page, { remember: false });
    const cookie = (await original.cookies()).find((c) => c.name === 'ps_session')!;
    const thief = await browser.newContext({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0' });
    await thief.addCookies([cookie]);
    const thiefPage = await thief.newPage();
    await thiefPage.goto('/admin');
    await expect(thiefPage).toHaveURL(/\/admin\/inloggen/);
    // The session was revoked as suspicious, so the original is signed out too.
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/inloggen/);
    await original.close();
    await thief.close();
  });
});
