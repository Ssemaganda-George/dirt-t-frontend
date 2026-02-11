-- Migration: add scan_enabled to services and create activation_requests and event_otps tables
-- Run this migration against your Postgres database used by Supabase

-- 1) Add scan_enabled column to services (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='scan_enabled') THEN
    ALTER TABLE public.services
      ADD COLUMN scan_enabled boolean DEFAULT false;
  END IF;
END$$;

-- 2) Create activation_requests table
CREATE TABLE IF NOT EXISTS public.activation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  requester_id uuid NULL, -- profile id of who requested (usually vendor's user/profile id)
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  admin_id uuid NULL, -- profile id of admin who handled the request
  admin_notes text NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Create event_otps table
CREATE TABLE IF NOT EXISTS public.event_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  otp text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_otps_service_id ON public.event_otps(service_id);

-- Ensure pgcrypto extension for gen_random_uuid exists
CREATE EXTENSION IF NOT EXISTS pgcrypto;
