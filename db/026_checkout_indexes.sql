-- Indexes for checkout flow: faster order + order_items + ticket_types lookups
-- Run this in Supabase SQL Editor or your migration runner.
-- For zero-downtime in production, run with CONCURRENTLY in a separate session:
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_types_service_id ON public.ticket_types (service_id);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
  ON public.order_items (order_id);

CREATE INDEX IF NOT EXISTS idx_ticket_types_service_id
  ON public.ticket_types (service_id);
