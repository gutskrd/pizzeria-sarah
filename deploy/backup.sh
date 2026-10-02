#!/usr/bin/env bash
# Daily backup of the database and the uploaded photos.
#   Cron (as root): 30 3 * * * /opt/pizzeria-sarah/deploy/backup.sh >> /var/log/pizzeria-backup.log 2>&1
# Keeps 14 days locally. Copy the backup folder off the server as well
# (for example with rclone to a storage box) — a backup on the same server
# does not protect against losing the server.
set -euo pipefail
cd "$(dirname "$0")/.."
DEST="${BACKUP_DIR:-/var/backups/pizzeria-sarah}"
STAMP="$(date +%Y-%m-%d_%H%M)"
mkdir -p "$DEST"
docker compose exec -T db pg_dump -U sarah -d pizzeria_sarah --format=custom > "$DEST/db_$STAMP.dump"
docker run --rm -v "$(basename "$PWD")_media:/media:ro" -v "$DEST:/backup" debian:bookworm-slim \
  tar -czf "/backup/media_$STAMP.tar.gz" -C /media .
find "$DEST" -type f -mtime +14 -delete
echo "$(date -Is) backup ok: $DEST/*_$STAMP.*"
