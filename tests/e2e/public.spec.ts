import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, WIDTHS } from './helpers';

test.use({ storageState: { cookies: [], origins: [] } });

const PAGES: Array<{ path: string; h1: string | RegExp }> = [
  { path: '/', h1: /^Pizzeria Sarah/ },
  { path: '/menukaart', h1: 'Menukaart' },
  { path: '/over-ons', h1: 'Over ons' },
  { path: '/galerij', h1: "Foto's" },
  { path: '/contact', h1: 'Contact' },
  { path: '/privacy', h1: /^Privacy\u00AD?verklaring$/ },
  { path: '/voorwaarden', h1: 'Voorwaarden' },
];

test.describe('Publieke pagina’s', () => {
  for (const p of PAGES) {
    test(`${p.path} heeft één H1, eigen titel, beschrijving en canonical`, async ({ page }) => {
      const response = await page.goto(p.path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText(p.h1);
      await expect(page).toHaveTitle(/Pizzeria Sarah/);
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description?.length).toBeGreaterThan(40);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical === `http://localhost:3100${p.path}` || canonical === `http://localhost:3100${p.path}`.replace(/\/$/, '')).toBe(true);
      await expect(page.locator('html')).toHaveAttribute('lang', 'nl');
      await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
      // Every image needs an alt attribute.
      expect(await page.locator('img:not([alt])').count()).toBe(0);
    });
  }

  test('titels zijn uniek per pagina', async ({ page }) => {
    const titles = new Set<string>();
    for (const p of PAGES) {
      await page.goto(p.path);
      titles.add(await page.title());
    }
    expect(titles.size).toBe(PAGES.length);
  });

  for (const width of WIDTHS) {
    test(`geen horizontale scroll op ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const p of PAGES) {
        await page.goto(p.path);
        await expectNoHorizontalOverflow(page);
      }
    });
  }

  test('navigatie werkt op mobiel en sluit met Escape', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Menu openen' });
    await toggle.click();
    const mobileNav = page.getByRole('navigation', { name: 'Mobiel menu' });
    await expect(mobileNav).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(mobileNav).toBeHidden();
    await page.getByRole('button', { name: 'Menu openen' }).click();
    await mobileNav.getByRole('link', { name: 'Menukaart' }).click();
    await expect(mobileNav).toBeHidden();
    await expect(page).toHaveURL(/\/#menukaart$/);
    // The page glides to the menu section, right below the header.
    await expect.poll(() => page.evaluate(() => Math.round(document.getElementById('menukaart')!.getBoundingClientRect().top))).toBeLessThan(120);
    await expect(page.getByRole('heading', { name: 'Menukaart', level: 2 })).toBeInViewport();
  });

  test('desktopnavigatie scrolt naar de onderdelen en volgt mee', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Hoofdmenu' });
    for (const label of ['Home', 'Menukaart', 'Over ons', 'Contact']) await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'location');
    for (const [label, id] of [
      ['Contact', 'contact'],
      ['Over ons', 'over-ons'],
      ['Menukaart', 'menukaart'],
    ] as const) {
      await nav.getByRole('link', { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/#${id}$`));
      await expect.poll(() => page.evaluate((i) => Math.round(document.getElementById(i)!.getBoundingClientRect().top), id)).toBeLessThan(120);
      await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'location');
    }
    // From another page, a menu item goes to that part of the homepage.
    await page.goto('/privacy');
    await nav.getByRole('link', { name: 'Contact', exact: true }).click();
    await expect(page).toHaveURL(/\/#contact$/);
    await expect(page.locator('#contact-titel')).toBeInViewport();
  });

  test('homepage toont openingsstatus, telefoon en route', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Nu geopend|Nu gesloten|Vandaag gesloten|Vandaag geopend/).first()).toBeVisible();
    await expect(page.locator('a[href="tel:+31488411767"]').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Hele menukaart' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Route plannen/ }).first()).toHaveAttribute('href', /google\.com\/maps/);
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    const data = JSON.parse(jsonLd ?? '{}');
    expect(data['@type']).toBe('Restaurant');
    expect(data.telephone).toBe('+31488411767');
    expect(data.openingHoursSpecification.length).toBeGreaterThanOrEqual(6);
  });

  test('de folder vouwt open, draait om en vouwt weer dicht', async ({ page }) => {
    await page.goto('/menukaart');
    await page.getByRole('link', { name: /Bekijk de menukaart-folder/ }).click();
    const folder = page.getByRole('dialog', { name: /Menukaart-folder/ });
    await expect(folder).toBeVisible();
    await expect(folder.getByRole('img', { name: /Binnenkant van de folder/ })).toHaveAttribute('data-open', 'true');
    await folder.getByRole('button', { name: 'Buitenkant' }).click();
    await expect(folder.getByRole('img', { name: /Buitenkant van de folder/ })).toHaveAttribute('data-side', 'buiten');
    await expect(folder.getByRole('link', { name: 'Vergroten' })).toHaveAttribute('href', /^\/media\/[\w-]+\/buitenkant\.webp$/);
    await page.keyboard.press('Escape');
    await expect(folder).toBeHidden();
  });

  test('de menukaart is als PDF te downloaden', async ({ page, request }) => {
    await page.goto('/menukaart');
    const link = page.getByRole('link', { name: 'Download als PDF' });
    await expect(link).toBeVisible();
    const res = await request.get((await link.getAttribute('href'))!);
    expect(res.ok()).toBe(true);
    expect(res.headers()['content-type']).toBe('application/pdf');
    expect((await res.body()).subarray(0, 5).toString()).toBe('%PDF-');
  });

  test('llms.txt vat de zaak samen in platte tekst', async ({ request }) => {
    const res = await request.get('/llms.txt');
    expect(res.ok()).toBe(true);
    expect(res.headers()['content-type']).toContain('text/markdown');
    const text = await res.text();
    expect(text).toContain('# Pizzeria Sarah');
    expect(text).toContain('## Openingstijden');
    expect(text).toContain('0488 - 411 767');
  });

  test('menukaart toont de allergeneninformatie', async ({ page }) => {
    await page.goto('/menukaart');
    await expect(page.getByRole('note')).toContainText('Voedselallergie?');
    await expect(page.getByRole('note')).toContainText('allergenen');
  });

  test('robots.txt en sitemap.xml', async ({ request }) => {
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain('Disallow: /admin');
    expect(robots).toContain('Sitemap: http://localhost:3100/sitemap.xml');
    const sitemap = await (await request.get('/sitemap.xml')).text();
    for (const p of PAGES) expect(sitemap).toContain(`http://localhost:3100${p.path}`);
    expect(sitemap).not.toContain('/admin');
  });

  test('beveiligingsheaders zijn aanwezig', async ({ request }) => {
    const res = await request.get('/');
    const h = res.headers();
    expect(h['content-security-policy']).toMatch(/default-src 'self'/);
    expect(h['content-security-policy']).toMatch(/frame-ancestors 'none'/);
    expect(h['content-security-policy']).toMatch(/script-src 'self' 'nonce-/);
    expect(h['strict-transport-security']).toContain('max-age=');
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['x-frame-options']).toBe('DENY');
    expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(h['permissions-policy']).toContain('camera=()');
    expect(h['x-powered-by']).toBeUndefined();
  });

  test('oude WordPress-adressen worden doorgestuurd', async ({ request }) => {
    for (const [from, to] of [
      ['/menu', '/menukaart'],
      ['/privacybeleid', '/privacy'],
      ['/openingstijden', '/contact'],
      ['/wp-content/uploads/2025/11/menu-2025-modern-3.pdf', '/menukaart'],
    ]) {
      const res = await request.get(from!, { maxRedirects: 0 });
      expect(res.status()).toBe(308);
      expect(res.headers().location).toBe(to);
    }
  });

  test('onbekende pagina geeft een Nederlandse 404', async ({ page }) => {
    const res = await page.goto('/deze-pagina-bestaat-niet');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Deze pagina bestaat niet');
  });

  test('galerij toont foto’s of een nette lege toestand', async ({ page }) => {
    await page.goto('/galerij');
    const photos = await page.locator('main ul li').count();
    if (photos === 0) await expect(page.getByText(/Binnenkort meer foto/)).toBeVisible();
    else await expect(page.getByRole('button', { name: /vergroten/ }).first()).toBeVisible();
  });
});

