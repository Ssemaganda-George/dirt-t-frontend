-- Migration 031: Enable pgcrypto and add encrypted columns for vendor payout details
-- This migration is additive and non-destructive.

-- Enable pgcrypto (helps if you later want server-side encryption functions)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS bank_details_encrypted text,
  ADD COLUMN IF NOT EXISTS mobile_money_accounts_encrypted text,
  ADD COLUMN IF NOT EXISTS crypto_accounts_encrypted text;

COMMENT ON COLUMN public.vendors.bank_details_encrypted IS 'Optional encrypted blob (base64 JSON) of bank_details. Use server-side key management in production.';
COMMENT ON COLUMN public.vendors.mobile_money_accounts_encrypted IS 'Optional encrypted blob (base64 JSON) of mobile_money_accounts.';
COMMENT ON COLUMN public.vendors.crypto_accounts_encrypted IS 'Optional encrypted blob (base64 JSON) of crypto_accounts.';

-- NOTE: This migration only adds schema support. To actually encrypt/decrypt at the DB level,
-- you should implement server-side logic or use pgcrypto's PGP_SYM_ENCRYPT/DECRYPT in trusted functions
-- which read keys from a secure location (not from client-provided values).
