#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="exports"
mkdir -p "$OUT_DIR"

if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment." >&2
  echo "Example: export SUPABASE_URL='https://xyz.supabase.co'" >&2
  echo "         export SUPABASE_SERVICE_ROLE_KEY='service-role-key'" >&2
  exit 2
fi

echo "Exporting trees from $SUPABASE_URL/rest/v1/trees ..."

curl -s -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Accept: application/json" \
     "$SUPABASE_URL/rest/v1/trees?select=*" > "$OUT_DIR/trees.json"

if [ ! -s "$OUT_DIR/trees.json" ]; then
  echo "No data exported or request failed. Check SUPABASE_URL / key / network." >&2
  exit 3
fi

echo "Saved JSON to $OUT_DIR/trees.json"

if command -v jq >/dev/null 2>&1; then
  echo "Converting JSON -> CSV (best-effort)."
  jq -r 'if type=="array" then (.[0] | keys_unsorted) as $keys | $keys, ( .[] | [ .[$keys[]] | tostring ] ) | @csv else . end' \
    "$OUT_DIR/trees.json" > "$OUT_DIR/trees.csv" || true
  if [ -s "$OUT_DIR/trees.csv" ]; then
    echo "Saved CSV to $OUT_DIR/trees.csv"
  else
    echo "CSV conversion produced empty file or failed; keep the JSON and inspect it with 'jq'."
  fi
else
  echo "jq not found — skipping CSV conversion. Install jq to enable JSON->CSV conversion." >&2
fi

echo "Done. Files are in $OUT_DIR/"
