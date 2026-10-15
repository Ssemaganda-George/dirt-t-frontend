-- 20260820120000_commercialization_tree_credits_carbon_offsets.sql
-- Commercialization layer for the tree map:
--   * Extends the existing company_subscriptions table with owner/contact/quota fields
--   * pricing_catalogue    — admin-tunable SKU pricing (tree credits + carbon offsets)
--   * tree_credit_batches  — bulk per-tree credit purchases (each credit = 1 planted tree)
--   * credit_consumptions  — every time a credit is burned (plant/verify/monitor/report)
--   * carbon_offset_orders — verified-tonne offset purchases
--   * carbon_ledger        — issuance / retirement ledger for audit + ESG reporting
--   * api_usage_log        — API call metering for billing / rate limiting
--
-- NOTE: public.trees already carries `company_id text` and `verification_status text`
-- from an earlier migration, so we only add the remaining monitoring columns here.
-- Companies are identified by name (text) to match that existing convention.

-- ── Extend company_subscriptions (owner, contact, quota tracking) ────────────
ALTER TABLE public.company_subscriptions
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS api_calls_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quota_reset_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS billing_email text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_company_subs_owner ON public.company_subscriptions (owner_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_subs_api_key ON public.company_subscriptions (api_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_subs_name_lower ON public.company_subscriptions (lower(company_name));
CREATE INDEX IF NOT EXISTS idx_company_subs_status ON public.company_subscriptions (status);

-- ── Pricing catalogue (admin-tunable) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS pricing_catalogue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  unit text NOT NULL DEFAULT 'credit',
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  min_quantity integer NOT NULL DEFAULT 1,
  max_quantity integer,
  active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Bulk tree credits: volume discounts. Each credit maps to one planted tree.
INSERT INTO pricing_catalogue (sku, name, description, unit, amount, currency, min_quantity) VALUES
  ('tree_credit_starter',  'Tree Credits — Starter',  'Per-tree credits for verified planting. 1 credit = 1 tree.',  'credit', 0.75, 'USD', 1),
  ('tree_credit_growth',   'Tree Credits — Growth',   'Volume tier for 1k+ trees with verification + map widget.', 'credit', 0.55, 'USD', 1000),
  ('tree_credit_enterprise','Tree Credits — Enterprise', 'Volume tier for 10k+ trees, white-label API + CSV export.', 'credit', 0.35, 'USD', 10000)
ON CONFLICT (sku) DO NOTHING;

-- Verified carbon offsets priced per tonne CO2e (conservative 10-yr vintage).
INSERT INTO pricing_catalogue (sku, name, description, unit, amount, currency, min_quantity) VALUES
  ('carbon_offset_tonne',      'Verified Carbon Offset — per tonne', 'Retired tonnes CO2e with certificate + tracking link.', 'tonne_co2e', 14.00, 'USD', 1),
  ('carbon_offset_tonne_bulk', 'Verified Carbon Offset — bulk (50t+)', 'Volume priced verified tonnes with audit trail.',     'tonne_co2e', 11.50, 'USD', 50)
ON CONFLICT (sku) DO NOTHING;

-- ── Tree credit batches (bulk purchases) ────────────────────────────────────
-- company_id is TEXT and holds company_subscriptions.company_name.
CREATE TABLE IF NOT EXISTS tree_credit_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL,
  sku text NOT NULL,
  credits_purchased integer NOT NULL CHECK (credits_purchased > 0),
  credits_remaining integer NOT NULL CHECK (credits_remaining >= 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  total_amount numeric NOT NULL CHECK (total_amount >= 0),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded','expired')),
  payment_id uuid,
  reference text UNIQUE,
  expires_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tree_credit_batches_company ON tree_credit_batches (company_id);
CREATE INDEX IF NOT EXISTS idx_tree_credit_batches_status ON tree_credit_batches (status);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tree_credit_batches_pricing') THEN
    ALTER TABLE tree_credit_batches
      ADD CONSTRAINT fk_tree_credit_batches_pricing FOREIGN KEY (sku) REFERENCES pricing_catalogue(sku);
  END IF;
END $$;

-- ── Credit consumption ledger (immutable audit trail) ───────────────────────
CREATE TABLE IF NOT EXISTS credit_consumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid,
  company_id text NOT NULL,
  tree_id uuid,
  action text NOT NULL CHECK (action IN ('plant','verify','monitor','report')),
  credits integer NOT NULL DEFAULT 1 CHECK (credits > 0),
  unit_price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  note text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_consumptions_company ON credit_consumptions (company_id);
CREATE INDEX IF NOT EXISTS idx_credit_consumptions_tree ON credit_consumptions (tree_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_credit_consumptions_batch') THEN
    ALTER TABLE credit_consumptions
      ADD CONSTRAINT fk_credit_consumptions_batch FOREIGN KEY (batch_id) REFERENCES tree_credit_batches(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_credit_consumptions_tree') THEN
    ALTER TABLE credit_consumptions
      ADD CONSTRAINT fk_credit_consumptions_tree FOREIGN KEY (tree_id) REFERENCES public.trees(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── Carbon offset orders (verified tonnes) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS carbon_offset_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text,
  buyer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_email text,
  sku text NOT NULL,
  tonnes_co2e numeric NOT NULL CHECK (tonnes_co2e > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  total_amount numeric NOT NULL CHECK (total_amount >= 0),
  currency text NOT NULL DEFAULT 'USD',
  trees_equivalent integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','retired','failed','refunded')),
  payment_id uuid,
  reference text UNIQUE,
  certificate_number text UNIQUE,
  certificate_url text,
  project_description text,
  retired_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_carbon_offset_orders_company ON carbon_offset_orders (company_id);
CREATE INDEX IF NOT EXISTS idx_carbon_offset_orders_status ON carbon_offset_orders (status);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_carbon_offset_orders_pricing') THEN
    ALTER TABLE carbon_offset_orders
      ADD CONSTRAINT fk_carbon_offset_orders_pricing FOREIGN KEY (sku) REFERENCES pricing_catalogue(sku);
  END IF;
END $$;

-- ── Carbon ledger (issuance + retirement audit trail) ───────────────────────
CREATE TABLE IF NOT EXISTS carbon_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  company_id text,
  entry_type text NOT NULL CHECK (entry_type IN ('issued','retired','adjusted')),
  tonnes_co2e numeric NOT NULL,
  balance_after numeric NOT NULL DEFAULT 0,
  reference text,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_carbon_ledger_order ON carbon_ledger (order_id);
CREATE INDEX IF NOT EXISTS idx_carbon_ledger_company ON carbon_ledger (company_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_carbon_ledger_order') THEN
    ALTER TABLE carbon_ledger
      ADD CONSTRAINT fk_carbon_ledger_order FOREIGN KEY (order_id) REFERENCES carbon_offset_orders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── API usage log (billing + rate limiting) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS api_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text,
  endpoint text NOT NULL,
  method text NOT NULL DEFAULT 'GET',
  status_code integer,
  response_ms integer,
  billable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_company_created ON api_usage_log (company_id, created_at DESC);

-- ── Extend public.trees with monitoring fields ──────────────────────────────
-- company_id (text) and verification_status (text) already exist upstream.
ALTER TABLE IF EXISTS public.trees
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS height_cm numeric,
  ADD COLUMN IF NOT EXISTS health text,
  ADD COLUMN IF NOT EXISTS last_monitored_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_trees_company_id ON public.trees (company_id);

-- Guarded so re-running this migration on a DB that already has the
-- constraints (or already-constrained columns) is a no-op.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_trees_verification_status') THEN
    ALTER TABLE public.trees DROP CONSTRAINT IF EXISTS trees_verification_status_check;
    ALTER TABLE public.trees ADD CONSTRAINT chk_trees_verification_status
      CHECK (verification_status IS NULL OR verification_status IN ('pending','verified','rejected'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_trees_health') THEN
    ALTER TABLE public.trees ADD CONSTRAINT chk_trees_health
      CHECK (health IS NULL OR health IN ('healthy','stressed','dying','dead'));
  END IF;
END $$;

-- ── Helpers ─────────────────────────────────────────────────────────────────

-- Generate a stable, human-friendly API key: dt_live_<36 hex>
CREATE OR REPLACE FUNCTION generate_company_api_key()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'dt_live_' || encode(gen_random_bytes(18), 'hex');
END;
$$;

-- Atomically burn credits from the oldest paid batch(es) for a company.
-- Companies are keyed by name (text). Returns total credits burned.
CREATE OR REPLACE FUNCTION consume_tree_credits(
  p_company_id text,
  p_credits integer,
  p_tree_id uuid DEFAULT NULL,
  p_action text DEFAULT 'plant',
  p_note text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  remaining integer := p_credits;
  batch record;
  take integer;
  burned integer := 0;
BEGIN
  IF remaining <= 0 THEN
    RAISE EXCEPTION 'credits must be positive';
  END IF;

  FOR batch IN
    SELECT * FROM tree_credit_batches
    WHERE company_id = p_company_id
      AND status = 'paid'
      AND credits_remaining > 0
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY created_at ASC
  LOOP
    EXIT WHEN remaining <= 0;
    take := LEAST(batch.credits_remaining, remaining);
    UPDATE tree_credit_batches
      SET credits_remaining = credits_remaining - take,
          updated_at = now()
      WHERE id = batch.id;

    INSERT INTO credit_consumptions (batch_id, company_id, tree_id, action, credits, unit_price, currency, note)
    VALUES (batch.id, p_company_id, p_tree_id, p_action, take, batch.unit_price, batch.currency, p_note);

    remaining := remaining - take;
    burned := burned + take;
  END LOOP;

  IF burned < p_credits THEN
    RAISE EXCEPTION 'insufficient tree credits: needed %, available %', p_credits, burned;
  END IF;

  RETURN burned;
END;
$$;

-- Aggregate carbon / credit stats for a company within an optional date range.
-- p_company_id is company_subscriptions.company_name (text) and matches trees.company_id.
CREATE OR REPLACE FUNCTION company_carbon_stats(p_company_id text, p_from date DEFAULT NULL, p_to date DEFAULT NULL)
RETURNS TABLE (
  total_trees bigint,
  total_tonnes_retired numeric,
  credits_purchased bigint,
  credits_remaining bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    (SELECT count(*) FROM public.trees t
      WHERE t.company_id = p_company_id
        AND (p_from IS NULL OR t.created_at::date >= p_from)
        AND (p_to IS NULL OR t.created_at::date <= p_to))::bigint,
    (SELECT COALESCE(sum(o.tonnes_co2e), 0) FROM carbon_offset_orders o
      WHERE o.company_id = p_company_id
        AND o.status IN ('paid','retired')
        AND (p_from IS NULL OR o.created_at::date >= p_from)
        AND (p_to IS NULL OR o.created_at::date <= p_to)),
    (SELECT COALESCE(sum(b.credits_purchased), 0) FROM tree_credit_batches b
      WHERE b.company_id = p_company_id AND b.status = 'paid'),
    (SELECT COALESCE(sum(b.credits_remaining), 0) FROM tree_credit_batches b
      WHERE b.company_id = p_company_id AND b.status = 'paid');
$$;

-- ── Row level security ──────────────────────────────────────────────────────
ALTER TABLE pricing_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE tree_credit_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_consumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_offset_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_log ENABLE ROW LEVEL SECURITY;

-- Pricing is publicly readable so store pages render without auth.
DROP POLICY IF EXISTS pricing_catalogue_public_read ON pricing_catalogue;
CREATE POLICY pricing_catalogue_public_read ON pricing_catalogue
  FOR SELECT USING (active = true);

-- Company owners read their own purchases.
DROP POLICY IF EXISTS tree_credit_batches_owner_read ON tree_credit_batches;
CREATE POLICY tree_credit_batches_owner_read ON tree_credit_batches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM company_subscriptions c
      WHERE c.company_name = tree_credit_batches.company_id
        AND c.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS credit_consumptions_owner_read ON credit_consumptions;
CREATE POLICY credit_consumptions_owner_read ON credit_consumptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM company_subscriptions c
      WHERE c.company_name = credit_consumptions.company_id
        AND c.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS carbon_offset_orders_buyer_read ON carbon_offset_orders;
CREATE POLICY carbon_offset_orders_buyer_read ON carbon_offset_orders
  FOR SELECT USING (
    buyer_user_id = auth.uid() OR
    (company_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM company_subscriptions c
      WHERE c.company_name = carbon_offset_orders.company_id
        AND c.owner_user_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS carbon_ledger_owner_read ON carbon_ledger;
CREATE POLICY carbon_ledger_owner_read ON carbon_ledger
  FOR SELECT USING (
    company_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM company_subscriptions c
      WHERE c.company_name = carbon_ledger.company_id
        AND c.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS api_usage_owner_read ON api_usage_log;
CREATE POLICY api_usage_owner_read ON api_usage_log
  FOR SELECT USING (
    company_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM company_subscriptions c
      WHERE c.company_name = api_usage_log.company_id
        AND c.owner_user_id = auth.uid()
    )
  );

-- Company subscriptions: owners read/update their own row (guard for a policy
-- that may already exist from an earlier migration).
DROP POLICY IF EXISTS company_subscriptions_owner_read ON company_subscriptions;
CREATE POLICY company_subscriptions_owner_read ON company_subscriptions
  FOR SELECT USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS company_subscriptions_owner_update ON company_subscriptions;
CREATE POLICY company_subscriptions_owner_update ON company_subscriptions
  FOR UPDATE USING (owner_user_id = auth.uid());

-- Service role bypasses RLS, so all edge-function writes stay intact.
