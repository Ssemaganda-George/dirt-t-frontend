-- Add a lightweight preferred_payout column to vendors to store the id of the vendor's preferred payout destination
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS preferred_payout text;

COMMENT ON COLUMN public.vendors.preferred_payout IS 'Optional: stores the selected payout id (e.g. "bank" or "mobile-0") to use as default when requesting withdrawals.';
