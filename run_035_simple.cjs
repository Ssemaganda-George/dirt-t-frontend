#!/usr/bin/env node
/**
 * Run migration 035: Flexible pricing system (simplified)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function executeSQL(sql) {
  const response = await fetch(`${supabaseUrl}/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SQL execution failed: ${errorText}`);
  }

  const result = await response.json();
  if (result.error) {
    throw new Error(`SQL error: ${JSON.stringify(result.error)}`);
  }

  return result;
}

async function runMigration() {
  console.log('🚀 Running migration 035: Flexible pricing system...');

  try {
    // Create pricing_tiers table
    console.log('Creating pricing_tiers table...');
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS public.pricing_tiers (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        name text NOT NULL,
        commission_type text NOT NULL CHECK (commission_type IN ('percentage', 'flat')),
        commission_value numeric NOT NULL CHECK (commission_value >= 0),
        min_monthly_bookings integer NOT NULL DEFAULT 0 CHECK (min_monthly_bookings >= 0),
        min_rating numeric(2,1) CHECK (min_rating >= 0 AND min_rating <= 5),
        priority_order integer NOT NULL CHECK (priority_order > 0),
        effective_from timestamp with time zone NOT NULL DEFAULT now(),
        effective_until timestamp with time zone,
        is_active boolean NOT NULL DEFAULT true,
        created_by uuid REFERENCES auth.users(id),
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL
      );
    `);

    // Create indexes
    console.log('Creating indexes for pricing_tiers...');
    await executeSQL(`
      CREATE INDEX IF NOT EXISTS idx_pricing_tiers_name_effective ON public.pricing_tiers(name, effective_from, effective_until);
      CREATE INDEX IF NOT EXISTS idx_pricing_tiers_active ON public.pricing_tiers(is_active, priority_order) WHERE is_active = true;
      CREATE INDEX IF NOT EXISTS idx_pricing_tiers_priority ON public.pricing_tiers(priority_order);
    `);

    // Enable RLS
    console.log('Enabling RLS for pricing_tiers...');
    await executeSQL(`ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;`);

    // Create service_pricing_overrides table
    console.log('Creating service_pricing_overrides table...');
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS public.service_pricing_overrides (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
        override_enabled boolean NOT NULL DEFAULT false,
        override_type text NOT NULL CHECK (override_type IN ('flat', 'percentage')),
        override_value numeric NOT NULL CHECK (override_value >= 0),
        fee_payer text NOT NULL CHECK (fee_payer IN ('vendor', 'tourist')),
        effective_from timestamp with time zone NOT NULL DEFAULT now(),
        effective_until timestamp with time zone,
        created_by uuid NOT NULL REFERENCES auth.users(id),
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL
      );
    `);

    // Create indexes for service overrides
    console.log('Creating indexes for service_pricing_overrides...');
    await executeSQL(`
      CREATE INDEX IF NOT EXISTS idx_service_overrides_service_id ON public.service_pricing_overrides(service_id);
      CREATE INDEX IF NOT EXISTS idx_service_overrides_effective ON public.service_pricing_overrides(service_id, effective_from, effective_until);
      CREATE INDEX IF NOT EXISTS idx_service_overrides_active ON public.service_pricing_overrides(service_id, effective_from, effective_until) WHERE override_enabled = true;
    `);

    // Enable RLS for service overrides
    console.log('Enabling RLS for service_pricing_overrides...');
    await executeSQL(`ALTER TABLE public.service_pricing_overrides ENABLE ROW LEVEL SECURITY;`);

    // Add columns to orders table
    console.log('Updating orders table...');
    await executeSQL(`
      ALTER TABLE public.orders
      ADD COLUMN IF NOT EXISTS pricing_source text CHECK (pricing_source IN ('tier', 'override')),
      ADD COLUMN IF NOT EXISTS pricing_reference_id uuid,
      ADD COLUMN IF NOT EXISTS base_price numeric,
      ADD COLUMN IF NOT EXISTS platform_fee numeric DEFAULT 0,
      ADD COLUMN IF NOT EXISTS vendor_payout numeric,
      ADD COLUMN IF NOT EXISTS fee_payer text CHECK (fee_payer IN ('vendor', 'tourist'));
    `);

    // Create indexes for orders
    console.log('Creating indexes for orders...');
    await executeSQL(`
      CREATE INDEX IF NOT EXISTS idx_orders_pricing_source ON public.orders(pricing_source);
      CREATE INDEX IF NOT EXISTS idx_orders_pricing_reference ON public.orders(pricing_reference_id);
    `);

    // Insert default pricing tiers
    console.log('Inserting default pricing tiers...');
    const supabase = createClient(supabaseUrl, serviceKey);
    const tiers = [
      { name: 'Bronze', commission_type: 'percentage', commission_value: 0.15, min_monthly_bookings: 0, min_rating: null, priority_order: 1, effective_from: '2024-01-01T00:00:00Z', is_active: true },
      { name: 'Silver', commission_type: 'percentage', commission_value: 0.12, min_monthly_bookings: 10, min_rating: 4.0, priority_order: 2, effective_from: '2024-01-01T00:00:00Z', is_active: true },
      { name: 'Gold', commission_type: 'percentage', commission_value: 0.10, min_monthly_bookings: 25, min_rating: 4.5, priority_order: 3, effective_from: '2024-01-01T00:00:00Z', is_active: true },
      { name: 'Platinum', commission_type: 'percentage', commission_value: 0.08, min_monthly_bookings: 50, min_rating: 4.8, priority_order: 4, effective_from: '2024-01-01T00:00:00Z', is_active: true }
    ];

    for (const tier of tiers) {
      const { error } = await supabase.from('pricing_tiers').insert(tier);
      if (error && !error.message.includes('duplicate key')) {
        console.error(`Error inserting tier ${tier.name}:`, error);
      } else {
        console.log(`Inserted tier: ${tier.name}`);
      }
    }

    console.log('✅ Migration 035 completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();