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
import { createServer } from 'node:net';

const DEMO_LOGIN = { email: 'demo@pizzeria-sarah.test', password: 'Sarah-demo-2026!', name: 'Demo' };

if (process.env.NODE_ENV === 'production') {
  console.error('De demo is alleen bedoeld voor je eigen computer, niet voor productie.');
  process.exit(1);
}

/** True when nothing on this computer is using the port yet. */
function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port);
  });
}

async function firstFreePort(candidates: number[]): Promise<number | null> {
  for (const port of candidates) if (await isPortFree(port)) return port;
  return null;
}

const range = (from: number, count: number) => Array.from({ length: count }, (_, i) => from + i);

// The website port: 3000, or the next free one if something else already uses it.
const wantedPort = process.env.PORT ? Number(process.env.PORT) : null;
const sitePort = wantedPort ?? (await firstFreePort(range(3000, 20)));
if (!sitePort) {
  console.error('Geen vrije poort gevonden voor de website (3000–3019). Sluit andere programma’s en probeer opnieuw.');
  process.exit(1);
}
const PORT = String(sitePort);
const ownDatabase = process.env.DEMO_DATABASE_URL;
if (ownDatabase && !/@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(ownDatabase)) {
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
  DATABASE_URL: ownDatabase ?? '',
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
  // Use the port from last time (the data lives in a Docker volume), else the first free one.
  // Docker sometimes holds a port that still looks free, so a refused port is skipped too.
  const portFile = 'data/demo-db-port.txt';
  const previous = existsSync(portFile) ? Number(readFileSync(portFile, 'utf8')) : null;
  const candidates = [...new Set([...(previous ? [previous] : []), ...range(5433, 15)])];
  let started = false;
  for (const port of candidates) {
    if (!(await isPortFree(port))) continue;
    env.DEMO_DB_PORT = String(port);
    const result = spawnSync('docker', ['compose', '-f', 'docker-compose.demo.yml', 'up', '-d', '--wait'], {
      env,
      encoding: 'utf8',
      shell: process.platform === 'win32',
    });
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
    if (result.status === 0) {
      writeFileSync(portFile, String(port));
      env.DATABASE_URL = `postgres://demo:demo@127.0.0.1:${port}/pizzeria_sarah_demo`;
      console.log(`Demo-database draait (poort ${port}).`);
      started = true;
      break;
    }
    if (/already allocated|address already in use|port is already/i.test(output)) {
      console.log(`Poort ${port} is bezet, volgende proberen…`);
      continue;
    }
    console.error(output.trim());
    break;
  }
  if (!started) {
    console.error(
      '\nDe demo-database kon niet starten. Controleer of Docker Desktop draait en probeer opnieuw.\n' +
        'Of gebruik je eigen PostgreSQL:\n' +
        '  PowerShell:  $env:DEMO_DATABASE_URL="postgres://gebruiker:wachtwoord@localhost:5432/databasenaam"; npm run demo\n' +
        '  macOS/Linux: DEMO_DATABASE_URL=postgres://gebruiker:wachtwoord@localhost:5432/databasenaam npm run demo',
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
