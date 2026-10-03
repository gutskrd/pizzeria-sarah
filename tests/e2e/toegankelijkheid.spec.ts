import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGES = [
  '/',
  '/menukaart',
  '/over-ons',
  '/galerij',
  '/contact',
  '/privacy',
  '/voorwaarden',
  '/admin',
  '/admin/website',
  '/admin/menukaart',
  '/admin/fotos',
  '/admin/openingstijden',
  '/admin/berichten',
  '/admin/aanbiedingen',
  '/admin/apparaten',
  '/admin/instellingen',
  '/admin/activiteit',
];

// Check the finished page, not content halfway through a fade-in animation.
test.use({ reducedMotion: 'reduce' });

for (const path of PAGES) {
  test(`toegankelijkheid (axe): ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const summary = results.violations.map(
      (v) =>
        `${v.id} (${v.impact}): ${v.nodes
          .slice(0, 3)
          .map((n) => n.target.join(' '))
          .join(' | ')}`,
    );
    expect(summary).toEqual([]);
  });
}

test('toegankelijkheid (axe): inlogscherm', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/admin/inloggen');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
  await context.close();
});
