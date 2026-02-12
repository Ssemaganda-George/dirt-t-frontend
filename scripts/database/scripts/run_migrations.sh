#!/bin/bash

# Dirt Trails Database Migration Runner
# This script runs the database migrations in the correct order

set -e  # Exit on any error

echo "🚀 Starting Dirt Trails Database Migrations"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "update_service_categories.sql" ] || [ ! -f "update_services_schema.sql" ]; then
    echo "❌ Error: Migration files not found in current directory"
    echo "Please run this script from the directory containing the SQL files"
    exit 1
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql command not found"
    echo "Please install PostgreSQL client tools or use Supabase dashboard"
    exit 1
fi

# Get database connection details
if [ -z "$DATABASE_URL" ]; then
    echo "Enter your database connection string:"
    echo "Format: postgresql://username:password@host:port/database"
    read -r DATABASE_URL
fi

echo "📋 Step 1: Updating service categories..."
if psql "$DATABASE_URL" -f update_service_categories.sql; then
    echo "✅ Service categories updated successfully"
else
    echo "❌ Failed to update service categories"
    exit 1
fi

echo ""
echo "📋 Step 2: Updating services schema..."
if psql "$DATABASE_URL" -f update_services_schema.sql; then
    echo "✅ Services schema updated successfully"
else
    echo "❌ Failed to update services schema"
    exit 1
fi

echo ""
echo "🎉 All migrations completed successfully!"
echo ""
echo "Next steps:"
echo "1. Verify the migrations worked by checking your database"
echo "2. Test the enhanced service forms in your application"
echo "3. Monitor performance and add additional indexes if needed"
echo ""
echo "For verification queries, see DATABASE_MIGRATION_README.md"