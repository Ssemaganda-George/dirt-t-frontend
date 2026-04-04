#!/usr/bin/env bash
set -euo pipefail

# Apply a single SQL migration file to your Supabase Postgres using psql.
# Usage:
#   SUPABASE_DB_URL="postgresql://user:pass@host:5432/postgres?sslmode=require" bash scripts/apply_migration_017.sh

SQL_FILE="db/017_add_booking_id_to_trees.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "Migration file not found: $SQL_FILE"
  exit 2
fi

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "Please set SUPABASE_DB_URL to your Supabase Postgres connection string." >&2
  echo "Example (export before running):" >&2
  echo "  export SUPABASE_DB_URL=\"postgresql://user:pass@db.host.supabase.co:5432/postgres?sslmode=require\"" >&2
  exit 3
fi

echo "Applying migration: $SQL_FILE"

# Run psql with the provided connection string
psql "$SUPABASE_DB_URL" -f "$SQL_FILE"

echo "Migration applied (or psql exited). Check Supabase SQL editor or run verification queries to confirm." 
