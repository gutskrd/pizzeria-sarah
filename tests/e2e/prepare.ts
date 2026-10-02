/**
 * Resets the end-to-end test database and media folder, then applies
 * migrations, the seed and a known test admin. Never point this at production.
 */
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import postgres from 'postgres';

const url = process.env.DATABASE_URL ?? '';
if (!/_test(\?|$)/.test(url)) {
  console.error('Refusing to reset a database whose name does not end in _test.');
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });
await sql`drop schema if exists public cascade`;
await sql`drop schema if exists drizzle cascade`;
await sql`create schema public`;
await sql.end();

rmSync('data/test-media', { recursive: true, force: true });
rmSync('data/outbox', { recursive: true, force: true });

const env = { ...process.env };
execSync('npx tsx scripts/migrate.ts', { stdio: 'inherit', env });
execSync('npx tsx scripts/seed.ts', { stdio: 'inherit', env });
execSync('npx tsx scripts/create-admin.ts', {
  stdio: 'inherit',
  env: { ...env, ADMIN_EMAIL: 'eigenaar@example.com', ADMIN_NAME: 'Sarah', ADMIN_PASSWORD: 'Pizzaoven-Dodewaard-1995' },
});
