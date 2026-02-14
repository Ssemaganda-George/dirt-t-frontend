const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testPricingCalculation() {
  try {
    console.log('Testing pricing calculation for super-custom-van...');

    // Find the service
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, price, vendor_id, slug')
      .eq('slug', 'super-custom-van')
      .single();

    if (serviceError || !service) {
      console.log('Service not found:', serviceError);
      return;
    }

    console.log('Service found:', {
      id: service.id,
      slug: service.slug,
      price: service.price,
      vendor_id: service.vendor_id
    });

    // Test the pricing calculation
    const basePrice = 100; // Test with $100
    console.log(`\nTesting pricing calculation for base price: $${basePrice}`);

    // Check for override
    const { data: override, error: overrideError } = await supabase
      .from('service_pricing_overrides')
      .select('*')
      .eq('service_id', service.id)
      .eq('override_enabled', true)
      .lte('effective_from', new Date().toISOString())
      .or(`effective_until.is.null,effective_until.gte.${new Date().toISOString()}`)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log('\nOverride check result:');
    if (override) {
      console.log('Override found:', {
        id: override.id,
        service_id: override.service_id,
        override_enabled: override.override_enabled,
        override_type: override.override_type,
        override_value: override.override_value,
        fee_payer: override.fee_payer,
        tourist_percentage: override.tourist_percentage,
        vendor_percentage: override.vendor_percentage
      });
    } else {
      console.log('No override found, overrideError:', overrideError);
    }

    // Check vendor tier
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('current_tier_id')
      .eq('id', service.vendor_id)
      .single();

    console.log('\nVendor tier check:');
    if (vendor && vendor.current_tier_id) {
      console.log('Vendor has tier:', vendor.current_tier_id);

      const { data: tierData, error: tierError } = await supabase
        .from('pricing_tiers')
        .select('id, name, commission_type, commission_value')
        .eq('id', vendor.current_tier_id)
        .eq('is_active', true)
        .single();

      if (tierData) {
        console.log('Tier data:', tierData);
      } else {
        console.log('Tier lookup error:', tierError);
      }
    } else {
      console.log('Vendor has no tier or vendor lookup error:', vendorError);
    }

    // Test the actual calculation function
    console.log('\nTesting calculatePaymentForAmount function...');
    const { calculatePaymentForAmount } = require('./src/lib/pricingService.ts');

    // Since it's TypeScript, let's call it directly
    const result = await calculatePaymentForAmount(service.id, basePrice);
    console.log('Calculation result:', result);

  } catch (err) {
    console.error('Test error:', err);
  }
}

testPricingCalculation();