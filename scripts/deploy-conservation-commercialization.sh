#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Conservation commercialization deploy script
#
# Deploys the tree-credits / carbon-offsets edge functions.
#
# Prereqs:
#   1. Supabase CLI installed  → https://supabase.com/docs/guides/cli
#   2. Logged in               → supabase login   (stores a token in the keychain)
#   3. Project linked          → supabase link --project-ref ywxvgfhwmnwzsafwmpil
#
# Usage:
#   ./scripts/deploy-conservation-commercialization.sh
#
# NOTE ON MIGRATIONS:
#   This project's local supabase/migrations folder is a *subset* of what the
#   remote database has already applied (remote is ahead), so `supabase db push`
#   refuses with a migration-history mismatch. Apply new migrations by running
#   the SQL directly instead:
#
#     curl -X POST \
#       "https://api.supabase.com/v1/projects/<ref>/database/query" \
#       -H "Authorization: Bearer <access-token>" \
#       -H "Content-Type: application/json" \
#       -d "{\"query\": \"$(cat supabase/migrations/<file>.sql)\"}"
#
#   Then record it so tracking stays consistent:
#
#     INSERT INTO supabase_migrations.schema_migrations (version)
#     VALUES ('20260820120000') ON CONFLICT DO NOTHING;
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-ywxvgfhwmnwzsafwmpil}"

echo "==> Project: ${PROJECT_REF}"

echo "==> Deploying conservation edge functions"
supabase functions deploy tree-credits --project-ref "${PROJECT_REF}"
supabase functions deploy carbon-offsets --project-ref "${PROJECT_REF}"
supabase functions deploy conservation-fulfillment --project-ref "${PROJECT_REF}"

# The webhook must be redeployed so it can dispatch conservation fulfillment
# when a conservation payment settles.
supabase functions deploy marzpay-webhook --project-ref "${PROJECT_REF}"

# The trip planner needs a reachable model, and banner OCR needs a vision key.
# Without these the planner silently degrades (empty plans / no banner text).
supabase functions deploy trip-planner --project-ref "${PROJECT_REF}"
supabase functions deploy scan-service-banner --project-ref "${PROJECT_REF}"

echo ""
echo "==> Verify the model/OCR secrets exist:"
echo "    GEMINI_API_KEY  — trip planner calls the Gemini API"
echo "    GEMMA_MODEL     — REQUIRED: the old gemini-2.5-flash default is now"
echo "                      restricted for this key; use gemma-4-26b-a4b-it"
echo "    GROQ_API_KEY    — scan-service-banner OCR; without it service banners"
echo "                      are never read and the planner loses source text"
supabase secrets list --project-ref "${PROJECT_REF}"

echo ""
echo "Done. Verify with:"
echo "  curl -s \"\${SUPABASE_URL}/functions/v1/carbon-offsets/pricing\" \\"
echo "       -H \"apikey: \${ANON_KEY}\" -H \"Authorization: Bearer \${ANON_KEY}\""
echo "  curl -s \"\${SUPABASE_URL}/functions/v1/tree-credits/pricing\" \\"
echo "       -H \"apikey: \${ANON_KEY}\" -H \"Authorization: Bearer \${ANON_KEY}\""
echo ""
echo "Product pages:"
echo "  /conservation/credits                 — bulk tree credit store"
echo "  /conservation/offsets                 — verified carbon offset checkout"
echo "  /conservation/offsets/certificate     — public certificate lookup"
echo "  /admin/conservation/commercial        — admin: companies, batches, orders, keys"
echo ""
echo "Company API (server-to-server):"
echo "  GET  /tree-credits/balance    -H 'x-company-api-key: dt_live_...'"
echo "  POST /tree-credits/consume   -H 'x-company-api-key: dt_live_...'"
