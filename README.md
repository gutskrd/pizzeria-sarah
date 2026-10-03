# Pizzeria Sarah — website + beheer

Replacement for the WordPress site at **pizzaria-sarah.nl**: a fast Dutch public
website for Pizzeria Sarah (grillroom, pizzeria and takeaway in Dodewaard, since 1995) plus a private, Dutch admin panel built for the owner.

- **Public site:** `/`, `/menukaart`, `/over-ons`, `/galerij`, `/contact`, `/privacy`, `/voorwaarden`
- **Admin:** `/admin`: dashboard, website texts, menu, photos, opening hours, messages, offers, activity history, signed-in devices, settings
- **Admin extras:** live clock with open/closed countdown, notification bubbles in the navigation (live, polled every 30 s),
  notification centre, unread count in the tab title, ⌘K/Ctrl+K command palette with search, one-tap "Vandaag sluiten",
  inbox search and bulk actions, phone tab bar
- **Owner's guide (Dutch):** [`docs/HANDLEIDING.md`](docs/HANDLEIDING.md)

> Technical documentation is in English; everything the owner and customers see is Dutch.

---

## 1. Content status: read this first

The old website could not be reached from the environment this was built in, so
**no photos were copied**. The menu was transcribed from the printed menu
(November 2025, `content/menukaart-2025-11/`). Nothing was invented.

| Content                                                                                   | Status                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Intro text, story ("sinds 1995"), waiting area, pizza text, reservation and allergen text | Seeded from the texts supplied in the brief (lightly rewritten, same facts)                                                                                                                                                                                                                             |
| Phone `0488 - 411 767`, e-mail `pizzaria-sarah@hotmail.com`                               | Seeded from the brief                                                                                                                                                                                                                                                                                   |
| Address `Margrietlaan 2, 6669 AP Dodewaard`                                               | Seeded; matches the printed menu. Editable under Beheer → Instellingen                                                                                                                                                                                                                                  |
| Opening hours (Mon closed except holidays, Tue–Sun 16:00–20:00)                           | Seeded, editable                                                                                                                                                                                                                                                                                        |
| Menu: 10 categories, 72 dishes, prices                                                    | Seeded from the **printed menu (Nov 2025)** by `npm run db:seed` (only when the menu is still empty; `--zonder-menukaart` skips it). Data: `scripts/data/menukaart-2025-11.ts`. _Fantasia_ (31) has no printed price and shows without one. The six dishes on the homepage (star) are a starting choice |
| Menu folder (3D unfold on `/` and `/menukaart`)                                           | Seeded from the printed menu in `content/menukaart-2025-11/` (`--zonder-folder` skips it). The owner replaces it under Beheer → Menukaart → Folder: upload both sides, fold lines are detected and can be dragged                                                                                       |
| Allergens                                                                                 | **Empty.** Not on the printed menu; the owner fills them in                                                                                                                                                                                                                                             |
| Photos, PDF menu                                                                          | **Empty.** Run the importer below, or upload in Beheer → Foto's                                                                                                                                                                                                                                         |
| Offers, reviews, awards, statistics                                                       | None, by design                                                                                                                                                                                                                                                                                         |

Import the existing photos and the PDF menu from the old WordPress site (run it
from a machine that can reach the old site, before DNS is switched):

```bash
npm run media:import-legacy -- --dry-run   # check what would be imported
npm run media:import-legacy -- --pdf       # import photos + newest PDF menu
# in Docker:  docker compose exec app node scripts-dist/import-legacy-media.mjs --pdf
```

Restaurant photos are imported as visible; screenshots/menu photos are imported
hidden. Every file goes through the same validation and optimisation as a normal
upload. The video (`Film-2-1.mp4`) is intentionally not used: a background video
would make the homepage much slower on mobile.

The **privacy statement** and **terms** are written to match what the system
actually does (no tracking cookies, Google Maps only after "Kaart tonen", 12-month message retention, 14-day server
logs). Have the owner read them before going live.

---

## 2. Architecture

