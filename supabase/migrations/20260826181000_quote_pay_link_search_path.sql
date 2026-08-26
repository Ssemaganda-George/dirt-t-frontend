-- Quote token generation uses pgcrypto, which lives in the extensions schema on Travel Tails.
ALTER FUNCTION public.create_quote_pay_link(uuid, uuid, text, text, text, jsonb, numeric, text, text, integer, integer, text, text, date, date, timestamptz)
  SET search_path = public, extensions;
