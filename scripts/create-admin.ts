/**
 * Creates the owner's admin account (or sets a new password for an existing one).
 *
 *   npm run admin:create
 *
 * Asks for e-mail, name and password interactively. For automated setups the
 * values can be provided via ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD.
 * The password is never printed or logged.
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { checkPasswordPolicy, hashPassword } from '../src/lib/auth/password';
import * as schema from '../src/lib/db/schema';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL ontbreekt.');
  process.exit(1);
}

async function askHidden(question: string): Promise<string> {
  stdout.write(question);
  return new Promise((resolve) => {
    let value = '';
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (char: string) => {
      if (char === '\r' || char === '\n' || char === '\u0004') {
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.off('data', onData);
        stdout.write('\n');
        resolve(value);
      } else if (char === '\u0003') {
        process.exit(130);
      } else if (char === '\u007f') {
        value = value.slice(0, -1);
      } else {
        value += char;
      }
    };
    stdin.on('data', onData);
  });
}

let email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
let name = process.env.ADMIN_NAME?.trim();
let password = process.env.ADMIN_PASSWORD;

if (!email || !name) {
  const rl = createInterface({ input: stdin, output: stdout });
  email ||= (await rl.question('E-mailadres om mee in te loggen: ')).trim().toLowerCase();
  name ||= (await rl.question('Naam (bijv. Sarah): ')).trim();
  rl.close();
}
if (!password) password = await askHidden('Wachtwoord (minimaal 10 tekens): ');

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? '')) {
  console.error('Ongeldig e-mailadres.');
  process.exit(1);
}
const policy = checkPasswordPolicy(password, email);
if (policy) {
  console.error(policy);
  process.exit(1);
}

const client = postgres(url, { max: 1, onnotice: () => {} });
const db = drizzle(client, { schema });
const passwordHash = await hashPassword(password);
const [existing] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.email, email!)).limit(1);
if (existing) {
  await db
    .update(schema.adminUsers)
    .set({ name: name || existing.name, passwordHash, passwordChangedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.adminUsers.id, existing.id));
  await db.update(schema.sessions).set({ revokedAt: new Date(), revokedReason: 'password_reset' }).where(eq(schema.sessions.userId, existing.id));
  console.log(`Wachtwoord bijgewerkt voor ${email}. Alle apparaten zijn uitgelogd.`);
} else {
  await db.insert(schema.adminUsers).values({ email: email!, name: name || 'Eigenaar', passwordHash });
  console.log(`Account aangemaakt voor ${email}.`);
}
await client.end();