| Part            | Choice                                                                    | Why                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| App             | **Next.js 16** (App Router, React 19, TypeScript, `output: 'standalone'`) | Server rendering, server actions with built-in CSRF origin checks, small client JS                                                                    |
| Styling         | Tailwind CSS 4, self-hosted variable fonts (Fraunces, Instrument Sans)    | No requests to Google Fonts (privacy, speed)                                                                                                          |
| Database        | **PostgreSQL 16** + Drizzle ORM, SQL migrations in `drizzle/`             | Real constraints, foreign keys, indexes, exclusion constraint for overlapping holiday rules                                                           |
| Images          | **sharp** on the server; files on a local volume                          | Validation by file signature + decoder, EXIF/GPS removed, responsive WebP sizes + social JPEG generated once on upload; served with immutable caching |
| E-mail          | **Resend** HTTP API (server only)                                         | Login codes, new-device alerts, password reset, contact notifications, replies                                                                        |
| Spam protection | Honeypot + timing token + rate limits; optional **Cloudflare Turnstile**  | Low friction for customers                                                                                                                            |
| Hosting         | **One small EU VPS** with Docker Compose: `app` + `db` + **Caddy**        | Automatic HTTPS (Let's Encrypt), HTTP→HTTPS redirect, compression, no vendor lock-in                                                                  |

Alternatives considered and rejected:

- **Vercel Hobby:** not allowed for commercial use, and no persistent disk for images.
- **Supabase free tier:** projects pause after a period of inactivity; a restaurant site with a quiet admin would be at risk.
- **Cloudflare Workers:** native image processing (sharp) does not run there; Cloudflare Images is a paid add-on.

The whole site is one Node.js process. Public content is cached in memory and
invalidated immediately after every admin change, so pages are fast and changes
are visible at once.

### Costs (check current prices before ordering)

| Item                                                                      | Cost                                                                                        |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| VPS, 2 vCPU / 2–4 GB RAM, EU (e.g. Hetzner CX23 / CAX11, Netcup, TransIP) | ≈ €5–8 per month. Prices changed several times in 2026, so check before ordering            |
| Off-site backup space (e.g. Hetzner Storage Box, Backblaze B2)            | ≈ €1–4 per month (optional but recommended)                                                 |
| Resend                                                                    | Free: 3,000 e-mails/month, max 100/day (as of Sept 2026). This site sends a handful per day |
| Cloudflare Turnstile / DNS                                                | Free                                                                                        |
| Domain `pizzaria-sarah.nl`                                                | Stays at the current registrar; only DNS records change                                     |

### Project layout

```
src/
  app/(site)/          public pages (Dutch URLs)
  app/admin/(auth)/    login, code, forgot/reset password + their server actions
  app/admin/(panel)/   admin pages, one folder per area, each with actions.ts
  app/api/admin/       upload/replace endpoints (multipart, progress)
  app/media/           fallback route for generated media files
  components/site/     public components
  components/admin/    admin components (dialogs, toasts, photo library, editors…)
  lib/auth/            sessions, cookies, passwords
  lib/security/        crypto, rate limiting, request info, events, Turnstile
  lib/images/          validation, processing, storage
  lib/opening-hours/   pure opening-hours engine (unit tested)
  lib/content/         public queries + in-memory cache
  lib/db/              Drizzle schema + client
  proxy.ts             CSP nonce + admin session gate (Next.js 16 "proxy")
drizzle/               SQL migrations
scripts/               migrate, seed, create-admin, import-legacy-media
deploy/                Caddyfile, backup.sh
tests/e2e/             Playwright end-to-end tests
```

---

## 3. Security

**Login (owner):** e-mail + password (Argon2id), then a **6-digit code by e-mail**
on any device that is not remembered.

- Codes: `crypto.randomInt`, stored only as HMAC-SHA256 (keyed with `AUTH_SECRET`), valid 10 minutes, single use, max 5 wrong attempts, 60 s resend cooldown, max 5 sends. Never logged.
- Generic errors: "Het e-mailadres of wachtwoord klopt niet." and the forgot-password screen never reveal whether an address exists (an unknown address is compared against a dummy hash to equalise timing).
- **"Dit apparaat onthouden"** sets a separate HTTP-only trusted-device cookie (90 days, rotated on use) so the code is skipped on that device; the session cookie then persists for 30 days of inactivity.

**Sessions** are server-side rows; the browser only holds a random 256-bit token
(stored as SHA-256 in the database).

- Cookie: `__Host-ps_session`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`.
- Remembered: logged out after **30 days without activity** (sliding), absolute maximum 1 year. Not remembered: browser-session cookie, 12 h idle.
- The token is **rotated daily** (the previous token stays valid for 2 minutes so parallel requests do not break).
- A session that suddenly arrives from a different browser/OS family is revoked automatically (likely a stolen cookie).
- **Ingelogde apparaten** shows every session (device, browser, OS, approximate location, first login, last active, IP under "Technische details") with **Beëindigen** and **Alle andere sessies beëindigen**. Ending a session also forgets that device.
- Password change: other sessions and trusted devices are revoked, the current token is replaced, and a notice e-mail is sent. Password reset: one-time token (1 h), all sessions revoked.
- New/unknown device → e-mail "Nieuwe aanmelding bij Pizzeria Sarah".
- Location comes only from Cloudflare headers (`TRUST_CLOUDFLARE_HEADERS=1`) and is shown as a country or "Regio …", never as an address.

**Authorisation** is enforced server-side everywhere: the proxy redirects signed-out
visitors away from `/admin`, **and** every admin page (`requireAdmin`), server
action (`adminAction` wrapper) and route handler (`guardAdminUpload`) validates
the session again. Route handlers also check the `Origin` header; server actions
get Next.js' built-in origin check.

**Rate limits** (PostgreSQL-backed, keys stored as HMAC): login 20/15 min per IP
and 8/15 min per e-mail, code checks 30/15 min per IP, password reset 5/h per IP and
3/h per e-mail, contact form 5/10 min and 20/day per IP, admin actions 300/min,
uploads 60/10 min, replies 30/h.

**Uploads:** extension + declared MIME + magic bytes must agree (JPG/PNG/WebP),
max 15 MB, 200–12,000 px, max 60 MP, then fully decoded by sharp; HEIC gets a clear
Dutch explanation. Stored under random names, all metadata stripped. SVG,
executables and anything else are refused.

**Headers:** per-request nonce CSP (`script-src 'self' 'nonce-…' 'strict-dynamic'`,
`frame-ancestors 'none'`, `object-src 'none'`…), HSTS, `X-Content-Type-Options`,
`Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY`, COOP. No
`X-Powered-By`.

**Errors:** friendly Dutch error pages; technical details only in server logs.

**Secrets:** only in environment variables (`.env`, never committed; see
`.env.example`).

---

## 4. Try it: local demo (one command)

Needs [Node.js 22](https://nodejs.org) and [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running).

```bash
git clone https://github.com/gutskrd/pizzeria-sarah.git
cd pizzeria-sarah
git checkout claude/wonderful-goodall-i7be12
npm install
npm run demo
```

Then open **http://localhost:3000** (website) and **http://localhost:3000/admin** (beheer).

| Demo login |                            |
| ---------- | -------------------------- |
| E-mail     | `demo@pizzeria-sarah.test` |
| Wachtwoord | `Sarah-demo-2026!`         |

After the password the admin asks for a **6-digit code**. In the demo no e-mail
is sent: the code appears in the terminal where `npm run demo` runs. The demo
contains the real menu and folder; changes you make stay in the demo database.
Stop with Ctrl + C; remove the demo database with
`docker compose -f docker-compose.demo.yml down -v`.
No Docker? Point it at your own PostgreSQL:
`DEMO_DATABASE_URL=postgres://user:pass@localhost:5432/dbname npm run demo`.
The demo account and password are for this local demo only; the script refuses
to run in production.

## 4b. Local development

Requirements: Node.js 22+, PostgreSQL 16.

```bash
cp .env.example .env            # set DATABASE_URL, AUTH_SECRET, SITE_URL=http://localhost:3000, EMAIL_DEV_OUTBOX=1
npm ci
npm run db:migrate
npm run db:seed
npm run admin:create            # asks for e-mail, name, password
npm run dev                     # http://localhost:3000 and /admin
```

With `EMAIL_DEV_OUTBOX=1` (ignored in production) e-mails, including login codes, are
written to `data/outbox/*.json` instead of being sent.

Schema changes: edit `src/lib/db/schema.ts`, run `npm run db:generate`, commit the new
SQL file in `drizzle/`.

## 5. Tests

```bash
npm run typecheck && npm run lint
npm test                        # unit tests (opening hours, uploads, formatting, user agents)
npm run test:e2e                # Playwright end-to-end tests
```

The end-to-end tests start their own dev server on port 3100 with a separate
database (`pizzeria_sarah_test`, which is **wiped**). They cover all public pages
(one H1, unique title/description/canonical, structured data, security headers,
redirects, contact form with honeypot), the complete login with e-mail code, wrong
codes, logout, remembered devices and cookie lifetimes, password reset and change,
ending one or all other sessions, stolen-cookie detection, unauthorised access to
every admin page and upload endpoint, menu/photo/hours/messages/offers/website/
settings workflows, **no horizontal scrolling at 320, 375, 390, 430, 768, 1024, 1280,
1440 and 1920 px** for the public site and the admin, an English-text audit, and an
axe-core WCAG 2.1 AA scan of every page.

If Playwright's bundled browser is not installed, point it at a local Chromium:
`PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome npm run test:e2e`.

The automated tests run in Chromium. Before go-live, also check the site by hand in
Safari on an iPhone, Firefox and Edge.

---

## 6. Deployment (step by step)

1. **Server:** create an Ubuntu 24.04 VPS in the EU. Add an SSH key, enable the
   provider firewall (allow 22, 80, 443 only), install Docker
   (`curl -fsSL https://get.docker.com | sh`).
2. **Code:** `git clone` this repository to `/opt/pizzeria-sarah`.
3. **Configuration:** `cp .env.example .env` and fill in:
   - `SITE_URL=https://pizzaria-sarah.nl`, `DOMAIN=pizzaria-sarah.nl`
   - `POSTGRES_PASSWORD` and `AUTH_SECRET`: generate with `openssl rand -base64 48`
   - `RESEND_API_KEY`, `EMAIL_FROM` (see step 5)
   - `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` (optional, step 6)
   - `EMAIL_DEV_OUTBOX=0`
   - `chmod 600 .env`
4. **DNS** (at the current registrar; no transfer needed):
   - `A  pizzaria-sarah.nl → <server IPv4>` (and `AAAA` for IPv6 if available)
   - `A  www → <server IPv4>` (Caddy redirects www to the bare domain)
   - Lower the TTL a day in advance for a quick switch. Keep the existing **MX
     records** untouched (the hotmail address is unaffected).
5. **E-mail (Resend):** create an account, add the domain `pizzaria-sarah.nl`, add the
   SPF/DKIM (and optionally DMARC) records Resend shows to the DNS, wait for
   "Verified", create an API key with _sending_ permission only. Use for example
   `EMAIL_FROM="Pizzeria Sarah <website@pizzaria-sarah.nl>"`. Replies to customers
   use `Reply-To` = the restaurant's e-mail address, so customer answers arrive in
   the normal mailbox.
6. **Turnstile (optional):** Cloudflare dashboard → Turnstile → add site for
   `pizzaria-sarah.nl` (managed mode) → copy the keys into `.env`.
7. **Start:** `docker compose up -d --build`. Migrations run automatically on start.
   Caddy obtains the HTTPS certificate once DNS points to the server.
8. **First run:**
   ```bash
   docker compose exec app node scripts-dist/seed.mjs
   docker compose exec -it app node scripts-dist/create-admin.mjs   # owner's e-mail + password
   docker compose exec app node scripts-dist/import-legacy-media.mjs --pdf   # see section 1
   ```
9. **Backups:** `crontab -e` →
   `30 3 * * * /opt/pizzeria-sarah/deploy/backup.sh >> /var/log/pizzeria-backup.log 2>&1`,
   and copy `/var/backups/pizzeria-sarah` off the server (e.g. `rclone`). Test a
   restore once: `pg_restore -d <db> db_YYYY-MM-DD.dump`.
10. **Monitoring:** point a free uptime monitor (e.g. UptimeRobot) at
    `https://pizzaria-sarah.nl/api/health`.
11. **Updates:** `git pull && docker compose up -d --build`.

**Optional Cloudflare proxy:** if the DNS is moved to Cloudflare with the orange
cloud enabled, set `TRUST_CLOUDFLARE_HEADERS=1` (shows the approximate location of
signed-in devices; enable "Add visitor location headers" under Rules → Managed
Transforms for region/city), set SSL mode to **Full (strict)**, and restrict ports
80/443 on the server firewall to Cloudflare's IP ranges so the headers cannot be
spoofed.

### Old WordPress URLs

Permanent (308) redirects are configured in `next.config.ts` for common old paths
(`/menu`, `/contact-2`, `/privacybeleid`, `/openingstijden`, the old PDF menu URLs,
…). After launch, check Search Console → _Pages → Not found (404)_ and add any
remaining old URLs to the `legacyRedirects` list. `/wp-admin` and `/wp-login.php`
intentionally return 404.

## 7. Google Search Console

Indexing cannot be guaranteed, but the site is fully indexable: server-rendered
HTML, one H1 per page, unique titles/descriptions, canonical URLs, Open Graph,
`/sitemap.xml`, `/robots.txt`, and `Restaurant` + `BreadcrumbList` + `Menu`
structured data.

1. Go to <https://search.google.com/search-console> → _Add property_ → **Domain**
   → `pizzaria-sarah.nl`.
2. Add the TXT record Google shows at the registrar; click _Verify_.
3. _Sitemaps_ → submit `https://pizzaria-sarah.nl/sitemap.xml`.
4. _URL inspection_ → test `https://pizzaria-sarah.nl/` → _Request indexing_.
5. Check the structured data with <https://search.google.com/test/rich-results>.
6. Also claim/update the **Google Business Profile** (address, hours, phone, link
   to the site); it matters more for local searches than the website itself.

## 8. Data retention (automatic)

Run at most once a day when the admin is opened: contact messages older than 12
months, security/activity history older than 12 months, expired login codes and
reset tokens, old sessions, and photos in the trash for more than 30 days are
deleted. Caddy access logs are kept 14 days.
