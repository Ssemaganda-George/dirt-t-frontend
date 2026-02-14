import { useState, useEffect } from 'react';
import { getPricingPreview, PricingPreview, getServicePricingOverrides, ServicePricingOverride } from '../lib/pricingService';
import { supabase } from '../lib/supabaseClient';

interface PricingBreakdownProps {
  serviceId: string;
  quantity?: number;
  refreshKey?: string | number;
  className?: string;
}

export default function PricingBreakdown({ serviceId, quantity = 1, refreshKey, className = '' }: PricingBreakdownProps) {
  const [pricing, setPricing] = useState<PricingPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRealtimeAt, setLastRealtimeAt] = useState<number | null>(null);
  const [overrideRows, setOverrideRows] = useState<ServicePricingOverride[] | null>(null);

  // Currency formatting function - always display in UGX
  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'UGX',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch (error) {
      return `UGX ${amount.toLocaleString()}`;
    }
  };

  useEffect(() => {
    loadPricing();

    // Subscribe to realtime changes on service_pricing_overrides for this service
    // so admin edits (create/update/delete) are reflected in the UI immediately.
    let channel: any = null;
    try {
      channel = supabase
        .channel(`pricing-overrides-${serviceId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'service_pricing_overrides', filter: `service_id=eq.${serviceId}` }, () => {
          // Mark that we received a realtime event and reload pricing
          try { setLastRealtimeAt(Date.now()); } catch (e) { /* ignore */ }
          loadPricing();
        })
        .subscribe();
    } catch (err) {
      // If realtime subscription fails, don't block the page — polling or manual refresh still works
      console.warn('Realtime pricing subscription failed:', err);
    }

    return () => {
      // Clean up subscription when component unmounts or serviceId changes
      if (channel) {
        try {
          // supabase v2 uses removeChannel
          // @ts-ignore
          supabase.removeChannel(channel);
        } catch (e) {
          try {
            // fallback to unsubscribe
            // @ts-ignore
            channel.unsubscribe();
          } catch (_) {
            // ignore
          }
        }
      }
    };
  }, [serviceId, refreshKey]);

  // Polling fallback: if we haven't received a realtime event recently, poll every 10s.
  useEffect(() => {
    const POLL_MS = 10_000;
    const STALE_MS = 12_000; // if no realtime within this window, consider stale and poll

    const id = setInterval(() => {
      const now = Date.now();
      const last = lastRealtimeAt ?? 0;
      if (last === 0 || now - last > STALE_MS) {
        // No recent realtime update — call loadPricing as a fallback
        loadPricing();
      }
    }, POLL_MS);

    return () => clearInterval(id);
  }, [lastRealtimeAt, serviceId, refreshKey]);

  const loadPricing = async () => {
    try {
      setLoading(true);
      setError(null);
      const preview = await getPricingPreview(serviceId);
      setPricing(preview);
      // Fetch raw overrides (for debug/verification) in dev mode
      try {
        const rows = await getServicePricingOverrides(serviceId);
        setOverrideRows(rows || []);
      } catch (err) {
        // ignore - debug overlay isn't critical
        setOverrideRows(null);
      }
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
          <span className="font-medium">{formatCurrency(totalBasePrice)}</span>
        </div>

        {/* Platform Fee Breakdown */}
        {pricing.fee_payer === 'shared' ? (
          <>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">
                Your Share
                <span className="text-xs text-gray-500 ml-1">(platform fee portion)</span>
              </span>
              <span className="font-medium text-red-600">+{formatCurrency(totalTouristFee)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>Vendor's Share (platform fee portion)</span>
              <span>-{formatCurrency(totalVendorFee)}</span>
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
              {pricing.fee_payer === 'tourist' ? '+' : '-'}{formatCurrency(totalPlatformFee)}
            </span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-200 my-2"></div>

        {/* Total Customer Payment */}
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-gray-900">Total to Pay</span>
          <span className="text-lg font-bold text-gray-900">{formatCurrency(totalCustomerPayment)}</span>
        </div>

        {/* Vendor Payout */}
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>Vendor Receives</span>
          <span>{formatCurrency(totalVendorPayout)}</span>
        </div>

        {/* Applied Rule */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            <span className="font-medium">Applied Rule:</span> {pricing.applied_rule}
          </div>
          {/* Active override / source indicator for debugging and quick verification */}
          <div className="mt-2">
            <div className="text-xs">
              <span className="font-medium">Source:</span>
              <span className="ml-1 text-sm text-gray-700">{pricing.pricing_source}</span>
            </div>
            {pricing.pricing_reference_id && (
              <div className="text-xs text-gray-600 mt-1">
                <span className="font-medium">Reference:</span>
                <span className="ml-1">{pricing.pricing_reference_id}</span>
              </div>
            )}
            <div className="text-xs text-gray-600 mt-1">
              <span className="font-medium">Fee payer:</span>
              <span className="ml-1">{pricing.fee_payer}</span>
            </div>
          </div>
          {/* Dev-only raw overrides overlay (helps diagnose why an override isn't applied) */}
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-3 bg-white p-2 border rounded text-xs text-gray-700">
              <div className="font-medium text-gray-800 mb-1">Debug: raw service_pricing_overrides</div>
              {overrideRows === null ? (
                <div className="text-gray-500">no debug data</div>
              ) : (
                <pre className="whitespace-pre-wrap text-xs max-h-40 overflow-auto">{JSON.stringify(overrideRows, null, 2)}</pre>
              )}
            </div>
          )}
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
export function CompactPricingBreakdown({ serviceId, quantity = 1, refreshKey, className = '' }: PricingBreakdownProps) {
  const [pricing, setPricing] = useState<PricingPreview | null>(null);
  const [loading, setLoading] = useState(true);

  // Currency formatting function - always display in UGX
  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'UGX',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch (error) {
      return `UGX ${amount.toLocaleString()}`;
    }
  };

  useEffect(() => {
    loadPricing();
  }, [serviceId, refreshKey]);

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
        <span className="font-semibold text-gray-900">{formatCurrency(totalCustomerPayment)}</span>
      </div>
      <div className="text-xs text-gray-500 mt-1">
        Includes {formatCurrency(pricing.platform_fee)} platform fee ({pricing.fee_payer === 'tourist' ? 'paid by you' : 'covered by vendor'})
      </div>
    </div>
  );
}