const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Create service role client for admin operations
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupPricingSystem() {
  console.log('Setting up pricing system...');

  // Insert pricing tiers
  const { data: tiers, error: tiersError } = await supabase
    .from('pricing_tiers')
    .insert([
      {
        name: 'Bronze',
        commission_type: 'percentage',
        commission_value: 15,
        min_monthly_bookings: 0,
        min_rating: null,
        priority_order: 1,
        effective_from: '2024-01-01T00:00:00Z',
        is_active: true
      },
      {
        name: 'Silver',
        commission_type: 'percentage',
        commission_value: 12,
        min_monthly_bookings: 10,
        min_rating: 4.0,
        priority_order: 2,
        effective_from: '2024-01-01T00:00:00Z',
        is_active: true
      },
      {
        name: 'Gold',
        commission_type: 'percentage',
        commission_value: 10,
        min_monthly_bookings: 25,
        min_rating: 4.5,
        priority_order: 3,
        effective_from: '2024-01-01T00:00:00Z',
        is_active: true
      }
    ])
    .select();

  if (tiersError) {
    console.log('Error inserting tiers:', tiersError);
  } else {
    console.log('Inserted tiers:', tiers);
  }

  // Create a shared override for the Super Custom Van service
  const serviceId = 'af4fe88f-03b4-49e7-8f55-8f513e55dd9b'; // Super Custom Van

  const { data: override, error: overrideError } = await supabase
    .from('service_pricing_overrides')
    .insert({
      service_id: serviceId,
      override_enabled: true,
      override_type: 'percentage',
      override_value: 20, // 20% platform fee
      fee_payer: 'shared',
      tourist_percentage: 40, // Tourist pays 40% of the 20% = 8%
      vendor_percentage: 60,  // Vendor pays 60% of the 20% = 12%
      effective_from: new Date().toISOString(),
      created_by: 'system-setup'
    })
    .select();

  if (overrideError) {
    console.log('Error inserting override:', overrideError);
  } else {
    console.log('Inserted override:', override);
  }

  // Update vendor to use Bronze tier
  const { data: vendorUpdate, error: vendorError } = await supabase
    .from('vendors')
    .update({
      current_tier_id: tiers?.[0]?.id // Bronze tier
    })
    .eq('business_name', 'Dirt Trails S')
    .select();

  if (vendorError) {
    console.log('Error updating vendor:', vendorError);
  } else {
    console.log('Updated vendor:', vendorUpdate);
  }
}

async function testPricingForSuperCustomVan() {
  console.log('\n=== Testing pricing for super-custom-van (using admin client) ===');

  // Find the service
  const { data: service, error: serviceError } = await supabaseAdmin
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

  // Check for override
  const { data: override, error: overrideError } = await supabaseAdmin
    .from('service_pricing_overrides')
    .select('*')
    .eq('service_id', service.id)
    .eq('override_enabled', true)
    .lte('effective_from', new Date().toISOString())
    .or(`effective_until.is.null,effective_until.gte.${new Date().toISOString()}`)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log('\nOverride check:');
  if (override) {
    console.log('Override found:', {
      id: override.id,
      override_type: override.override_type,
      override_value: override.override_value,
      fee_payer: override.fee_payer,
      tourist_percentage: override.tourist_percentage,
      vendor_percentage: override.vendor_percentage
    });
  } else {
    console.log('No override found, error:', overrideError);
  }

  // Check vendor tier
  const { data: vendor, error: vendorError } = await supabaseAdmin
    .from('vendors')
    .select('current_tier_id')
    .eq('id', service.vendor_id)
    .single();

  console.log('\nVendor tier check:');
  if (vendor && vendor.current_tier_id) {
    console.log('Vendor tier ID:', vendor.current_tier_id);

    const { data: tierData, error: tierError } = await supabaseAdmin
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
    console.log('No vendor tier found, error:', vendorError);
  }
}

setupPricingSystem().then(() => {
  return testPricingForSuperCustomVan();
}).catch(console.error);