#!/bin/bash

# Script to fix foreign key constraint and delete service with ID b5980e78-d57a-4438-8787-eb92a774c687
# This script changes the order_items -> ticket_types foreign key from RESTRICT to CASCADE
# Then deletes the service and all related data

set -e

echo "🔧 Dirt Trails Service Deletion Fix Script"
echo "=========================================="

# Check if required environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables must be set"
    echo ""
    echo "Set them like this:"
    echo "export SUPABASE_URL='https://your-project.supabase.co'"
    echo "export SUPABASE_SERVICE_KEY='your-service-key'"
    echo ""
    echo "You can find these values in your Supabase dashboard under Settings > API"
    exit 1
fi

SERVICE_ID="b5980e78-d57a-4438-8787-eb92a774c687"

echo "📋 Step 1: Changing foreign key constraint from RESTRICT to CASCADE..."

# SQL to change the foreign key constraint
CHANGE_CONSTRAINT_SQL="
-- Drop the existing RESTRICT constraint
ALTER TABLE public.order_items
DROP CONSTRAINT order_items_ticket_type_id_fkey;

-- Add the CASCADE constraint
ALTER TABLE public.order_items
ADD CONSTRAINT order_items_ticket_type_id_fkey
FOREIGN KEY (ticket_type_id)
REFERENCES public.ticket_types(id)
ON DELETE CASCADE;
"

echo "Executing constraint change..."
# Use curl to execute the SQL via Supabase REST API
RESPONSE=$(curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"sql\": \"$CHANGE_CONSTRAINT_SQL\"}")

if echo "$RESPONSE" | grep -q "error"; then
    echo "❌ Failed to change constraint: $RESPONSE"
    exit 1
fi

echo "✅ Foreign key constraint changed to CASCADE"

echo ""
echo "📋 Step 2: Deleting service $SERVICE_ID and all related data..."

# Use the delete_service_atomic function we updated
DELETE_SQL="
SELECT delete_service_atomic('$SERVICE_ID'::uuid, NULL, true);
"

echo "Executing service deletion..."
RESPONSE=$(curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"sql\": \"$DELETE_SQL\"}")

if echo "$RESPONSE" | grep -q "error"; then
    echo "❌ Failed to delete service: $RESPONSE"
    exit 1
fi

echo "✅ Service and all related data deleted successfully"
echo ""
echo "🎉 Operation completed!"
echo ""
echo "What was deleted:"
echo "- Service $SERVICE_ID"
echo "- All ticket_types for this service"
echo "- All order_items referencing those ticket_types"
echo "- All orders that became empty"
echo "- All tickets for this service"
echo "- All other related records (CASCADE relationships)"

echo ""
echo "Note: The foreign key constraint has been changed to CASCADE for future operations."