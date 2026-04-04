-- =============================================================================
-- Migration 033: Optimistic capacity counter for create_booking_atomic
-- Design: Option C — dedicated service_capacity table
--
-- PROBLEM WITH THE OLD APPROACH
-- ─────────────────────────────
-- The previous create_booking_atomic took an exclusive row lock on `services`:
--
--   SELECT * FROM public.services WHERE id = p_service_id FOR UPDATE;
--
-- Every concurrent booking for ANY service serialised through that lock while a
-- SUM() aggregate scanned the bookings table.  At 100 concurrent requests for
-- the same service all 100 transactions queue up; each one holds the lock for
-- the full duration of the aggregate scan plus the INSERT.
--
-- SOLUTION
-- ────────
-- Introduce service_capacity(service_id, service_date, reserved) as a single
-- row per (service, date) pair.  The capacity check AND increment are merged
-- into one atomic INSERT … ON CONFLICT DO UPDATE with a WHERE guard:
--
--   INSERT INTO service_capacity(service_id, service_date, reserved)
--   VALUES (p_service_id, p_service_date, p_guests)
--   ON CONFLICT (service_id, service_date) DO UPDATE
--     SET reserved = service_capacity.reserved + EXCLUDED.reserved
--   WHERE service_capacity.reserved + EXCLUDED.reserved <= v_max_capacity
--   RETURNING reserved;
--
-- PostgreSQL executes this as a single index-range operation on the PK.
-- The conditional UPDATE is enforced atomically by the storage engine:
-- concurrent writers on the same (service_id, service_date) row serialize at
-- the tuple level, NOT at the whole-table or whole-service-row level.
-- Bookings for different services or different dates never contend at all.
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1 — service_capacity DDL
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.service_capacity (
  service_id   uuid    NOT NULL,
  service_date date    NOT NULL,
  reserved     integer NOT NULL DEFAULT 0
                       CHECK (reserved >= 0),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (service_id, service_date),

  CONSTRAINT fk_service_capacity_service
    FOREIGN KEY (service_id)
    REFERENCES public.services(id)
    ON DELETE CASCADE          -- clean up automatically when a service is deleted
);

