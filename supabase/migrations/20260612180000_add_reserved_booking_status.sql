-- Must be in its own migration: new enum values cannot be used in the same transaction.

ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'reserved';
