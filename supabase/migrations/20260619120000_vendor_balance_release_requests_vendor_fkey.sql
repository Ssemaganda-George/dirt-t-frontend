-- PostgREST needs a declared FK to embed vendor:vendors(...) in admin release-request queries.

ALTER TABLE public.vendor_balance_release_requests
  DROP CONSTRAINT IF EXISTS vendor_balance_release_requests_vendor_id_fkey;

ALTER TABLE public.vendor_balance_release_requests
  ADD CONSTRAINT vendor_balance_release_requests_vendor_id_fkey
  FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;
