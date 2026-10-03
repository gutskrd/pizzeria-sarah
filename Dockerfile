# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────
# Pizzeria Sarah — production image (Next.js standalone server)
# Debian slim (glibc) so sharp and argon2 use their prebuilt binaries.
# ─────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time placeholders only; real values are provided at runtime.
RUN SITE_URL=https://example.invalid \
    DATABASE_URL=postgres://build:build@127.0.0.1:1/build \
    AUTH_SECRET=build-time-placeholder-not-used-at-runtime-000000 \
    npm run build && npm run build:scripts

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    MEDIA_DIR=/data/media
RUN groupadd --system --gid 1001 app && useradd --system --uid 1001 --gid app --no-create-home app \
 && mkdir -p /data/media && chown -R app:app /data
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/drizzle ./drizzle
COPY --from=builder --chown=app:app /app/scripts-dist ./scripts-dist
COPY --from=builder --chown=app:app /app/content ./content
USER app
EXPOSE 3000
VOLUME ["/data/media"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Apply pending database migrations, then start the server.
CMD ["sh", "-c", "node scripts-dist/migrate.mjs && node server.js"]
