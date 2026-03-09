-- Migration 030: Add crypto_accounts column to vendors
-- Adds JSONB column to store crypto payout accounts (currency / network, address, label)

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS crypto_accounts jsonb;

COMMENT ON COLUMN public.vendors.crypto_accounts IS 'JSON array storing crypto payout accounts: [{currency, address, label}]';

-- Note: Bank SWIFT/BIC is already stored in bank_details->swift (migration 015).
