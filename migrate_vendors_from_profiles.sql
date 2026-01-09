-- Migration script to create vendor records from profiles
-- This script creates vendor records for all users with role='vendor' in profiles table
-- who don't already have a record in the vendors table

INSERT INTO vendors (user_id, business_name, business_description, business_email, status, created_at, updated_at)
SELECT
    p.id as user_id,
    COALESCE(p.full_name, 'Business Name') as business_name,
    'Please update your business description' as business_description,
    p.email as business_email,
    CASE
        WHEN p.status = 'approved' THEN 'approved'::vendor_status
        WHEN p.status = 'pending' THEN 'pending'::vendor_status
        WHEN p.status = 'rejected' THEN 'rejected'::vendor_status
        WHEN p.status = 'suspended' THEN 'suspended'::vendor_status
        ELSE 'pending'::vendor_status
    END as status,
    NOW() as created_at,
    NOW() as updated_at
FROM profiles p
WHERE p.role = 'vendor'
AND NOT EXISTS (
    SELECT 1 FROM vendors v WHERE v.user_id = p.id
);

-- Update the sequence if needed
SELECT setval('vendors_id_seq', COALESCE((SELECT MAX(id) FROM vendors), 1));

-- Verify the migration
SELECT
    'Migration completed. Created ' || COUNT(*) || ' vendor records.' as result
FROM vendors v
JOIN profiles p ON v.user_id = p.id
WHERE p.role = 'vendor';