import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

const testEnv = {
  SITE_URL: `http://localhost:${PORT}`,
  DATABASE_URL: process.env.E2E_DATABASE_URL ?? 'postgres://sarah:devpassword@localhost:5432/pizzeria_sarah_test',
  AUTH_SECRET: 'e2e-secret-e2e-secret-e2e-secret-e2e-secret-0000',
  MEDIA_DIR: './data/test-media',
  EMAIL_DEV_OUTBOX: '1',
  TRUST_PROXY_HEADERS: '0',
  NEXT_DIST_DIR: '.next-test',
};

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'nl-NL',
    timezoneId: 'Europe/Amsterdam',
    trace: 'retain-on-failure',
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/, use: { ...devices['Desktop Chrome'] } },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], storageState: 'data/e2e-auth.json' },
      dependencies: ['setup'],
      testIgnore: [/auth\.setup\.ts/, /security\.spec\.ts/, /password\.spec\.ts/],
    },
    // These end or invalidate sessions, so they run after the other tests.
    { name: 'security', use: { ...devices['Desktop Chrome'] }, dependencies: ['desktop'], testMatch: /security\.spec\.ts/ },
    { name: 'password', use: { ...devices['Desktop Chrome'] }, dependencies: ['security'], testMatch: /password\.spec\.ts/ },
  ],
  webServer: {
    command: 'npx tsx tests/e2e/prepare.ts && npx next dev -p 3100',
    url: `http://localhost:${PORT}/robots.txt`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: testEnv,
  },
});
