#!/bin/bash

# Dirt Trails Database Migration Verification
# This script checks if the database migrations were applied successfully

set -e

echo "🔍 Verifying Dirt Trails Database Migrations"
echo "============================================"

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql command not found"
    exit 1
fi

# Get database connection details
if [ -z "$DATABASE_URL" ]; then
    echo "Enter your database connection string:"
    echo "Format: postgresql://username:password@host:port/database"
    read -r DATABASE_URL
fi

echo "📋 Checking service categories..."
CATEGORY_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM service_categories;")
echo "Found $CATEGORY_COUNT service categories"

if [ "$CATEGORY_COUNT" -lt 10 ]; then
    echo "⚠️  Warning: Expected at least 10 categories, found $CATEGORY_COUNT"
else
    echo "✅ Service categories look good"
fi

echo ""
echo "📋 Checking new service columns..."

# Check for some key new columns
COLUMNS_TO_CHECK=(
    "hotel_star_rating"
    "tour_difficulty_level"
    "transport_vehicle_type"
    "restaurant_cuisine_type"
    "event_datetime"
    "rental_deposit_amount"
    "workshop_learning_outcomes"
    "agency_certifications"
    "flight_airline"
    "accommodation_property_type"
)

MISSING_COLUMNS=()

for column in "${COLUMNS_TO_CHECK[@]}"; do
    EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = '$column');")
    if [ "$EXISTS" = " f" ]; then
        MISSING_COLUMNS+=("$column")
    fi
done

if [ ${#MISSING_COLUMNS[@]} -eq 0 ]; then
    echo "✅ All expected columns found"
else
    echo "❌ Missing columns:"
    for col in "${MISSING_COLUMNS[@]}"; do
        echo "  - $col"
    done
fi

echo ""
echo "📋 Checking indexes..."
# Check for both BTREE and GIN indexes
BTREE_INDEX_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'services' AND indexname LIKE 'idx_services_%' AND indexdef NOT LIKE '%USING gin%';")
GIN_INDEX_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'services' AND indexname LIKE 'idx_services_%' AND indexdef LIKE '%USING gin%';")
TOTAL_INDEX_COUNT=$((BTREE_INDEX_COUNT + GIN_INDEX_COUNT))

echo "Found $BTREE_INDEX_COUNT BTREE indexes and $GIN_INDEX_COUNT GIN indexes (total: $TOTAL_INDEX_COUNT)"

if [ "$TOTAL_INDEX_COUNT" -lt 15 ]; then
    echo "⚠️  Warning: Expected at least 15 indexes, found $TOTAL_INDEX_COUNT"
    echo "   This might be normal if some indexes already existed"
else
    echo "✅ Indexes look good"
fi

echo ""
echo "📋 Sample data check..."

# Check if we can query some new fields
SAMPLE_QUERY=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM services WHERE hotel_star_rating IS NOT NULL OR tour_difficulty_level IS NOT NULL LIMIT 1;")
if [ "$SAMPLE_QUERY" = "1" ]; then
    echo "✅ New columns are queryable"
else
    echo "ℹ️  No data in new columns yet (this is normal for new fields)"
fi

echo ""
echo "🎉 Verification complete!"
echo ""
echo "If you see any ❌ errors above, please check:"
echo "1. That you ran both migration files in order"
echo "2. Your database permissions"
echo "3. The Supabase logs for any errors"
echo ""
echo "For more details, see DATABASE_MIGRATION_README.md"