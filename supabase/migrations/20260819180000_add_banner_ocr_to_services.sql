-- Cache OCR'd text extracted from a service's banner/listing image (e.g. day-by-day
-- itinerary, inclusions, meeting point printed on a poster image) so the trip-planner
-- prompt can be informed by details that only exist as text baked into an image, not
-- in the structured itinerary/tour_highlights columns.
-- Populated by the scan-service-banner edge function (service role), never written
-- to directly by clients.
alter table public.services
  add column if not exists banner_ocr_text text,
  add column if not exists banner_ocr_updated_at timestamptz;
