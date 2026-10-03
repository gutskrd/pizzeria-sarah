import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import sharp from 'sharp';
import { expectNoHorizontalOverflow, outbox, waitForMail, WIDTHS } from './helpers';

const TMP = path.resolve('data/e2e-files');

async function makeImage(name: string, color: string, width = 1600, height = 1200, format: 'jpeg' | 'png' = 'jpeg') {
  mkdirSync(TMP, { recursive: true });
  const file = path.join(TMP, name);
  const img = sharp({ create: { width, height, channels: 3, background: color } });
  writeFileSync(file, await (format === 'jpeg' ? img.jpeg() : img.png()).toBuffer());
  return file;
}

async function toast(page: Page, text: string | RegExp) {
  await expect(page.getByRole('status').filter({ hasText: text }).first()).toBeVisible();
}

const dialog = (page: Page) => page.locator('dialog[open]').last();

/** Sets a time field the way a time picker does (fill() does not trigger React's change event on time inputs). */
async function setTime(input: Locator, value: string) {
  await input.page().locator('html[data-admin-ready="1"]').waitFor({ state: 'attached' });
  await input.evaluate((el: HTMLInputElement, v: string) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

test.describe.serial('Beheer', () => {
  test('dashboard beantwoordt “Is alles goed?”', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Is alles goed?' })).toBeVisible();
    const checks = page.locator('section[aria-labelledby="status-titel"]');
    await expect(checks.getByText('De website is online')).toBeVisible();
    await expect(checks.getByText('De menukaart is nog leeg')).toBeVisible();
    const quick = page.locator('section[aria-labelledby="snel-titel"]');
    for (const label of ['Foto toevoegen', 'Menukaart aanpassen', 'Openingstijden wijzigen', 'Bericht bekijken', 'Website bekijken']) {
      await expect(quick.getByRole('link', { name: label })).toBeVisible();
    }
  });

  test('menukaart: categorie en gerecht toevoegen, prijs wijzigen, verbergen, uitlichten', async ({ page }) => {
    await page.goto('/admin/menukaart');
    await page.getByRole('button', { name: 'Eerste categorie toevoegen' }).click();
    await dialog(page).getByLabel('Naam').fill("Pizza's");
    await dialog(page).getByRole('button', { name: 'Opslaan' }).click();
    await toast(page, 'Categorie toegevoegd.');

    await page.getByRole('button', { name: 'Gerecht toevoegen' }).click();
    await dialog(page).getByLabel('Naam').fill('Testpizza Margherita');
    await dialog(page).getByLabel('Prijs', { exact: true }).fill('abc');
    await dialog(page).getByRole('button', { name: 'Opslaan' }).click();
    await expect(dialog(page).getByText('Vul een geldige prijs in, bijvoorbeeld 12,50.')).toBeVisible();
    await dialog(page).getByLabel('Prijs', { exact: true }).fill('12,50');
    await dialog(page).getByLabel('Beschrijving').fill('Tomatensaus en kaas');
    await dialog(page).getByRole('button', { name: 'Opslaan' }).click();
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await toast(page, 'Gerecht toegevoegd.');

    await page.getByRole('button', { name: 'Gerecht toevoegen' }).click();
    await dialog(page).getByLabel('Naam').fill('Testschotel');
    await dialog(page).getByRole('button', { name: 'Prijs per formaat toevoegen' }).click();
    await dialog(page).getByLabel('Naam van prijs 1').fill('Klein');
    await dialog(page).getByLabel('Prijs 1', { exact: true }).fill('9');
    await dialog(page).getByRole('button', { name: 'Prijs per formaat toevoegen' }).click();
    await dialog(page).getByLabel('Naam van prijs 2').fill('Groot');
    await dialog(page).getByLabel('Prijs 2', { exact: true }).fill('13,5');
    await dialog(page).getByRole('button', { name: 'Opslaan' }).click();
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await toast(page, 'Gerecht toegevoegd.');

    await page.goto('/menukaart');
    await expect(page.getByRole('heading', { name: "Pizza's", level: 2 })).toBeVisible();
    await expect(page.getByText('Testpizza Margherita')).toBeVisible();
    await expect(page.getByText(/€\s12,50/)).toBeVisible();
    await expect(page.getByText(/€\s13,50/)).toBeVisible();
    // Search
    await page.getByRole('searchbox', { name: 'Zoek een gerecht' }).fill('schotel');
    await expect(page.getByText('Testpizza Margherita')).toBeHidden();
    await expect(page.getByText('Testschotel')).toBeVisible();

    // Change price
    await page.goto('/admin/menukaart');
    await page.getByRole('button', { name: 'Testpizza Margherita bewerken' }).click();
    await dialog(page).getByLabel('Prijs', { exact: true }).fill('13,00');
    await dialog(page).getByRole('button', { name: 'Opslaan' }).click();
    await toast(page, 'Wijzigingen opgeslagen.');
    await page.goto('/menukaart');
    await expect(page.getByText(/€\s13,00/)).toBeVisible();

    // Feature on the homepage
    await page.goto('/admin/menukaart');
    await page.getByRole('button', { name: 'Testpizza Margherita uitlichten op de homepage' }).click();
    await toast(page, 'uitgelicht');
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Populair' })).toBeVisible();
    await expect(page.getByText('Testpizza Margherita')).toBeVisible();

    // Hide
    await page.goto('/admin/menukaart');
    await page.getByRole('button', { name: 'Testschotel verbergen' }).click();
    await toast(page, 'verborgen');
    await page.goto('/menukaart');
    await expect(page.getByText('Testschotel')).toHaveCount(0);
  });

  test('menukaart: gerecht verwijderen vraagt om bevestiging', async ({ page }) => {
    await page.goto('/admin/menukaart');
    await page.getByRole('button', { name: 'Testschotel bewerken' }).click();
    await dialog(page).getByRole('button', { name: 'Verwijderen', exact: true }).click();
    await expect(dialog(page).getByRole('heading', { name: 'Gerecht verwijderen?' })).toBeVisible();
    await dialog(page).getByRole('button', { name: 'Verwijderen', exact: true }).click();
    await toast(page, 'Gerecht verwijderd.');
    await expect(page.getByText('Testschotel')).toHaveCount(0);
  });

  test('folder: kant vervangen, vouwlijnen aanpassen, verbergen en weer tonen', async ({ page }) => {
    await page.goto('/admin/menukaart');
    const card = page.locator('section', { has: page.getByRole('heading', { name: 'Folder', exact: true }) });
    await expect(card.getByText('Op de website', { exact: true })).toBeVisible();
    const insideInput = card.locator('input[type=file]').first();

    // A portrait photo is not a whole open folder.
    await insideInput.setInputFiles(await makeImage('staand.jpg', '#222222', 800, 1200));
    await expect(page.getByRole('alert').filter({ hasText: /liggende afbeelding/ }).first()).toBeVisible();

    // Replace the inside; the panels are cut again and the preview changes.
    const before = await card.getByRole('img', { name: 'Binnenkant van de folder' }).getAttribute('src');
    await insideInput.setInputFiles(await makeImage('folder-binnen.jpg', '#333333', 1500, 1060));
    await toast(page, 'Binnenkant van de folder opgeslagen');
    await expect(card.getByRole('img', { name: 'Binnenkant van de folder' })).not.toHaveAttribute('src', before!);

    // Move a fold line with the keyboard, name the folder and save.
    const slider = card.getByRole('slider', { name: 'Binnenkant: vouwlijn links' });
    const start = Number(await slider.inputValue());
    await slider.focus();
    for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight');
    await expect.poll(async () => Number(await slider.inputValue())).toBeGreaterThan(start);
    await card.getByLabel('Naam of datum van de folder').fill('testfolder');
    await card.getByRole('button', { name: 'Folder opslaan' }).click();
    await toast(page, /^Folder opgeslagen\.$/);

    await page.goto('/menukaart');
    await page.getByRole('link', { name: 'Bekijk de menukaart-folder (testfolder)' }).click();
    await expect(page.getByRole('dialog', { name: 'Menukaart-folder, testfolder' })).toBeVisible();

    // Hidden: gone from the website. Then shown again.
    for (const shown of [false, true]) {
      await page.goto('/admin/menukaart');
      await card.getByRole('switch', { name: 'Folder tonen op de website' }).click();
      await card.getByRole('button', { name: 'Folder opslaan' }).click();
      await toast(page, /^Folder opgeslagen\.$/);
      await page.goto('/menukaart');
      await expect(page.getByRole('link', { name: /Bekijk de menukaart-folder/ })).toHaveCount(shown ? 1 : 0);
    }
  });

  test("foto's: uploaden, gegevens invullen, zichtbaar in de galerij", async ({ page }) => {
    const red = await makeImage('rood.jpg', '#b3301d');
    const green = await makeImage('groen.png', '#3f6b34', 1200, 900, 'png');
    await page.goto('/admin/fotos');
    await page.getByRole('button', { name: 'Foto toevoegen' }).first().click();
    await dialog(page).locator('input[type=file][multiple]').setInputFiles(red);
    await expect(dialog(page).getByRole('heading', { name: 'Gegevens van de foto' })).toBeVisible({ timeout: 30_000 });
    await dialog(page).getByLabel('Naam').fill('Rode foto');
    await dialog(page).getByLabel('Wat staat er op de foto?').fill('Een rode testfoto');
    await dialog(page).getByRole('button', { name: 'Opslaan' }).click();
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await toast(page, 'Foto succesvol toegevoegd.');

    await page.getByRole('button', { name: 'Foto toevoegen' }).first().click();
    await dialog(page).locator('input[type=file][multiple]').setInputFiles(green);
    await expect(dialog(page).getByRole('heading', { name: 'Gegevens van de foto' })).toBeVisible({ timeout: 30_000 });
    await dialog(page).getByLabel('Naam').fill('Groene foto');
    await dialog(page).getByLabel('Wat staat er op de foto?').fill('Een groene testfoto');
    await dialog(page).getByRole('button', { name: 'Opslaan' }).click();
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await toast(page, 'Foto succesvol toegevoegd.');

    await expect(page.getByRole('button', { name: 'Rode foto bekijken en bewerken' })).toBeVisible();
    await page.goto('/galerij');
    const alts = await page.locator('main ul img').evaluateAll((imgs) => imgs.map((i) => (i.closest('button') as HTMLElement).getAttribute('aria-label')));
    expect(alts[0]).toContain('Een rode testfoto');
    expect(alts[1]).toContain('Een groene testfoto');

    // Lightbox: keyboard navigation and Escape
    await page.getByRole('button', { name: /Foto 1 van 2 vergroten/ }).click();
    await expect(page.getByRole('dialog', { name: 'Foto bekijken' })).toBeVisible();
    await expect(page.getByText('1 van 2')).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByText('2 van 2')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Foto bekijken' })).toBeHidden();
  });

  test("foto's: een vals bestand wordt geweigerd", async ({ page }) => {
    mkdirSync(TMP, { recursive: true });
    const fake = path.join(TMP, 'virus.jpg');
    writeFileSync(fake, '#!/bin/sh\necho gehackt\n');
    await page.goto('/admin/fotos');
    await page.getByRole('button', { name: 'Foto toevoegen' }).first().click();
    await dialog(page).locator('input[type=file][multiple]').setInputFiles(fake);
    await expect(dialog(page).getByText(/geen echte foto|niet ondersteund/)).toBeVisible({ timeout: 20_000 });
    await dialog(page).getByRole('button', { name: 'Klaar' }).click();
  });

  test("foto's: zichtbaarheid en volgorde", async ({ page }) => {
    await page.goto('/admin/fotos');
    await page.getByRole('button', { name: 'Volgorde aanpassen' }).click();
    await page.getByRole('button', { name: 'Groene foto naar voren' }).click();
    await toast(page, 'Volgorde opgeslagen.');
    await page.getByRole('button', { name: 'Klaar' }).click();
    await page.goto('/galerij');
    const first = await page.locator('main ul li button').first().getAttribute('aria-label');
    expect(first).toContain('groene');

    await page.goto('/admin/fotos');
    await page.getByRole('button', { name: 'Groene foto verbergen in de galerij' }).click();
    await toast(page, 'verborgen');
    await page.goto('/galerij');
    await expect(page.locator('main ul li')).toHaveCount(1);
    await page.goto('/admin/fotos');
    await page.getByRole('button', { name: 'Groene foto zichtbaar maken in de galerij' }).click();
    await toast(page, 'zichtbaar');
  });

  test("foto's: hoofdfoto instellen, beschermd tegen verwijderen, vervangen behoudt gebruik", async ({ page }) => {
    await page.goto('/admin/fotos');
    await page.getByRole('button', { name: 'Rode foto bekijken en bewerken' }).click();
    await dialog(page).getByRole('button', { name: 'Gebruik als hoofdfoto van de homepage' }).click();
    await dialog(page).getByRole('button', { name: 'Ja, gebruik deze foto' }).click();
    await toast(page, 'hoofdfoto');
    await expect(page.getByText('Hoofdfoto', { exact: true })).toBeVisible();

    // Protected
    await page.getByRole('button', { name: 'Rode foto bekijken en bewerken' }).click();
    await expect(dialog(page).getByText('Hoofdfoto van de homepage')).toBeVisible();
    await dialog(page).getByRole('button', { name: 'Verwijderen' }).click();
    await expect(dialog(page).getByRole('heading', { name: 'Deze foto is belangrijk' })).toBeVisible();
    await dialog(page).getByRole('button', { name: 'Begrepen' }).click();

    // Replace
    const blue = await makeImage('blauw.jpg', '#1f4fb3', 2000, 1500);
    await dialog(page).locator('input[type=file]').setInputFiles(blue);
    await expect(dialog(page).getByRole('heading', { name: 'Foto vervangen' })).toBeVisible();
    await expect(dialog(page).getByText('Huidige foto', { exact: true })).toBeVisible();
    await expect(dialog(page).getByText('Nieuwe foto', { exact: true })).toBeVisible();
    await dialog(page).getByRole('button', { name: 'Foto vervangen' }).click();
    await toast(page, 'Foto vervangen.');

    // Still the hero, now 2000px wide
    await page.goto('/');
    const heroImg = page.locator('section[aria-labelledby="hero-titel"] img').first();
    await expect(heroImg).toHaveAttribute('width', '2000');
    await expect(heroImg).toHaveAttribute('alt', 'Een rode testfoto');
    const src = await heroImg.getAttribute('src');
    const media = await page.request.get(src!);
    expect(media.status()).toBe(200);
    expect(media.headers()['content-type']).toBe('image/webp');
    expect(media.headers()['cache-control']).toContain('immutable');
  });

  test("foto's: verwijderen, ongedaan maken via de prullenbak", async ({ page }) => {
    await page.goto('/admin/fotos');
    await page.getByRole('button', { name: 'Groene foto bekijken en bewerken' }).click();
    await dialog(page).getByRole('button', { name: 'Verwijderen' }).click();
    await expect(dialog(page).getByRole('heading', { name: 'Foto verwijderen?' })).toBeVisible();
    await expect(dialog(page).getByText('Deze foto wordt verwijderd van de website. Weet je het zeker?')).toBeVisible();
    await expect(dialog(page).getByText('Deze foto wordt momenteel gebruikt op de website:')).toBeVisible();
    await dialog(page).getByRole('button', { name: 'Verwijderen' }).click();
    await toast(page, 'Foto verwijderd.');
    await page.goto('/galerij');
    await expect(page.locator('main ul li')).toHaveCount(1);

    await page.goto('/admin/fotos/prullenbak');
    await page.getByRole('button', { name: 'Terugzetten' }).click();
    await toast(page, 'Foto teruggezet.');
    await page.goto('/galerij');
    await expect(page.locator('main ul li')).toHaveCount(2);
  });

  test('openingstijden: vaste tijden en een afwijking', async ({ page }) => {
    await page.goto('/admin/openingstijden');
    const monday = page.getByRole('radiogroup', { name: 'Maandag: open of gesloten' });
    await monday.getByRole('radio', { name: 'Open' }).click();
    await setTime(page.getByLabel('Maandag open vanaf'), '17:00');
    await setTime(page.getByLabel('Maandag open tot'), '21:30');
    await expect(page.getByText('Je hebt wijzigingen die nog niet zijn opgeslagen.')).toBeVisible();
    await page.getByRole('button', { name: 'Openingstijden opslaan' }).click();
    await toast(page, 'Openingstijden bijgewerkt.');

    await page.goto('/contact');
    await expect(page.getByRole('row', { name: /Maandag/ })).toContainText('17:00 – 21:30');

    // Invalid order is refused
    await page.goto('/admin/openingstijden');
    await setTime(page.getByLabel('Dinsdag open tot'), '15:00');
    await expect(page.getByText('De sluitingstijd (15:00) moet na de openingstijd (16:00) liggen.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Openingstijden opslaan' })).toBeDisabled();
    await page.getByRole('button', { name: 'Annuleren' }).click();

    // Exception
    await page.getByRole('button', { name: 'Afwijking toevoegen' }).click();
    await dialog(page).getByLabel('Omschrijving').fill('Vakantie');
    await dialog(page).getByRole('checkbox', { name: 'Meerdere dagen achter elkaar' }).check();
    const start = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);
    const end = new Date(Date.now() + 9 * 86_400_000).toISOString().slice(0, 10);
    await dialog(page).getByLabel('Van').fill(start);
    await dialog(page).getByLabel('Tot en met').fill(end);
    await dialog(page).getByRole('button', { name: 'Opslaan' }).click();
    await toast(page, 'Afwijkende openingstijden toegevoegd.');

    // Overlap is refused
    await page.getByRole('button', { name: 'Afwijking toevoegen' }).click();
    await dialog(page).getByLabel('Omschrijving').fill('Feestdag');
    await dialog(page).getByLabel('Datum').fill(start);
    await dialog(page).getByRole('button', { name: 'Opslaan' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Er staat al een afwijking' }).first()).toBeVisible();
    await dialog(page).getByRole('button', { name: 'Annuleren' }).click();

    await page.goto('/contact');
    await expect(page.getByText('Afwijkende openingstijden')).toBeVisible();
    await expect(page.getByText('Vakantie').first()).toBeVisible();
  });

  test('berichten: lezen, beantwoorden, archiveren', async ({ page, browser }) => {
    // A visitor sends a message through the contact form.
    const visitor = await browser.newContext();
    const v = await visitor.newPage();
    await v.goto('/contact');
    await v.getByLabel('Naam', { exact: true }).fill('Jan de Vries');
    await v.getByLabel('E-mailadres').fill('jan@example.com');
    await v.getByLabel('Onderwerp').fill('Vraag over een reservering');
    await v.getByLabel('Bericht', { exact: true }).fill('Kunnen we zaterdag met zes personen bij jullie eten?');
    await v.waitForTimeout(3200);
    await v.getByRole('button', { name: 'Bericht versturen' }).click();
    await expect(v.getByRole('status')).toContainText('Bedankt voor je bericht');
    await visitor.close();
    expect(outbox().some((m) => m.subject === 'Nieuw bericht via de website: Vraag over een reservering' && m.replyTo === 'jan@example.com')).toBe(true);

    await page.goto('/admin/berichten');
    const row = page.getByRole('link', { name: /Jan de Vries/ }).first();
    await expect(row).toBeVisible();
    await expect(row.getByText('Nieuw')).toBeVisible();
    await row.click();
    await expect(page.getByRole('heading', { name: 'Vraag over een reservering' })).toBeVisible();
    await expect(page.getByText('Gelezen', { exact: true })).toBeVisible();

    const toJan = (m: { to: string }) => m.to === 'jan@example.com';
    const before = outbox().filter(toJan).length;
    await page.getByRole('button', { name: 'Beantwoorden' }).click();
    await page.getByLabel('Je antwoord').fill('Beste Jan,\n\nDat kan zeker. Tot zaterdag!');
    await page.getByRole('button', { name: 'Antwoord versturen' }).click();
    await toast(page, 'Je antwoord is verstuurd.');
    const mail = await waitForMail(before + 1, toJan);
    expect(mail.subject).toBe('Re: Vraag over een reservering');
    expect(mail.text).toContain('Tot zaterdag!');
    await expect(page.getByText('Beantwoord', { exact: true }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Archiveren' }).click();
    await expect(page).toHaveURL(/\/admin\/berichten$/);
    await page.goto('/admin/berichten?status=archived');
    await expect(page.getByRole('link', { name: /Jan de Vries/ }).first()).toBeVisible();
  });

  test('aanbiedingen: alleen actieve aanbiedingen staan online', async ({ page }) => {
    await page.goto('/admin/aanbiedingen');
    await page.getByRole('button', { name: 'Aanbieding toevoegen' }).click();
    await dialog(page).getByLabel('Titel').fill('Testactie vandaag');
    await dialog(page).getByLabel('Prijs of korting').fill('€ 10,00');
    await dialog(page).getByRole('button', { name: 'Opslaan' }).click();
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await toast(page, 'Aanbieding toegevoegd.');

    await page.getByRole('button', { name: 'Aanbieding toevoegen' }).click();
    await dialog(page).getByLabel('Titel').fill('Testactie later');
    await dialog(page)
      .getByLabel('Vanaf')
      .fill(new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10));
    await dialog(page).getByRole('button', { name: 'Opslaan' }).click();
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await toast(page, 'Aanbieding toegevoegd.');
    await expect(page.getByText('Gepland')).toBeVisible();

    await page.goto('/');
    await expect(page.getByText('Testactie vandaag')).toBeVisible();
    await expect(page.getByText('Testactie later')).toHaveCount(0);
    await page.goto('/menukaart');
    await expect(page.getByText('Testactie vandaag')).toBeVisible();
  });

  test('website: teksten wijzigen en SEO aanpassen', async ({ page }) => {
    await page.goto('/admin/website');
    await page.getByLabel('Titel', { exact: true }).first().fill('Pizzeria Sarah Dodewaard');
    await page.locator('#hoofdfoto').getByRole('button', { name: 'Opslaan' }).click();
    await toast(page, 'Wijzigingen opgeslagen.');
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pizzeria Sarah Dodewaard');

    await page.goto('/admin/website#zoekmachines');
    await page.getByLabel('Titel in Google').nth(1).fill('Menukaart van Pizzeria Sarah in Dodewaard');
    await page.locator('#zoekmachines form').nth(1).getByRole('button', { name: 'Opslaan' }).click();
    await toast(page, 'Wijzigingen opgeslagen.');
    await page.goto('/menukaart');
    await expect(page).toHaveTitle('Menukaart van Pizzeria Sarah in Dodewaard');

    // Empty text is refused with a Dutch message.
    await page.goto('/admin/website');
    const heroText = page.getByLabel('Korte tekst', { exact: true });
    await heroText.click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Backspace');
    await expect(heroText).toHaveValue('');
    await page.locator('#hoofdfoto').getByRole('button', { name: 'Opslaan' }).click();
    await expect(page.getByText('De tekst mag niet leeg zijn.').first()).toBeVisible();
  });

  test('instellingen: telefoonnummer en social media', async ({ page }) => {
    await page.goto('/admin/instellingen');
    await page.getByLabel('Facebook').fill('https://example.com/nep');
    await page.locator('#social').getByRole('button', { name: 'Opslaan' }).click();
    await expect(page.getByText(/volledige link naar je pagina/)).toBeVisible();

    await page.getByLabel('Telefoonnummer').fill('0488 - 411 768');
    await page.locator('#bedrijf').getByRole('button', { name: 'Opslaan' }).click();
    await toast(page, 'Wijzigingen opgeslagen.');
    await page.goto('/contact');
    await expect(page.locator('a[href="tel:+31488411768"]').first()).toBeVisible();

    await page.goto('/admin/instellingen');
    await page.getByLabel('Telefoonnummer').fill('0488 - 411 767');
    await page.locator('#bedrijf').getByRole('button', { name: 'Opslaan' }).click();
    await toast(page, 'Wijzigingen opgeslagen.');
  });

  test('meldingen: bubbel bij Berichten, tabbladtitel en meldingencentrum', async ({ page, browser }) => {
    const visitor = await browser.newContext();
    const v = await visitor.newPage();
    await v.goto('/contact');
    await v.getByLabel('Naam', { exact: true }).fill('Lotte Visser');
    await v.getByLabel('E-mailadres').fill('lotte@example.com');
    await v.getByLabel('Onderwerp').fill('Afhalen om 17 uur');
    await v.getByLabel('Bericht', { exact: true }).fill('Kan ik om 17:00 een pizza komen afhalen?');
    await v.waitForTimeout(3200);
    await v.getByRole('button', { name: 'Bericht versturen' }).click();
    await expect(v.getByRole('status')).toContainText('Bedankt');
    await visitor.close();

    await page.goto('/admin');
    const nav = page.getByRole('navigation', { name: 'Beheermenu' }).first();
    const berichten = nav.getByRole('link', { name: /Berichten/ });
    await expect(berichten).toContainText('1');
    await expect(berichten.getByText('1 ongelezen bericht')).toBeAttached();
    await expect(page).toHaveTitle(/^\(1\) /);

    await page
      .getByRole('button', { name: /^Meldingen/ })
      .first()
      .click();
    const panel = page.getByRole('dialog', { name: 'Meldingen' });
    await expect(panel.getByText('Nieuw bericht van Lotte Visser')).toBeVisible();
    await panel.getByText('Nieuw bericht van Lotte Visser').click();
    await expect(page).toHaveURL(/\/admin\/berichten\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { name: 'Afhalen om 17 uur' })).toBeVisible();

    // Opening the message clears the bubble and the title count.
    await page.goto('/admin');
    await expect(
      page
        .getByRole('navigation', { name: 'Beheermenu' })
        .first()
        .getByRole('link', { name: /Berichten/ }),
    ).not.toContainText(/\d/);
    await expect(page).not.toHaveTitle(/^\(\d+\) /);
  });

  test('live klok en openingsstatus in de bovenbalk', async ({ page }) => {
    await page.goto('/admin/menukaart');
    await expect(page.getByLabel(/^Het is \d{2}:\d{2}$/).first()).toBeVisible();
    await expect(page.getByText(/^(Nu open|Nu gesloten|Gesloten)/).first()).toBeVisible();
  });

  test('zoeken met Ctrl+K: gerecht vinden en direct bewerken', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('html[data-admin-ready="1"]').waitFor({ state: 'attached' });
    await page.keyboard.press('Control+k');
    const box = page.getByRole('combobox', { name: /Zoek een pagina/ });
    await expect(box).toBeFocused();
    await box.fill('Margherita');
    await expect(page.getByRole('option', { name: /Testpizza Margherita/ })).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/admin\/menukaart/);
    await expect(dialog(page).getByRole('heading', { name: 'Gerecht bewerken' })).toBeVisible();
    await expect(dialog(page).getByLabel('Naam')).toHaveValue('Testpizza Margherita');
    await dialog(page).getByRole('button', { name: 'Annuleren' }).click();

    // Pages and actions are found too.
    await page.keyboard.press('Control+k');
    await page.getByRole('combobox', { name: /Zoek een pagina/ }).fill('apparaten');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/admin\/apparaten$/);
  });

  test('vandaag sluiten met één klik, en weer ongedaan maken', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('html[data-admin-ready="1"]').waitFor({ state: 'attached' });
    const today = page.locator('section[aria-labelledby="vandaag-titel"]');
    const closeButton = today.getByRole('button', { name: 'Vandaag sluiten' });
    if ((await closeButton.count()) === 0) test.skip(true, 'Vandaag is de zaak volgens de vaste tijden al gesloten.');
    await closeButton.click();
    await dialog(page).getByRole('button', { name: 'Onverwacht gesloten' }).click();
    await dialog(page).getByRole('button', { name: 'Vandaag sluiten' }).click();
    await toast(page, 'vandaag gesloten');
    await expect(today.getByText('Vandaag gesloten: Onverwacht gesloten')).toBeVisible();

    await page.goto('/');
    await expect(page.getByText('Vandaag gesloten (Onverwacht gesloten)').first()).toBeVisible();

    await page.goto('/admin');
    await page.locator('section[aria-labelledby="vandaag-titel"]').getByRole('button', { name: 'Toch open vandaag' }).click();
    await toast(page, 'vaste openingstijden');
    await page.goto('/');
    await expect(page.getByText('Vandaag gesloten (Onverwacht gesloten)')).toHaveCount(0);
  });

  test('berichten: zoeken, selecteren en in één keer als gelezen markeren', async ({ page }) => {
    await page.goto('/admin/berichten?status=archived');
    await page
      .getByLabel(/Selecteer bericht van Jan de Vries/)
      .first()
      .check();
    await expect(page.getByRole('toolbar', { name: 'Acties voor geselecteerde berichten' })).toContainText('1 geselecteerd');
    await page.getByRole('toolbar').getByRole('button', { name: 'Ongelezen' }).click();
    await toast(page, 'gemarkeerd als ongelezen');

    await page.goto('/admin/berichten');
    await page.getByRole('searchbox', { name: 'Zoek in berichten' }).fill('reservering');
    await expect(page).toHaveURL(/zoek=reservering/);
    await expect(page.getByRole('link', { name: /Jan de Vries/ }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Alles als gelezen markeren' }).click();
    await toast(page, 'gemarkeerd als gelezen');
    await expect(
      page
        .getByRole('navigation', { name: 'Beheermenu' })
        .first()
        .getByRole('link', { name: /Berichten/ }),
    ).not.toContainText(/\d/);
  });

  test('activiteit: volledige geschiedenis per dag, te filteren', async ({ page }) => {
    await page.goto('/admin/activiteit');
    await expect(page.getByRole('heading', { name: 'Vandaag', level: 2 })).toBeVisible();
    await expect(page.getByText('Gerecht toegevoegd: Testpizza Margherita').first()).toBeVisible();
    await page
      .getByRole('navigation', { name: 'Filter op onderdeel' })
      .getByRole('link', { name: /Openingstijden/ })
      .click();
    await expect(page).toHaveURL(/gebied=openingstijden/);
    await expect(page.getByText('Openingstijden gewijzigd').first()).toBeVisible();
    await expect(page.getByText('Gerecht toegevoegd: Testpizza Margherita')).toHaveCount(0);
  });

  test('telefoon: tabbalk met bubbels', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin');
    const tabs = page.getByRole('navigation', { name: 'Snelmenu' });
    await expect(tabs.getByRole('link', { name: /Overzicht/ })).toHaveAttribute('aria-current', 'page');
    await tabs.getByRole('link', { name: /Menukaart/ }).click();
    await expect(page).toHaveURL(/\/admin\/menukaart$/);
    await expectNoHorizontalOverflow(page);
  });

  test('recente wijzigingen staan op het dashboard', async ({ page }) => {
    await page.goto('/admin');
    const recent = page.getByRole('region', { name: 'Recente wijzigingen' }).or(page.locator('section[aria-labelledby="wijzigingen-titel"]'));
    await expect(recent.getByText(/Openingstijden gewijzigd|Foto|Gerecht|Aanbieding|Bedrijfsgegevens/).first()).toBeVisible();
  });

  for (const width of WIDTHS) {
    test(`beheer zonder horizontale scroll op ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const p of [
        '',
        '/website',
        '/menukaart',
        '/fotos',
        '/openingstijden',
        '/berichten',
        '/aanbiedingen',
        '/activiteit',
        '/apparaten',
        '/instellingen',
      ]) {
        await page.goto(`/admin${p}`);
        await expectNoHorizontalOverflow(page);
      }
    });
  }

  test('beheer werkt op een telefoon: menu, foto openen, dialoog past op het scherm', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 760 });
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('navigation', { name: 'Beheermenu' }).last().getByRole('link', { name: "Foto's" }).click();
    await expect(page).toHaveURL(/\/admin\/fotos/);
    await page.getByRole('button', { name: 'Rode foto bekijken en bewerken' }).click();
    const box = await dialog(page).boundingBox();
    expect(box!.width).toBeLessThanOrEqual(375);
    await expect(dialog(page).getByRole('button', { name: 'Vervangen' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
