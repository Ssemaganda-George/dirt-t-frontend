# Checkout Schema Migration - REQUIRED

## Issue
The checkout page is trying to save `guest_name`, `guest_email`, and `guest_phone` to the `orders` table, but these columns don't exist in Supabase yet.

**Error:**
```
"Could not find the 'guest_email' column of 'orders' in the schema cache"
```

## Solution
Deploy the migration to add these columns to the orders table.

## Step-by-Step Deployment

### Option 1: Via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project: **DirtTrails** (ywxvgfhwmnwzsafwmpil)

2. **Navigate to SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Copy and Execute Migration**
   - Copy the SQL below
   - Paste into the SQL editor
   - Click **Run**

```sql
-- Migration to add guest information fields to orders table
-- This ensures we can create bookings for guest ticket purchases

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS guest_name text,
ADD COLUMN IF NOT EXISTS guest_email text,
ADD COLUMN IF NOT EXISTS guest_phone text;

-- Add comment for documentation
COMMENT ON COLUMN public.orders.guest_name IS 'Guest buyer name for orders without user_id';
COMMENT ON COLUMN public.orders.guest_email IS 'Guest buyer email for orders without user_id';
COMMENT ON COLUMN public.orders.guest_phone IS 'Guest buyer phone for orders without user_id';
```

4. **Verify Success**
   - You should see: `Query executed successfully`
   - No errors should appear

### Option 2: Via psql Command Line

If you have direct database access:

```bash
psql -h ywxvgfhwmnwzsafwmpil.db.supabase.co -U postgres -d postgres << EOF
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS guest_name text,
ADD COLUMN IF NOT EXISTS guest_email text,
ADD COLUMN IF NOT EXISTS guest_phone text;

COMMENT ON COLUMN public.orders.guest_name IS 'Guest buyer name for orders without user_id';
COMMENT ON COLUMN public.orders.guest_email IS 'Guest buyer email for orders without user_id';
COMMENT ON COLUMN public.orders.guest_phone IS 'Guest buyer phone for orders without user_id';
EOF
```

## What These Columns Store

| Column | Type | Purpose | Example |
|--------|------|---------|---------|
| `guest_name` | text | Full name of guest ticket buyer | "John Doe" |
| `guest_email` | text | Email of guest ticket buyer | "john@example.com" |
| `guest_phone` | text | Phone number with country code | "+25675918649" |

These columns allow:
- Ticket purchases without requiring user account creation
- Flexible guest booking workflow
- Direct contact with ticket buyers via email/phone

## Related Files

- **Frontend Component**: `/src/pages/Checkout.tsx` (lines 710-750)
  - Attempts to save buyer info to orders table
  - Uses Supabase REST API PATCH request

- **Migration File**: `/db/add_guest_info_to_orders.sql`
  - Contains the ALTER TABLE migration

## Testing After Deployment

1. Go to `/checkout/a5723245-71d0-4aa4-bf28-6950ba3d1c6e`
2. Fill in buyer information (Name, Email, Phone)
3. Click **Next** button
4. Should navigate to payment page without errors

## Troubleshooting

**If you still get the error:**
1. Clear browser cache (Ctrl+Shift+Delete / Cmd+Shift+Delete)
2. Clear Supabase schema cache:
   - Go to Supabase Dashboard → Settings → API
   - Refresh the page or wait 1-2 minutes for cache invalidation

**To verify columns were created:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('guest_name', 'guest_email', 'guest_phone');
```

Should return 3 rows with `text` type.

## Database Schema

After deployment, your orders table will have:

```
orders table structure:
├── id (uuid, primary key)
├── tourist_id (uuid, nullable)
├── vendor_id (uuid, nullable)
├── service_id (uuid, nullable)
├── status (text)
├── payment_status (text)
├── total_amount (numeric)
├── currency (text)
├── guest_name (text) ← NEW
├── guest_email (text) ← NEW
├── guest_phone (text) ← NEW
├── reference (text)
├── created_at (timestamp)
└── updated_at (timestamp)
```

## Timeline

- **Checkout mobile optimization**: Completed ✅
- **Schema migration**: ⏳ Pending deployment
- **Feature complete**: After schema migration

## Next Steps

1. Deploy the migration SQL to Supabase
2. Test checkout flow with guest buyer information
3. Verify email notifications are sent (if enabled)
4. Confirm orders are saved with buyer contact info
