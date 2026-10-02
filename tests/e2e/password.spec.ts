import { expect, test } from '@playwright/test';
import { ADMIN, login, outbox, waitForMail } from './helpers';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe.serial('Wachtwoord', () => {
  const NEW_PASSWORD = 'Nieuwe-Oven-Sleutel-2026';
  const THIRD_PASSWORD = 'Margherita-Calzone-Salami-9';

  test('wachtwoord herstellen met een eenmalige link logt alle apparaten uit', async ({ browser, page }) => {
    // An existing session somewhere else…
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await login(otherPage, { remember: false });

    const before = outbox().filter((m) => m.subject === 'Nieuw wachtwoord instellen').length;
    await page.goto('/admin/wachtwoord-vergeten');
    await page.getByLabel('E-mailadres').fill(ADMIN.email);
    await page.getByRole('button', { name: 'Stuur link' }).click();
    const mail = await waitForMail(before + 1, (m) => m.subject === 'Nieuw wachtwoord instellen');
    const link = mail.text.match(/https?:\/\/\S+wachtwoord-herstellen\?token=\S+/)![0];

    await page.goto(link.replace('http://localhost:3100', ''));
    await page.locator('#password').fill('kort');
    await page.locator('#confirm').fill('kort');
    await page.getByRole('button', { name: 'Wachtwoord opslaan' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toContainText('minimaal 10 tekens');

    await page.locator('#password').fill(NEW_PASSWORD);
    await page.locator('#confirm').fill(NEW_PASSWORD);
    await page.getByRole('button', { name: 'Wachtwoord opslaan' }).click();
    await expect(page).toHaveURL(/wachtwoord=gewijzigd/);
    await expect(page.getByText('Je wachtwoord is gewijzigd.')).toBeVisible();

    // The link only works once.
    await page.goto(link.replace('http://localhost:3100', ''));
    await page.locator('#password').fill('Nog-Een-Ander-Wachtwoord-1');
    await page.locator('#confirm').fill('Nog-Een-Ander-Wachtwoord-1');
    await page.getByRole('button', { name: 'Wachtwoord opslaan' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toContainText(/ongeldig of verlopen|al gebruikt/);

    // The other device was signed out.
    await otherPage.goto('/admin');
    await expect(otherPage).toHaveURL(/\/admin\/inloggen/);
    await other.close();

    // A security notice was sent.
    expect(outbox().some((m) => m.subject === 'Je wachtwoord is gewijzigd')).toBe(true);

    await login(page, { password: NEW_PASSWORD, remember: false });
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Sarah');
  });

  test('wachtwoord wijzigen in Instellingen logt andere apparaten uit', async ({ browser, page }) => {
    await login(page, { password: NEW_PASSWORD, remember: false });
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await login(otherPage, { password: NEW_PASSWORD, remember: false });

    await page.goto('/admin/instellingen#wachtwoord');
    await page.locator('#w-oud').fill('verkeerd-wachtwoord-1');
    await page.locator('#w-nieuw').fill(THIRD_PASSWORD);
    await page.locator('#w-herhaal').fill(THIRD_PASSWORD);
    await page.locator('#wachtwoord').getByRole('button', { name: 'Opslaan' }).click();
    await expect(page.getByText('Je huidige wachtwoord klopt niet.').first()).toBeVisible();

    await page.locator('#w-oud').fill(NEW_PASSWORD);
    await page.locator('#wachtwoord').getByRole('button', { name: 'Opslaan' }).click();
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: /Wachtwoord gewijzigd/ })
        .first(),
    ).toBeVisible();

    // This device stays signed in…
    await page.goto('/admin/apparaten');
    await expect(page).toHaveURL(/\/admin\/apparaten/);
    // …the other one does not.
    await otherPage.goto('/admin');
    await expect(otherPage).toHaveURL(/\/admin\/inloggen/);
    await other.close();
  });
});
