/**
 * Starts a local demo of the website and the admin panel with one command:
 *
 *   npm run demo
 *
 * - starts a demo database in Docker (docker-compose.demo.yml), or uses
 *   DEMO_DATABASE_URL if you already have PostgreSQL running;
 * - adds the tables, the real menu, the folder and a demo admin account;
 * - starts the site on http://localhost:3000.
 *
 * E-mails (such as the 6-digit login code) are not sent but shown in this
 * terminal. Only for your own computer: refuses to run in production.
 */
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const DEMO_LOGIN = { email: 'demo@pizzeria-sarah.test', password: 'Sarah-demo-2026!', name: 'Demo' };

if (process.env.NODE_ENV === 'production') {
  console.error('De demo is alleen bedoeld voor je eigen computer, niet voor productie.');
  process.exit(1);
}

const PORT = process.env.PORT ?? '3000';
const ownDatabase = process.env.DEMO_DATABASE_URL;
const databaseUrl = ownDatabase ?? 'postgres://demo:demo@127.0.0.1:5433/pizzeria_sarah_demo';
if (!/@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(databaseUrl)) {
  console.error('DEMO_DATABASE_URL moet naar een database op deze computer wijzen (localhost).');
  process.exit(1);
}

// A random secret per computer, kept in data/ (never in Git), so logins survive a restart.
mkdirSync('data', { recursive: true });
const secretFile = 'data/demo-secret.txt';
if (!existsSync(secretFile)) writeFileSync(secretFile, randomBytes(48).toString('base64'), { mode: 0o600 });

const env: NodeJS.ProcessEnv = {
  ...process.env,
  NODE_ENV: 'development',
  DATABASE_URL: databaseUrl,
  AUTH_SECRET: readFileSync(secretFile, 'utf8').trim(),
  SITE_URL: `http://localhost:${PORT}`,
  MEDIA_DIR: './data/demo-media',
  EMAIL_DEV_OUTBOX: '1',
  TRUST_PROXY_HEADERS: '0',
  TRUST_CLOUDFLARE_HEADERS: '0',
  TURNSTILE_SITE_KEY: '',
  TURNSTILE_SECRET_KEY: '',
};

const run = (command: string, args: string[], quiet = false) => {
  const result = spawnSync(command, args, { env, stdio: quiet ? 'pipe' : 'inherit', shell: process.platform === 'win32' });
  return result.status === 0;
};

function step(title: string) {
  console.log(`\n▸ ${title}`);
}

if (!ownDatabase) {
  step('Demo-database starten (Docker)…');
  if (!run('docker', ['compose', '-f', 'docker-compose.demo.yml', 'up', '-d', '--wait'])) {
    console.error(
      '\nDocker lukt niet. Start Docker Desktop en probeer opnieuw, of gebruik je eigen PostgreSQL:\n' +
        '  DEMO_DATABASE_URL=postgres://gebruiker:wachtwoord@localhost:5432/databasenaam npm run demo',
    );
    process.exit(1);
  }
}

step('Tabellen bijwerken…');
if (!run('npx', ['tsx', 'scripts/migrate.ts'])) process.exit(1);

step('Inhoud toevoegen (menukaart, folder, openingstijden)…');
if (!run('npx', ['tsx', 'scripts/seed.ts'])) process.exit(1);

step('Demo-account klaarzetten…');
env.ADMIN_EMAIL = DEMO_LOGIN.email;
env.ADMIN_NAME = DEMO_LOGIN.name;
env.ADMIN_PASSWORD = DEMO_LOGIN.password;
if (!run('npx', ['tsx', 'scripts/create-admin.ts'])) process.exit(1);
delete env.ADMIN_PASSWORD;

const line = '═'.repeat(62);
console.log(`
${line}
  Pizzeria Sarah — demo

  Website:   http://localhost:${PORT}
  Beheer:    http://localhost:${PORT}/admin

  E-mail:     ${DEMO_LOGIN.email}
  Wachtwoord: ${DEMO_LOGIN.password}

  Na het wachtwoord vraagt het beheer om een code van 6 cijfers.
  Die verschijnt hieronder in dit venster (bij "E-mail (niet verstuurd)").

  Stoppen: Ctrl + C.   Database opruimen: docker compose -f docker-compose.demo.yml down -v
${line}
`);

const server = spawn('npx', ['next', 'dev', '-p', PORT], { env, stdio: 'inherit', shell: process.platform === 'win32' });
server.on('exit', (code) => process.exit(code ?? 0));
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => server.kill(signal));