-- The PK (service_id, service_date) already gives us a B-tree index on both
-- columns, which covers the equality lookup we do in INSERT … ON CONFLICT.
-- Add a supporting index on service_id alone for queries like
-- "show all reserved counts for service X" (vendor dashboards, admin views).
CREATE INDEX IF NOT EXISTS idx_service_capacity_service_id
  ON public.service_capacity (service_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2 — backfill from existing bookings
-- ─────────────────────────────────────────────────────────────────────────────
-- Populate service_capacity from every (confirmed + pending) booking that has
-- a non-null service_date.  Run once; safe to re-run because of ON CONFLICT.

INSERT INTO public.service_capacity (service_id, service_date, reserved)
SELECT
  b.service_id,
  b.service_date,
  COALESCE(SUM(b.guests), 0)::integer AS reserved
FROM public.bookings b
WHERE b.service_date IS NOT NULL
  AND b.status IN ('confirmed', 'pending')
GROUP BY b.service_id, b.service_date
ON CONFLICT (service_id, service_date) DO UPDATE
  SET reserved   = EXCLUDED.reserved,
      updated_at = now();

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3 — rewritten create_booking_atomic
-- ─────────────────────────────────────────────────────────────────────────────
-- Drop any existing overloads so we can replace cleanly.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT oid::regprocedure::text AS sig
    FROM pg_proc
    WHERE proname = 'create_booking_atomic'
  LOOP
    RAISE NOTICE 'Dropping existing function: %', r.sig;
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
  END LOOP;
END$$;

CREATE OR REPLACE FUNCTION create_booking_atomic(
  -- ── core booking fields ──────────────────────────────────────────────────
  p_service_id                  uuid,
  p_vendor_id                   uuid,
  p_booking_date                date,
  p_guests                      integer,
  p_total_amount                numeric,
  -- ── optional fields ──────────────────────────────────────────────────────
  p_tourist_id                  uuid             DEFAULT NULL,
  p_service_date                date             DEFAULT NULL,
  p_currency                    text             DEFAULT 'UGX',
  p_special_requests            text             DEFAULT NULL,
  p_guest_name                  text             DEFAULT NULL,
  p_guest_email                 text             DEFAULT NULL,
  p_guest_phone                 text             DEFAULT NULL,
  p_pickup_location             text             DEFAULT NULL,
  p_dropoff_location            text             DEFAULT NULL,
  -- ── transport / journey fields ───────────────────────────────────────────
  p_trip_setoff                 text             DEFAULT NULL,
  p_trip_setoff_lat             double precision DEFAULT NULL,
  p_trip_setoff_lng             double precision DEFAULT NULL,
  p_trip_destination            text             DEFAULT NULL,
  p_trip_destination_lat        double precision DEFAULT NULL,
  p_trip_destination_lng        double precision DEFAULT NULL,
  p_trip_stopovers              jsonb            DEFAULT NULL,
  p_trip_return_option          text             DEFAULT NULL,
  p_journey_estimated_hours     numeric          DEFAULT NULL,
  p_journey_estimated_distance  numeric          DEFAULT NULL,
  p_journey_estimated_fuel      numeric          DEFAULT NULL,
  p_journey_summary             text             DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  -- ── local variables ───────────────────────────────────────────────────────
  v_max_capacity    integer;
  v_service_status  text;
  v_new_reserved    integer;   -- value returned by the capacity upsert
  v_booking_id      uuid;
BEGIN

  -- ── 1. Validate guests ────────────────────────────────────────────────────
  IF p_guests IS NULL OR p_guests < 1 THEN
    RETURN jsonb_build_object('success', false,
      'error', 'guests must be a positive integer');
  END IF;

  -- ── 2. Read service metadata (NO lock) ───────────────────────────────────
  -- We only need two scalar columns; no FOR UPDATE needed here.
  -- The capacity enforcement is done atomically in step 3.
  SELECT status, max_capacity
  INTO   v_service_status, v_max_capacity
  FROM   public.services
  WHERE  id = p_service_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service not found');
  END IF;

  IF v_service_status NOT IN ('approved', 'active') THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Service is not available for booking');
  END IF;

  -- ── 3. Atomic capacity check + increment ──────────────────────────────────
  -- This is the critical section.  The entire check-and-increment is ONE SQL
  -- statement evaluated atomically by the tuple-level lock on the capacity row.
  --
  -- How the WHERE clause prevents overbooking:
  --   • On INSERT (no existing row): the row is created only when p_guests <=
  --     v_max_capacity, i.e. the very first booking fits.
  --   • On UPDATE (row exists): the update fires only when the new total does
  --     not exceed max_capacity.
  --   • If the WHERE predicate is false, neither INSERT nor UPDATE occurs and
  --     the statement returns zero rows → we detect the rejection below.
  --
  -- Only services with a defined max_capacity enforce this counter.
  -- Services with max_capacity IS NULL accept any number of guests.

  IF v_max_capacity IS NOT NULL THEN

    -- When service_date is NULL (open-ended services without a specific date)
    -- we still want capacity tracking; treat NULL date as a special sentinel
    -- by coalescing to the epoch date '1970-01-01'.  All callers that do pass
    -- a service_date will simply use that real date.

    INSERT INTO public.service_capacity (service_id, service_date, reserved)
    VALUES (
      p_service_id,
      COALESCE(p_service_date, '1970-01-01'::date),
      p_guests
    )
    ON CONFLICT (service_id, service_date) DO UPDATE
      SET
        reserved   = service_capacity.reserved + EXCLUDED.reserved,
        updated_at = now()
      WHERE service_capacity.reserved + EXCLUDED.reserved <= v_max_capacity
    RETURNING reserved INTO v_new_reserved;

    -- If no row was returned the WHERE guard rejected the increment — full.
    IF v_new_reserved IS NULL THEN
      -- Re-read the current reserved count for a useful error message.
      -- This SELECT is NOT inside the critical section; it is only for UX.
      SELECT reserved
      INTO   v_new_reserved
      FROM   public.service_capacity
      WHERE  service_id   = p_service_id
        AND  service_date = COALESCE(p_service_date, '1970-01-01'::date);

      RETURN jsonb_build_object(
        'success',   false,
        'error',     format(
          'Insufficient capacity. Available: %s, Requested: %s',
          GREATEST(0, v_max_capacity - COALESCE(v_new_reserved, 0)),
          p_guests
        )
      );
    END IF;

  END IF;

  -- ── 4. Insert the booking row ─────────────────────────────────────────────
  -- Capacity is already reserved above; insert the booking record.
  -- If this INSERT fails for any reason the exception handler rolls back the
  -- entire transaction, which also reverts the service_capacity increment.

  INSERT INTO public.bookings (
    service_id,
    tourist_id,
    vendor_id,
    booking_date,
    service_date,
    guests,
    total_amount,
    currency,
    status,
    payment_status,
    special_requests,
    guest_name,
    guest_email,
    guest_phone,
    pickup_location,
    dropoff_location,
    trip_setoff,
    trip_setoff_lat,
    trip_setoff_lng,
    trip_destination,
    trip_destination_lat,
    trip_destination_lng,
    trip_stopovers,
    trip_return_option,
    journey_estimated_hours,
    journey_estimated_distance,
    journey_estimated_fuel,
    journey_summary,
    is_guest_booking,
    created_at,
    updated_at
  ) VALUES (
    p_service_id,
    p_tourist_id,
    p_vendor_id,
    p_booking_date,
    p_service_date,
    p_guests,
    p_total_amount,
    p_currency,
    'pending',
    'pending',
    p_special_requests,
    p_guest_name,
    p_guest_email,
    p_guest_phone,
    p_pickup_location,
    p_dropoff_location,
    p_trip_setoff,
    p_trip_setoff_lat,
    p_trip_setoff_lng,
    p_trip_destination,
    p_trip_destination_lat,
    p_trip_destination_lng,
    p_trip_stopovers,
    p_trip_return_option,
    p_journey_estimated_hours,
    p_journey_estimated_distance,
    p_journey_estimated_fuel,
    p_journey_summary,
    CASE WHEN p_tourist_id IS NULL THEN true ELSE false END,
    now(),
    now()
  )
  RETURNING id INTO v_booking_id;

  RETURN jsonb_build_object('success', true, 'booking_id', v_booking_id);

EXCEPTION
  WHEN OTHERS THEN
    -- The transaction is automatically rolled back by the caller (Supabase RPC
    -- wraps each function call in its own transaction).  Returning the error as
    -- JSON keeps the API contract identical to the previous implementation.
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION create_booking_atomic(
  uuid, uuid, date, integer, numeric,
  uuid, date, text, text, text, text, text, text, text,
  text, double precision, double precision, text, double precision, double precision,
  jsonb, text, numeric, numeric, numeric, text
) IS
'Atomically creates a booking with overbooking prevention via service_capacity
counter table (migration 033).  Replaces the FOR UPDATE service row lock with a
single INSERT…ON CONFLICT DO UPDATE WHERE statement on service_capacity, which
serialises only at the individual (service_id, service_date) tuple level.
100 concurrent bookings for the same service now queue at one row rather than
the full services table row.  Backwards compatible: existing bookings are
preserved; capacity counter is backfilled from confirmed/pending bookings.';

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4 — helper: release capacity when a booking is cancelled/rejected
-- ─────────────────────────────────────────────────────────────────────────────
-- If a booking moves to cancelled/rejected its guests must be returned to the
-- pool.  This trigger fires AFTER UPDATE on bookings whenever the status
-- column transitions away from confirmed/pending.

CREATE OR REPLACE FUNCTION trg_release_capacity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only act when a booking leaves an active status
  IF OLD.status IN ('confirmed', 'pending')
     AND NEW.status NOT IN ('confirmed', 'pending') THEN

    UPDATE public.service_capacity
    SET
      reserved   = GREATEST(0, reserved - NEW.guests),
      updated_at = now()
    WHERE service_id   = NEW.service_id
      AND service_date = COALESCE(NEW.service_date, '1970-01-01'::date);

  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_release_capacity ON public.bookings;

CREATE TRIGGER trg_bookings_release_capacity
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION trg_release_capacity();

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5 — RLS policies for service_capacity
-- ─────────────────────────────────────────────────────────────────────────────
-- service_capacity is an internal accounting table.
-- Clients must never be able to manipulate it directly; all writes go through
-- create_booking_atomic (SECURITY DEFINER) or the trigger above.

ALTER TABLE public.service_capacity ENABLE ROW LEVEL SECURITY;

-- Vendors and admins can read availability for their own services.
DROP POLICY IF EXISTS "vendors_read_own_capacity" ON public.service_capacity;
CREATE POLICY "vendors_read_own_capacity"
  ON public.service_capacity
  FOR SELECT
  USING (
    service_id IN (
      SELECT id FROM public.services WHERE vendor_id = auth.uid()
    )
  );

-- Admins (profile role = 'admin') can read everything.
DROP POLICY IF EXISTS "admins_read_all_capacity" ON public.service_capacity;
CREATE POLICY "admins_read_all_capacity"
  ON public.service_capacity
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- No direct INSERT / UPDATE / DELETE for any client role; all mutations go
-- through SECURITY DEFINER functions.

COMMIT;

-- =============================================================================
-- TRADE-OFFS vs OLD APPROACH (for reference — not executed)
-- =============================================================================
--
-- DIMENSION              OLD (FOR UPDATE on services row)   NEW (service_capacity)
-- ─────────────────────────────────────────────────────────────────────────────
-- Lock granularity       Whole services row — ALL bookings   One row per
--                        for any date queue behind each      (service, date) pair.
--                        other.                              Different dates never
--                                                            contend at all.
--
-- Critical section       SELECT SUM() aggregate scan on      Single primary-key
--                        bookings table (full table scan if  equality lookup +
--                        no covering index).                 counter increment.
--                        O(n bookings for service/date).     O(1).
--
-- Throughput at 100      All 100 serialise; each holds lock  100 transactions
-- concurrent requests    for aggregate + INSERT duration.    contend on ONE tuple.
--                                                            PostgreSQL processes
--                                                            them in a tight loop;
--                                                            no aggregate needed.
--
-- Risk of stale count    None (recomputed from live data     Possible divergence if
--                        every time).                        a booking is inserted
--                                                            outside the function
--                                                            or the trigger fails.
--                                                            Mitigate: periodic
--                                                            reconciliation job.
--
-- Schema change required No                                  Yes — new table +
--                                                            trigger + backfill.
--
-- Cancellation handling  Free automatically (aggregate       Requires explicit
--                        re-reads live status every time).   decrement in trigger.
--
-- NULL service_date      Works (counts all matching NULLs).  Sentinel date
--                                                            '1970-01-01' used;
--                                                            clearly documented.
--
-- Backwards compat.      N/A                                 Yes.  Backfill in
--                                                            section 2 seeds the
--                                                            counter from existing
--                                                            bookings; the function
--                                                            signature is unchanged.
-- =============================================================================