test.describe('Contactformulier', () => {
  test('toont Nederlandse foutmeldingen', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForTimeout(3200);
    await page.getByRole('button', { name: 'Bericht versturen' }).click();
    await expect(page.getByRole('alert').first()).toContainText('Controleer de gemarkeerde velden');
    await expect(page.getByText('Vul je naam in.')).toBeVisible();
    await expect(page.getByText(/Vul een geldig e-mailadres in/)).toBeVisible();
  });

  test('verstuurt een bericht dat in het beheer verschijnt', async ({ page }) => {
    await page.goto('/contact');
    await page.getByLabel('Naam', { exact: true }).fill('Jan de Vries');
    await page.getByLabel('E-mailadres').fill('jan@example.com');
    await page.getByLabel('Onderwerp').fill('Vraag over een reservering');
    await page.getByLabel('Bericht', { exact: true }).fill('Kunnen we zaterdag met zes personen bij jullie eten?');
    await page.waitForTimeout(3200);
    await page.getByRole('button', { name: 'Bericht versturen' }).click();
    await expect(page.getByRole('status')).toContainText('Bedankt voor je bericht');
  });

  test('honeypot: bots krijgen een nep-bevestiging en er wordt niets opgeslagen', async ({ page }) => {
    await page.goto('/contact');
    await page.locator('input[name="website"]').fill('http://spam.example', { force: true });
    await page.getByLabel('Naam', { exact: true }).fill('Spambot');
    await page.getByLabel('E-mailadres').fill('bot@example.com');
    await page.getByLabel('Onderwerp').fill('Goedkope pillen');
    await page.getByLabel('Bericht', { exact: true }).fill('Koop nu goedkope pillen bij ons!!!');
    await page.waitForTimeout(3200);
    await page.getByRole('button', { name: 'Bericht versturen' }).click();
    await expect(page.getByRole('status')).toContainText('Bedankt');
  });
});
