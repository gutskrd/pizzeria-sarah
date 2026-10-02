import { test as setup } from '@playwright/test';
import { login } from './helpers';

setup('inloggen en sessie bewaren', async ({ page }) => {
  await login(page, { remember: true });
  await page.context().storageState({ path: 'data/e2e-auth.json' });
});
