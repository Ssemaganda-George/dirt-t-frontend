-- Run this migration in Supabase SQL Editor to create tourist wallets
-- This creates tables for managing tourist wallet balances and transactions

-- ============================================================================
-- Step 1: Create tourist_wallets table
-- ============================================================================
CREATE TABLE IF NOT EXISTS tourist_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tourist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'UGX',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Each tourist can only have one wallet per currency
  CONSTRAINT unique_tourist_currency UNIQUE (tourist_id, currency),
  -- Balance cannot be negative
  CONSTRAINT positive_balance CHECK (balance >= 0)
);

-- Index for fast lookups by tourist
CREATE INDEX IF NOT EXISTS idx_tourist_wallets_tourist_id ON tourist_wallets(tourist_id);

-- Comment on table
COMMENT ON TABLE tourist_wallets IS 'Stores wallet balances for tourists';

-- ============================================================================
-- Step 2: Create wallet_transactions table
-- ============================================================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES tourist_wallets(id) ON DELETE CASCADE,
  tourist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Transaction details
  amount NUMERIC(12, 2) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'payment', 'refund')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  
  -- Payment details
  payment_method TEXT CHECK (payment_method IN ('mobile_money', 'card', 'bank_transfer', 'wallet')),
  payment_reference TEXT,
  payment_provider TEXT, -- 'MTN', 'Airtel', etc.
  phone_number TEXT,
  
  -- Optional references (NULL for standalone deposits)
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  
  -- Metadata
  description TEXT,
  note TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Amount must be positive
  CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_tourist_id ON wallet_transactions(tourist_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_payment_reference ON wallet_transactions(payment_reference) WHERE payment_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);

-- Comment on table
COMMENT ON TABLE wallet_transactions IS 'Records all wallet deposits, withdrawals, and payments';

-- ============================================================================
-- Step 3: Create function to auto-update wallet balance
-- ============================================================================
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update balance when transaction completes
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    IF NEW.transaction_type IN ('deposit', 'refund') THEN
      -- Add to balance
      UPDATE tourist_wallets 
      SET balance = balance + NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.wallet_id;
    ELSIF NEW.transaction_type IN ('withdrawal', 'payment') THEN
      -- Subtract from balance
      UPDATE tourist_wallets 
      SET balance = balance - NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.wallet_id;
    END IF;
    
    -- Set completed timestamp
    NEW.completed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_wallet_balance ON wallet_transactions;
CREATE TRIGGER trigger_update_wallet_balance
  BEFORE INSERT OR UPDATE ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_balance();

-- ============================================================================
-- Step 4: Create function to get or create wallet for tourist
-- ============================================================================
CREATE OR REPLACE FUNCTION get_or_create_wallet(p_tourist_id UUID, p_currency TEXT DEFAULT 'UGX')
RETURNS UUID AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  -- Try to find existing wallet
  SELECT id INTO v_wallet_id
  FROM tourist_wallets
  WHERE tourist_id = p_tourist_id AND currency = p_currency;
  
  -- Create if not exists
  IF v_wallet_id IS NULL THEN
    INSERT INTO tourist_wallets (tourist_id, currency)
    VALUES (p_tourist_id, p_currency)
    RETURNING id INTO v_wallet_id;
  END IF;
  
  RETURN v_wallet_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Step 5: Create function to deposit funds
