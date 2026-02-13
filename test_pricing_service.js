import { calculatePayment, getPricingPreview } from './src/lib/pricingService.ts';

async function testPricingService() {
  console.log('Testing Pricing Service...\n');

  // Test with a sample service ID (you'll need to replace with actual service ID)
  const testServiceId = 'sample-service-id';

  try {
    // Test payment calculation
    console.log('1. Testing payment calculation...');
    const calculation = await calculatePayment(testServiceId);

    if (calculation.success) {
      console.log('✅ Payment calculation successful:');
      console.log(`   Base Price: $${calculation.base_price}`);
      console.log(`   Platform Fee: $${calculation.platform_fee}`);
      console.log(`   Vendor Payout: $${calculation.vendor_payout}`);
      console.log(`   Total Customer Payment: $${calculation.total_customer_payment}`);
      console.log(`   Fee Payer: ${calculation.fee_payer}`);
      console.log(`   Pricing Source: ${calculation.pricing_source}`);
      console.log(`   Reference ID: ${calculation.pricing_reference_id}`);
    } else {
      console.log('❌ Payment calculation failed:', calculation.error);
    }

    // Test pricing preview
    console.log('\n2. Testing pricing preview...');
    const preview = await getPricingPreview(testServiceId);
    console.log('✅ Pricing preview:');
    console.log(`   Base Price: $${preview.base_price}`);
    console.log(`   Platform Fee: $${preview.platform_fee}`);
    console.log(`   Vendor Payout: $${preview.vendor_payout}`);
    console.log(`   Total Customer Payment: $${preview.total_customer_payment}`);
    console.log(`   Fee Payer: ${preview.fee_payer}`);
    console.log(`   Applied Rule: ${preview.applied_rule}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPricingService();