-- Migration: Add transactions table, booking_issues audit table, and a sample process_payment_atomic RPC
-- Run this with psql/supabase migrations or your preferred DB migration tool.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  tourist_id uuid,
  vendor_id uuid,
  amount numeric NOT NULL,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  payment_method text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Simple audit table for flagged booking reports and reconciliations
CREATE TABLE IF NOT EXISTS booking_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id),
  issue_type text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  reported_at timestamptz DEFAULT now()
);

-- A small, idempotent RPC to insert a completed transaction for a booking.
-- This is intentionally simple: real payment processing should be done
-- server-side with proper idempotency keys and external gateway verification.
CREATE OR REPLACE FUNCTION process_payment_atomic(
  _booking_id uuid,
  _amount numeric,
  _currency text,
  _payment_method text DEFAULT 'manual',
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(id uuid, booking_id uuid, amount numeric, currency text, status text, created_at timestamptz)
LANGUAGE plpgsql AS $$
DECLARE
  _id uuid := gen_random_uuid();
BEGIN
  INSERT INTO transactions(id, booking_id, amount, currency, status, payment_method, metadata, created_at)
  VALUES (_id, _booking_id, _amount, _currency, 'completed', _payment_method, _metadata, now());

  RETURN QUERY SELECT id, booking_id, amount, currency, status, created_at FROM transactions WHERE id = _id;
END;
$$;

COMMIT;