-- ============================================================================
CREATE OR REPLACE FUNCTION deposit_to_wallet(
  p_tourist_id UUID,
  p_amount NUMERIC,
  p_currency TEXT DEFAULT 'UGX',
  p_payment_method TEXT DEFAULT 'mobile_money',
  p_payment_reference TEXT DEFAULT NULL,
  p_payment_provider TEXT DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL,
  p_description TEXT DEFAULT 'Wallet top-up',
  p_note TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_wallet_id UUID;
  v_transaction_id UUID;
BEGIN
  -- Get or create wallet
  v_wallet_id := get_or_create_wallet(p_tourist_id, p_currency);
  
  -- Create pending transaction
  INSERT INTO wallet_transactions (
    wallet_id,
    tourist_id,
    amount,
    transaction_type,
    status,
    payment_method,
    payment_reference,
    payment_provider,
    phone_number,
    description,
    note
  ) VALUES (
    v_wallet_id,
    p_tourist_id,
    p_amount,
    'deposit',
    'pending',
    p_payment_method,
    p_payment_reference,
    p_payment_provider,
    p_phone_number,
    p_description,
    p_note
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Step 6: Create function to complete a deposit
-- ============================================================================
CREATE OR REPLACE FUNCTION complete_wallet_deposit(p_transaction_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE wallet_transactions
  SET status = 'completed'
  WHERE id = p_transaction_id AND status = 'pending';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Step 7: Create function to pay from wallet
-- ============================================================================
CREATE OR REPLACE FUNCTION pay_from_wallet(
  p_tourist_id UUID,
  p_amount NUMERIC,
  p_currency TEXT DEFAULT 'UGX',
  p_order_id UUID DEFAULT NULL,
  p_booking_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT 'Payment from wallet'
)
RETURNS UUID AS $$
DECLARE
  v_wallet_id UUID;
  v_balance NUMERIC;
  v_transaction_id UUID;
BEGIN
  -- Get wallet
  SELECT id, balance INTO v_wallet_id, v_balance
  FROM tourist_wallets
  WHERE tourist_id = p_tourist_id AND currency = p_currency;
  
  -- Check wallet exists
  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'No wallet found for tourist';
  END IF;
  
  -- Check sufficient balance
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Available: %, Required: %', v_balance, p_amount;
  END IF;
  
  -- Create and complete payment transaction
  INSERT INTO wallet_transactions (
    wallet_id,
    tourist_id,
    amount,
    transaction_type,
    status,
    payment_method,
    order_id,
    booking_id,
    description
  ) VALUES (
    v_wallet_id,
    p_tourist_id,
    p_amount,
    'payment',
    'completed',
    'wallet',
    p_order_id,
    p_booking_id,
    p_description
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Step 8: Enable RLS
-- ============================================================================
ALTER TABLE tourist_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Tourists can view their own wallets
CREATE POLICY "Tourists can view own wallet"
  ON tourist_wallets FOR SELECT
  USING (tourist_id = auth.uid());

-- Tourists can view their own transactions
CREATE POLICY "Tourists can view own transactions"
  ON wallet_transactions FOR SELECT
  USING (tourist_id = auth.uid());

-- Service role can do everything (for backend operations)
CREATE POLICY "Service role full access to wallets"
  ON tourist_wallets FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to transactions"
  ON wallet_transactions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Admins can view all wallets and transactions
CREATE POLICY "Admins can view all wallets"
  ON tourist_wallets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all transactions"
  ON wallet_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- Step 9: Create view for easy wallet balance lookup
-- ============================================================================
CREATE OR REPLACE VIEW tourist_wallet_summary AS
SELECT 
  tw.id AS wallet_id,
  tw.tourist_id,
  p.full_name AS tourist_name,
  p.email AS tourist_email,
  tw.balance,
  tw.currency,
  tw.is_active,
  tw.created_at,
  tw.updated_at,
  (
    SELECT COUNT(*) 
    FROM wallet_transactions wt 
    WHERE wt.wallet_id = tw.id AND wt.status = 'completed'
  ) AS total_transactions,
  (
    SELECT COALESCE(SUM(amount), 0) 
    FROM wallet_transactions wt 
    WHERE wt.wallet_id = tw.id 
      AND wt.transaction_type = 'deposit' 
      AND wt.status = 'completed'
  ) AS total_deposited,
  (
    SELECT COALESCE(SUM(amount), 0) 
    FROM wallet_transactions wt 
    WHERE wt.wallet_id = tw.id 
      AND wt.transaction_type IN ('payment', 'withdrawal') 
      AND wt.status = 'completed'
  ) AS total_spent
FROM tourist_wallets tw
JOIN profiles p ON p.id = tw.tourist_id;

-- ============================================================================
-- Verification queries
-- ============================================================================
SELECT 
  'tourist_wallets' as table_check,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'tourist_wallets'
  ) as exists;

SELECT 
  'wallet_transactions' as table_check,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'wallet_transactions'
  ) as exists;

SELECT 
  'get_or_create_wallet function' as function_check,
  EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_or_create_wallet'
  ) as exists;

SELECT 
  'deposit_to_wallet function' as function_check,
  EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'deposit_to_wallet'
  ) as exists;

SELECT 
  'pay_from_wallet function' as function_check,
  EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'pay_from_wallet'
  ) as exists;
