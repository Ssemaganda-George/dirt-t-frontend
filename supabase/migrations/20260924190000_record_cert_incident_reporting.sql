ALTER TABLE public.data_breach_incidents
  ADD COLUMN cert_reported_at timestamptz,
  ADD COLUMN cert_reference text,
  ADD CONSTRAINT cert_reporting_evidence CHECK (
    (cert_reported_at IS NULL AND cert_reference IS NULL) OR
    (cert_reported_at IS NOT NULL AND length(btrim(cert_reference)) >= 3)
  );
