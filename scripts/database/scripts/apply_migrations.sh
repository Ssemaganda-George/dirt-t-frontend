#!/usr/bin/env bash
# Applies SQL migration files from the db/ directory to a Postgres database.
# Supports either psql (recommended for self-hosted Postgres) or the Supabase CLI.
# Usage:
#   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... ./scripts/apply_migrations.sh
#   or
#   PGHOST=... PGUSER=... PGPASSWORD=... PGDATABASE=... ./scripts/apply_migrations.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_DIR="$ROOT_DIR/db"

# Prefer psql if available and PGPASSWORD/PGHOST/PGDATABASE set, else try supabase CLI
if command -v psql >/dev/null 2>&1 && [ -n "${PGHOST:-}" ] && [ -n "${PGDATABASE:-}" ]; then
  echo "Using psql to apply migrations..."
  for f in "$DB_DIR"/*.sql; do
    echo "Applying $f"
    psql "host=$PGHOST dbname=$PGDATABASE user=${PGUSER:-$USER} password=${PGPASSWORD:-}" -f "$f"
  done
  echo "Migrations applied via psql."
  exit 0
fi

if command -v supabase >/dev/null 2>&1 && [ -n "${SUPABASE_URL:-}" ] && [ -n "${SUPABASE_SERVICE_KEY:-}" ]; then
  echo "Using supabase CLI to apply migrations via psql..."
  # supabase db remote commit requires a connection; we'll use psql with the connection string built from SUPABASE_URL
  # Extract host and database from SUPABASE_URL; expect SUPABASE_URL like https://<project-ref>.supabase.co
  # User must set SUPABASE_DB_HOST, SUPABASE_DB_PORT, SUPABASE_DB_NAME, SUPABASE_DB_USER, SUPABASE_DB_PASSWORD for direct psql connection.
  if [ -n "${SUPABASE_DB_HOST:-}" ] && [ -n "${SUPABASE_DB_NAME:-}" ]; then
    for f in "$DB_DIR"/*.sql; do
      echo "Applying $f"
      PGPASSWORD="$SUPABASE_DB_PASSWORD" psql "host=$SUPABASE_DB_HOST port=${SUPABASE_DB_PORT:-5432} dbname=$SUPABASE_DB_NAME user=${SUPABASE_DB_USER:-postgres}" -f "$f"
    done
    echo "Migrations applied to Supabase DB via psql."
    exit 0
  fi
  echo "Supabase CLI available but direct DB connection env vars are missing. Please set SUPABASE_DB_HOST/SUPABASE_DB_NAME/SUPABASE_DB_USER/SUPABASE_DB_PASSWORD and re-run."
  exit 1
fi

cat <<EOF
No suitable DB client found or environment variables missing.
Options:
  1) Use psql and set PGHOST, PGDATABASE, PGUSER (optional), PGPASSWORD. Example:
     PGHOST=127.0.0.1 PGDATABASE=dirt_trails PGUSER=postgres PGPASSWORD=secret ./scripts/apply_migrations.sh

  2) To apply to Supabase, set SUPABASE_DB_HOST, SUPABASE_DB_NAME, SUPABASE_DB_USER, SUPABASE_DB_PASSWORD and run the script.

  3) Use the Supabase SQL editor in the dashboard and run the SQL files manually in order:
     - db/001_add_scan_enabled_activation_requests_and_otps.sql
     - db/002_events_tickets.sql

EOF
exit 1
