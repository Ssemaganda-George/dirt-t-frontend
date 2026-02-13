-- Migration 032: Add commission fields to bookings table
-- This adds commission tracking fields to store commission amounts at booking time

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS commission_rate_at_booking decimal(3,2) CHECK (commission_rate_at_booking >= 0 AND commission_rate_at_booking <= 1),
  ADD COLUMN IF NOT EXISTS commission_amount decimal(10,2) DEFAULT 0 CHECK (commission_amount >= 0),
  ADD COLUMN IF NOT EXISTS vendor_payout_amount decimal(10,2) CHECK (vendor_payout_amount >= 0);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_bookings_commission_rate ON public.bookings(commission_rate_at_booking);
CREATE INDEX IF NOT EXISTS idx_bookings_status_created_at ON public.bookings(status, created_at);

-- Update existing bookings with commission calculations
-- For existing bookings, we'll use the default Bronze tier commission rate (15%)
UPDATE public.bookings
SET
  commission_rate_at_booking = 0.15,
  commission_amount = total_amount * 0.15,
  vendor_payout_amount = total_amount - (total_amount * 0.15)
WHERE commission_rate_at_booking IS NULL;

-- Add check constraint to ensure payout amount is correct
ALTER TABLE public.bookings
  ADD CONSTRAINT check_vendor_payout_amount
  CHECK (vendor_payout_amount = total_amount - commission_amount);

-- Add check constraint to ensure commission amount is correct
ALTER TABLE public.bookings
  ADD CONSTRAINT check_commission_amount
  CHECK (commission_amount = total_amount * commission_rate_at_booking);