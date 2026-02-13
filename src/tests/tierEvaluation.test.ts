// Tier Evaluation Logic Validation Tests
// Run this file manually to validate tier assignment logic

import { isEligibleForTier } from '../lib/tierEvaluationService';
import { VendorTier } from '../types';

const mockTiers: VendorTier[] = [
  {
    id: 'bronze-id',
    name: 'Bronze',
    commission_rate: 0.15,
    min_monthly_bookings: 0,
    min_rating: undefined,
    priority_order: 1,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'silver-id',
    name: 'Silver',
    commission_rate: 0.12,
    min_monthly_bookings: 10,
    min_rating: 4.0,
    priority_order: 2,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'gold-id',
    name: 'Gold',
    commission_rate: 0.10,
    min_monthly_bookings: 25,
    min_rating: 4.5,
    priority_order: 3,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

// Test function
function runTests() {
  console.log('🧪 Running Tier Evaluation Logic Tests...\n');

  let passed = 0;
  let total = 0;

  function test(name: string, condition: boolean) {
    total++;
    if (condition) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name}`);
    }
  }

  // Test Bronze tier eligibility
  test('Bronze tier accepts vendors with no bookings', isEligibleForTier({ monthlyBookings: 0 }, mockTiers[0]));
  test('Bronze tier accepts vendors with low rating', isEligibleForTier({ monthlyBookings: 5, averageRating: 2.0 }, mockTiers[0]));

  // Test Silver tier eligibility
  test('Silver tier accepts qualified vendors', isEligibleForTier({ monthlyBookings: 15, averageRating: 4.2 }, mockTiers[1]));
  test('Silver tier rejects insufficient bookings', !isEligibleForTier({ monthlyBookings: 5, averageRating: 4.2 }, mockTiers[1]));
  test('Silver tier rejects insufficient rating', !isEligibleForTier({ monthlyBookings: 15, averageRating: 3.8 }, mockTiers[1]));

  // Test Gold tier eligibility
  test('Gold tier accepts excellent performers', isEligibleForTier({ monthlyBookings: 30, averageRating: 4.8 }, mockTiers[2]));
  test('Gold tier rejects insufficient bookings', !isEligibleForTier({ monthlyBookings: 20, averageRating: 4.8 }, mockTiers[2]));
  test('Gold tier rejects insufficient rating', !isEligibleForTier({ monthlyBookings: 30, averageRating: 4.2 }, mockTiers[2]));

  // Test tier assignment logic
  function getEligibleTier(metrics: { monthlyBookings: number; averageRating?: number }): VendorTier | null {
    for (const tier of mockTiers) {
      if (isEligibleForTier(metrics, tier)) {
        return tier;
      }
    }
    return null;
  }

  test('Highest eligible tier assigned - Gold for excellent performance',
    getEligibleTier({ monthlyBookings: 30, averageRating: 4.8 })?.name === 'Gold'
  );
  test('Silver assigned when Gold requirements not met',
    getEligibleTier({ monthlyBookings: 20, averageRating: 4.2 })?.name === 'Silver'
  );
  test('Bronze assigned as fallback',
    getEligibleTier({ monthlyBookings: 0, averageRating: 1.0 })?.name === 'Bronze'
  );

  // Test commission calculations
  function calculateCommission(servicePrice: number, rate: number) {
    return {
      commissionAmount: servicePrice * rate,
      vendorPayout: servicePrice * (1 - rate)
    };
  }

  const calc1 = calculateCommission(100000, 0.15);
  test('Commission calculation - 15% of 100k = 15k', calc1.commissionAmount === 15000);
  test('Vendor payout calculation - 100k - 15k = 85k', calc1.vendorPayout === 85000);

  const calc2 = calculateCommission(200000, 0.12);
  test('Commission calculation - 12% of 200k = 24k', calc2.commissionAmount === 24000);
  test('Vendor payout calculation - 200k - 24k = 176k', calc2.vendorPayout === 176000);

  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Please review the logic.');
  }
}

// Export for manual testing
export { runTests };

// Auto-run if this file is executed directly
if (typeof window === 'undefined') {
  runTests();
}