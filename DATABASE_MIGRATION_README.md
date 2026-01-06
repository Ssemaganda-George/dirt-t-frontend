# Database Schema Updates for Enhanced Service Categories

This directory contains SQL migration files to update the Dirt Trails database schema to support the comprehensive service category forms implemented in the frontend.

## Files Overview

### `update_services_schema.sql`
**Purpose**: Adds all the new fields required for the enhanced service category forms.

**What it does**:
- Adds 100+ new columns to the `services` table for all service categories
- Includes fields for hotels, tours, transport, restaurants, activities/events, equipment rental, events/workshops, travel agencies, flights, and accommodation
- Creates performance indexes for commonly queried fields
- Adds documentation comments for clarity

**Key categories covered**:
- 🏨 **Hotels & Accommodation**: Star ratings, amenities, facilities, policies
- 🎒 **Tour Packages**: Itineraries, inclusions/exclusions, difficulty levels, guides
- 🚗 **Transport**: Vehicle details, features, licensing, booking requirements
- 🍽️ **Restaurants**: Cuisine types, menus, reservations, atmosphere
- 🎢 **Activities & Events**: Event details, tickets, registration, highlights
- 🚲 **Equipment Rental**: Rental terms, deposits, maintenance, delivery
- 🎪 **Events & Workshops**: Learning outcomes, prerequisites, materials
- 🗺️ **Travel Agencies**: Certifications, specializations, services offered
- ✈️ **Flights**: Complete flight booking details matching admin panel

### `update_service_categories.sql`
**Purpose**: Ensures all service categories exist in the database with proper names and icons.

**What it does**:
- Inserts/updates all 11 service categories used in the forms
- Sets proper names, descriptions, and emoji icons
- Uses UPSERT logic to avoid conflicts

## How to Run the Migrations

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of each file in order:
   1. First: `update_service_categories.sql`
   2. Second: `update_services_schema.sql`
4. Click "Run" for each file

### Option 2: Using Supabase CLI
```bash
# If you have Supabase CLI installed and configured
supabase db push
```

### Option 3: Using psql Command Line
```bash
# Connect to your database
psql "postgresql://[username]:[password]@[host]:[port]/[database]"

# Run the migrations in order
\i update_service_categories.sql
\i update_services_schema.sql
```

## Troubleshooting

### GIN Index Error
**Error**: `data type text has no default operator class for access method "gin"`

**Solution**: This error has been fixed in the updated migration file. The issue was trying to create GIN indexes on regular TEXT columns. GIN indexes are only for:
- Array types (TEXT[], INTEGER[], etc.)
- Full-text search vectors
- JSONB columns

The migration now creates:
- BTREE indexes for regular TEXT columns
- Separate GIN indexes for each array column

## Migration Safety Features

- **IF NOT EXISTS**: All ALTER TABLE statements use this to prevent errors if columns already exist
- **ON CONFLICT DO NOTHING/UPDATE**: Category inserts use UPSERT logic
- **DEFAULT values**: All boolean and numeric fields have sensible defaults
- **CHECK constraints**: Rating and status fields have validation constraints

## Performance Considerations

The migration creates several indexes for optimal query performance:
- Category and vendor filtering
- Date-based searches (events, flights)
- Text array searches (amenities, inclusions)
- Price and rating filters

## Data Types Used

- **TEXT**: For strings and descriptions
- **INTEGER**: For counts, ratings, durations
- **DECIMAL(10,2)**: For monetary values
- **BOOLEAN**: For yes/no features
- **TEXT[]**: For arrays of strings (amenities, inclusions, etc.)
- **JSONB**: For complex objects (opening hours, contact info)
- **TIMESTAMP WITH TIME ZONE**: For dates and times
- **DATE**: For simple dates

## Post-Migration Verification

After running the migrations, you can verify they worked by:

```sql
-- Check categories
SELECT id, name, description FROM service_categories ORDER BY name;

-- Check new columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'services'
AND column_name LIKE '%event_%'
ORDER BY column_name;

-- Check indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'services'
AND indexname LIKE 'idx_services_%';
```

## Rollback (If Needed)

If you need to rollback, you can drop the added columns:

```sql
-- WARNING: This will delete data in these columns!
-- Only run if you're sure you want to remove these fields

ALTER TABLE services
DROP COLUMN IF EXISTS event_datetime,
DROP COLUMN IF EXISTS ticket_price,
-- ... add all the new columns you want to remove
;
```

## Frontend Compatibility

These database changes are designed to work with the enhanced vendor service forms. The TypeScript interfaces in `src/types/index.ts` have been updated to match these database fields.

## Support

If you encounter any issues with these migrations:
1. Check the Supabase logs for error details
2. Verify your database permissions
3. Ensure you're running the migrations in the correct order
4. Check that the `services` and `service_categories` tables exist