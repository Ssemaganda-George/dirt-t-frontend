#!/bin/bash

# Dirt Trails Bookings and Transactions Migration Runner
# This script runs the bookings and transactions database migrations

set -e  # Exit on any error

echo "🚀 Starting Dirt Trails Bookings & Transactions Migrations"
echo "========================================================="

# Check if we're in the right directory
if [ ! -f "create_bookings_table.sql" ] || [ ! -f "create_transactions_table.sql" ]; then
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

echo "📋 Step 1: Creating bookings table..."
if psql "$DATABASE_URL" -f create_bookings_table.sql; then
    echo "✅ Bookings table created successfully"
else
    echo "❌ Failed to create bookings table"
    exit 1
fi

echo ""
echo "📋 Step 2: Creating transactions table..."
if psql "$DATABASE_URL" -f create_transactions_table.sql; then
    echo "✅ Transactions table created successfully"
else
    echo "❌ Failed to create transactions table"
    exit 1
fi

echo ""
echo "📋 Step 3: Adding foreign keys to bookings..."
if psql "$DATABASE_URL" -f add_foreign_keys_to_bookings.sql; then
    echo "✅ Foreign keys added to bookings table"
else
    echo "❌ Failed to add foreign keys to bookings table"
    exit 1
fi

echo ""
echo "📋 Step 4: Adding payment status to bookings..."
if psql "$DATABASE_URL" -f add_payment_status.sql; then
    echo "✅ Payment status added to bookings table"
else
    echo "❌ Failed to add payment status to bookings table"
    exit 1
fi

echo ""
echo "📋 Step 5: Fixing bookings data types..."
if psql "$DATABASE_URL" -f fix_bookings_data_types.sql; then
    echo "✅ Bookings data types fixed"
else
    echo "❌ Failed to fix bookings data types"
    exit 1
fi

echo ""
echo "🎉 All bookings and transactions migrations completed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Run the main migrations: ./run_migrations.sh"
echo "2. Run RLS setup: ./run_inquiries_rls_migration.js"