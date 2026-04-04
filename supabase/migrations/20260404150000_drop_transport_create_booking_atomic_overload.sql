-- Remove the 27-argument transport overload so only the standard 14-arg create_booking_atomic remains.
-- Resolves ambiguous PostgREST RPC resolution with src/lib/createBookingAtomicRpc.ts payloads.

DROP FUNCTION IF EXISTS public.create_booking_atomic(
  uuid, uuid, uuid, date, date, integer, numeric,
  text, text, text, text, text, text, text,
  text, double precision, double precision, text, double precision, double precision, jsonb, text,
  numeric, numeric, numeric, text, text
);
