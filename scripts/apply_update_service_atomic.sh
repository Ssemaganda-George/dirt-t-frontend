#!/usr/bin/env bash
set -euo pipefail

# Script to backup current update_service_atomic function and apply migration
# Usage: ./scripts/apply_update_service_atomic.sh
# This script expects a .env file in the repo root containing DATABASE_URL.

ENV_FILE=".env"
MIGRATION_FILE="db/024_fix_update_service_atomic_apply_event_fields.sql"
BACKUP_FILE="db/backup_update_service_atomic.sql"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found in repo root. Create or place your .env file there with DATABASE_URL."
  exit 1
fi

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "Error: migration file $MIGRATION_FILE not found."
  exit 1
fi

# Load .env safely: export variables defined in it
set -a
# shellcheck disable=SC1091
. "$ENV_FILE"
set +a

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL is not set in $ENV_FILE"
  exit 1
fi

echo "Using DATABASE_URL: ${DATABASE_URL}" 

echo "Backing up existing update_service_atomic definition to $BACKUP_FILE"
psql "$DATABASE_URL" -c "\copy (SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE p.proname='update_service_atomic') TO STDOUT" > "$BACKUP_FILE" || {
  echo "Warning: backup command failed (function may not exist). Continuing...";
}

echo "Applying migration: $MIGRATION_FILE"
psql "$DATABASE_URL" -f "$MIGRATION_FILE"

echo "Migration applied. You should test the RPC now."

cat <<'EOF'
Quick manual test suggestion (replace SERVICE_UUID and optionally VENDOR_UUID):
psql "$DATABASE_URL" -c "SELECT update_service_atomic('SERVICE_UUID'::uuid, '{"title":"RPC test","event_datetime":"2026-02-11T12:00:00Z"}'::jsonb, NULL);"
EOF

echo "Done. If you want, run the test SQL (edit SERVICE_UUID) or run the app and try editing a service in the UI."