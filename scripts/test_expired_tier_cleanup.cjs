#!/usr/bin/env node

/**
 * Test script to verify expired manual tier cleanup
 * This script creates a test vendor with an expired manual tier and runs cleanup
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function createTestExpiredTier() {
  console.log('Creating test vendor with expired manual tier...');

  try {
    // First, get an existing vendor to modify
    const { data: vendors, error: vendorError } = await supabase
      .from('vendors')
      .select('id, business_name')
      .limit(1);

    if (vendorError || !vendors || vendors.length === 0) {
      console.error('No vendors found to test with');
      return null;
    }

    const testVendor = vendors[0];
    console.log(`Using vendor: ${testVendor.business_name} (${testVendor.id})`);

    // Get a tier to assign as manual tier
    const { data: tiers, error: tierError } = await supabase
      .from('vendor_tiers')
      .select('id, name')
      .eq('is_active', true)
      .limit(1);

    if (tierError || !tiers || tiers.length === 0) {
      console.error('No active tiers found');
      return null;
    }

    const testTier = tiers[0];
    console.log(`Using tier: ${testTier.name} (${testTier.id})`);

    // Set an expired manual tier (expired yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { error: updateError } = await supabase
      .from('vendors')
      .update({
        manual_tier_id: testTier.id,
        manual_tier_expires_at: yesterday.toISOString()
      })
      .eq('id', testVendor.id);

    if (updateError) {
      console.error('Failed to set expired manual tier:', updateError);
      return null;
    }

    console.log('Successfully set expired manual tier for testing');
    return testVendor.id;

  } catch (error) {
    console.error('Error creating test expired tier:', error);
    return null;
  }
}

async function verifyCleanup(vendorId) {
  console.log('Verifying cleanup results...');

  const { data: vendor, error } = await supabase
    .from('vendors')
    .select('id, business_name, manual_tier_id, manual_tier_expires_at, current_tier_id')
    .eq('id', vendorId)
    .single();

  if (error) {
    console.error('Error fetching vendor:', error);
    return;
  }

  console.log('Vendor after cleanup:');
  console.log(`- Manual Tier ID: ${vendor.manual_tier_id || 'None'}`);
  console.log(`- Manual Tier Expires: ${vendor.manual_tier_expires_at || 'None'}`);
  console.log(`- Current Tier ID: ${vendor.current_tier_id}`);

  if (!vendor.manual_tier_id && !vendor.manual_tier_expires_at) {
    console.log('✅ Cleanup successful - manual tier fields cleared');
  } else {
    console.log('❌ Cleanup failed - manual tier fields still present');
  }
}

async function main() {
  console.log('Testing expired manual tier cleanup...\n');

  // Create test expired tier
  const vendorId = await createTestExpiredTier();
  if (!vendorId) {
    console.error('Failed to create test data');
    process.exit(1);
  }

  console.log('\nRunning cleanup script...\n');

  // Run the cleanup script
  const { spawn } = require('child_process');
  const cleanupProcess = spawn('node', ['scripts/cleanup_expired_tiers.cjs'], {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  await new Promise((resolve, reject) => {
    cleanupProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Cleanup script exited with code ${code}`));
      }
    });
    cleanupProcess.on('error', reject);
  });

  console.log('\nVerifying cleanup results...\n');

  // Verify the cleanup worked
  await verifyCleanup(vendorId);

  console.log('\nTest completed!');
}

main().catch(console.error);