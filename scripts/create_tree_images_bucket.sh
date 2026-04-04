#!/usr/bin/env bash
set -euo pipefail

# Create a Supabase Storage bucket named "tree-images".
# Requires environment variables:
#   SUPABASE_URL (e.g. https://xyzcompany.supabase.co)
#   SUPABASE_SERVICE_ROLE_KEY (your Supabase service_role key)

if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment."
  echo "Example: SUPABASE_URL=https://xyz.supabase.co SUPABASE_SERVICE_ROLE_KEY=... ./scripts/create_tree_images_bucket.sh"
  exit 1
fi

BUCKET="tree-images"
API="$SUPABASE_URL/storage/v1/bucket"

echo "Checking if bucket '$BUCKET' exists..."
http_code=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "$SUPABASE_URL/storage/v1/bucket/$BUCKET")

if [ "$http_code" = "200" ]; then
  echo "Bucket '$BUCKET' already exists."
  exit 0
fi

echo "Creating bucket '$BUCKET'..."
response=$(curl -s -X POST "$API" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"$BUCKET\",\"public\":true}")

if command -v jq >/dev/null 2>&1; then
  echo "$response" | jq .
else
  echo "$response"
fi

echo "Bucket creation request complete. If the bucket was created, verify its settings in the Supabase dashboard (storage -> buckets)."

exit 0
