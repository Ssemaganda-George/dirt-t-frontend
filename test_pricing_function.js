import { calculatePaymentForAmount } from './src/lib/pricingService';

async function testPricing() {
  try {
    console.log('Testing pricing calculation for super-custom-van...');
    const result = await calculatePaymentForAmount('af4fe88f-03b4-49e7-8f55-8f513e55dd9b', 150000);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

testPricing();