ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT pending CHECK (payment_status IN (pending, paid, refunded));
