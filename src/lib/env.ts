import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SITE_URL: z.url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET moet minimaal 32 tekens lang zijn.'),
  MEDIA_DIR: z.string().default('./data/media'),
  RESEND_API_KEY: z.string().default(''),
  EMAIL_FROM: z.string().default('Pizzeria Sarah <website@pizzaria-sarah.nl>'),
  EMAIL_DEV_OUTBOX: z.string().default('0'),
  TURNSTILE_SITE_KEY: z.string().default(''),
  TURNSTILE_SECRET_KEY: z.string().default(''),
  TRUST_CLOUDFLARE_HEADERS: z.string().default('0'),
  TRUST_PROXY_HEADERS: z.string().default('0'),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Server-side configuration. Parsed lazily so builds do not need secrets. */
export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
      throw new Error(`Invalid server configuration: ${fields}`);
    }
    cached = parsed.data;
  }
  return cached;
}

export const isProduction = () => env().NODE_ENV === 'production';
export const siteUrl = () => env().SITE_URL.replace(/\/+$/, '');
