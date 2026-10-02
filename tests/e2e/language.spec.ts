import { expect, test } from '@playwright/test';

/**
 * Everything visible (text, labels, placeholders, alt text, titles) must be Dutch.
 * This scans every page for common English interface words.
 */
const ENGLISH = [
  'Submit',
  'Loading',
  'Login',
  'Log in',
  'Logout',
  'Log out',
  'Sign in',
  'Sign out',
  'Password',
  'Email address',
  'Save',
  'Cancel',
  'Delete',
  'Remove',
  'Edit',
  'Upload',
  'Settings',
  'Messages',
  'Photos',
  'Opening hours',
  'Search',
  'Close',
  'Next',
  'Previous',
  'Back',
  'Error',
  'Success',
  'Something went wrong',
  'Required',
  'Invalid',
  'Untitled',
  'Visible',
  'Hidden',
  'Featured',
  'Reply',
  'Archive',
  'Devices',
  'Session',
  'Welcome',
  'Read more',
  'Learn more',
  'Click here',
  'Page not found',
  'Skip to content',
  'Toggle',
  'Open menu',
  'Close menu',
  'Today',
  'Tomorrow',
  'Closed',
  'Open now',
  'Opens',
  'Closes',
  'Monday',
  'Tuesday',
  'Sunday',
  'Contact us',
  'Call us',
  'View menu',
  'Gallery',
  'About us',
  'Privacy policy',
  'Terms',
  'Copyright',
  'All rights reserved',
  'Draggable',
  'draggable',
  'Drag',
  'Drop',
  'Choose file',
  'No file chosen',
  'Replace',
  'Restore',
  'Trash',
  'Offer',
  'Price',
];

const PAGES = [
  '/',
  '/menukaart',
  '/over-ons',
  '/galerij',
  '/contact',
  '/privacy',
  '/voorwaarden',
  '/bestaat-niet',
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

test('geen Engelse teksten in de website of het beheer', async ({ page, browser }) => {
  const found: string[] = [];
  const scan = async (label: string) => {
    const text = await page.evaluate(() => {
      const parts = [document.body.innerText, document.title];
      for (const el of document.querySelectorAll('[aria-label],[placeholder],[title],img[alt],[aria-roledescription]')) {
        for (const attr of ['aria-label', 'placeholder', 'title', 'alt', 'aria-roledescription']) {
          const v = el.getAttribute(attr);
          if (v) parts.push(v);
        }
      }
      return parts.join('\n');
    });
    for (const word of ENGLISH) {
      if (new RegExp(`(^|[^\\p{L}])${word}([^\\p{L}]|$)`, 'u').test(text)) found.push(`${label}: “${word}”`);
    }
  };

  for (const path of PAGES) {
    await page.goto(path);
    await scan(path);
  }
  // Signed-out screens
  const anon = await browser.newContext();
  const anonPage = await anon.newPage();
  for (const path of ['/admin/inloggen', '/admin/wachtwoord-vergeten', '/admin/wachtwoord-herstellen', '/admin/inloggen/code']) {
    await anonPage.goto(path);
    const text = await anonPage.evaluate(() => document.body.innerText);
    for (const word of ENGLISH) if (new RegExp(`(^|[^\\p{L}])${word}([^\\p{L}]|$)`, 'u').test(text)) found.push(`${path}: “${word}”`);
  }
  await anon.close();

  // Open the main dialogs as well.
  await page.goto('/admin/fotos');
  await page.getByRole('button', { name: 'Foto toevoegen' }).first().click();
  await scan('upload-dialoog');
  await page.keyboard.press('Escape');

  expect(found).toEqual([]);
});
