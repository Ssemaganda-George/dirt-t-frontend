-- Migration 015: Add payment details columns to vendors table
-- Adds JSONB columns to store bank details and mobile money accounts for vendor payouts

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS bank_details jsonb,
  ADD COLUMN IF NOT EXISTS mobile_money_accounts jsonb;

COMMENT ON COLUMN public.vendors.bank_details IS 'JSON object storing vendor bank details (name, account_name, account_number, branch, swift)';
COMMENT ON COLUMN public.vendors.mobile_money_accounts IS 'JSON array storing mobile money payout accounts: [{provider, phone, country_code}]';
