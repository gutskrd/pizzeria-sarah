import { hash, verify } from '@node-rs/argon2';

// OWASP-recommended Argon2id parameters (algorithm 2 = Argon2id; the enum is a const enum).
const OPTIONS = { algorithm: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

let dummyHash: Promise<string> | undefined;

/** Verifies a password. With no hash, compares against a dummy so timing does not reveal unknown accounts. */
export async function verifyPassword(passwordHash: string | null, password: string): Promise<boolean> {
  if (!passwordHash) {
    dummyHash ??= hashPassword('dummy-password-for-timing');
    await verify(await dummyHash, password).catch(() => false);
    return false;
  }
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

const COMMON = new Set([
  'wachtwoord',
  'wachtwoord1',
  'wachtwoord123',
  'password',
  'password1',
  'password123',
  '1234567890',
  '12345678910',
  'qwertyuiop',
  'pizzeriasarah',
  'pizzasarah',
  'pizzeria123',
  'dodewaard1',
  'welkom1234',
]);

/** Returns a Dutch error message, or null when the password is acceptable. */
export function checkPasswordPolicy(password: string, email?: string): string | null {
  if (password.length < 10) return 'Kies een wachtwoord van minimaal 10 tekens.';
  if (password.length > 200) return 'Dit wachtwoord is te lang.';
  const lower = password.toLowerCase();
  if (COMMON.has(lower.replace(/\s/g, ''))) return 'Dit wachtwoord is te makkelijk te raden. Kies een ander wachtwoord.';
  if (/^(.)\1+$/.test(password)) return 'Dit wachtwoord is te makkelijk te raden. Kies een ander wachtwoord.';
  if (email && lower === email.toLowerCase()) return 'Je wachtwoord mag niet gelijk zijn aan je e-mailadres.';
  return null;
}
