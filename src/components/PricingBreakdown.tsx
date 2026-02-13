import { useState, useEffect } from 'react';
import { getPricingPreview, PricingPreview } from '../lib/pricingService';

interface PricingBreakdownProps {
  serviceId: string;
  quantity?: number;
  className?: string;
}

export default function PricingBreakdown({ serviceId, quantity = 1, className = '' }: PricingBreakdownProps) {
  const [pricing, setPricing] = useState<PricingPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPricing();
  }, [serviceId]);

  const loadPricing = async () => {
    try {
      setLoading(true);
      setError(null);
      const preview = await getPricingPreview(serviceId);
      setPricing(preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pricing');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (error || !pricing) {
    return (
      <div className={`text-red-600 text-sm ${className}`}>
        {error || 'Unable to load pricing information'}
      </div>
    );
  }

  const totalBasePrice = pricing.base_price * quantity;
  const totalPlatformFee = pricing.platform_fee * quantity;
  const totalTouristFee = pricing.tourist_fee * quantity;
  const totalVendorFee = pricing.vendor_fee * quantity;
  const totalCustomerPayment = pricing.total_customer_payment * quantity;
  const totalVendorPayout = pricing.vendor_payout * quantity;

  return (
    <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-3 text-gray-900">Pricing Breakdown</h3>

      <div className="space-y-2">
        {/* Base Price */}
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Service Price</span>
          <span className="font-medium">${totalBasePrice.toFixed(2)}</span>
        </div>

        {/* Platform Fee Breakdown */}
        {pricing.fee_payer === 'shared' ? (
          <>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">
                Your Share
                <span className="text-xs text-gray-500 ml-1">(platform fee portion)</span>
              </span>
              <span className="font-medium text-red-600">+${totalTouristFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>Vendor's Share (platform fee portion)</span>
              <span>-${totalVendorFee.toFixed(2)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between items-center">
            <span className="text-gray-700">
              Platform Fee
              <span className="text-xs text-gray-500 ml-1">
                ({pricing.fee_payer === 'tourist' ? 'paid by you' : 'paid by vendor'})
              </span>
            </span>
            <span className={`font-medium ${pricing.fee_payer === 'tourist' ? 'text-red-600' : 'text-green-600'}`}>
              {pricing.fee_payer === 'tourist' ? '+' : '-'}${totalPlatformFee.toFixed(2)}
            </span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-200 my-2"></div>

        {/* Total Customer Payment */}
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-gray-900">Total to Pay</span>
          <span className="text-lg font-bold text-gray-900">${totalCustomerPayment.toFixed(2)}</span>
        </div>

        {/* Vendor Payout */}
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>Vendor Receives</span>
          <span>${totalVendorPayout.toFixed(2)}</span>
        </div>

        {/* Applied Rule */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            <span className="font-medium">Applied Rule:</span> {pricing.applied_rule}
          </div>
        </div>

        {/* Quantity indicator */}
        {quantity > 1 && (
          <div className="text-xs text-gray-500 mt-2">
            Quantity: {quantity}
          </div>
        )}
      </div>
    </div>
  );
}

// Compact version for smaller spaces
export function CompactPricingBreakdown({ serviceId, quantity = 1, className = '' }: PricingBreakdownProps) {
  const [pricing, setPricing] = useState<PricingPreview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPricing();
  }, [serviceId]);

  const loadPricing = async () => {
    try {
      setLoading(true);
      const preview = await getPricingPreview(serviceId);
      setPricing(preview);
    } catch (err) {
      console.error('Failed to load pricing:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !pricing) {
    return <div className={`text-gray-500 text-sm ${className}`}>Loading pricing...</div>;
  }

  const totalCustomerPayment = pricing.total_customer_payment * quantity;

  return (
    <div className={`text-sm ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-gray-700">Total Price:</span>
        <span className="font-semibold text-gray-900">${totalCustomerPayment.toFixed(2)}</span>
      </div>
      <div className="text-xs text-gray-500 mt-1">
        Includes ${pricing.platform_fee.toFixed(2)} platform fee ({pricing.fee_payer === 'tourist' ? 'paid by you' : 'covered by vendor'})
      </div>
    </div>
  );
}