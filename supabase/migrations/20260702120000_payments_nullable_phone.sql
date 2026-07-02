-- Card payments have no phone number; MoMo rows keep phone_number populated.
ALTER TABLE public.payments
  ALTER COLUMN phone_number DROP NOT NULL;
