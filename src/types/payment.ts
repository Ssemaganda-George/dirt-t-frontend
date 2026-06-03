export type TransactionType = 'payment' | 'withdrawal' | 'refund';
export type TransactionStatus = 'pending' | 'approved' | 'completed' | 'failed' | 'rejected';

export interface Transaction {
  id: string;
  booking_id?: string;
  vendor_id?: string;
  tourist_id?: string;
  amount: number;
  currency: string;
  transaction_type: 'payment' | 'withdrawal' | 'refund';
  status: 'pending' | 'approved' | 'completed' | 'failed' | 'rejected';
  payment_method: 'card' | 'mobile_money' | 'bank_transfer';
  reference: string;
  payout_meta?: any;
  receipt_url?: string;
  payment_notes?: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
  vendors?: {
    business_name: string;
    user_id: string;
  };
  vendor_payout_amount?: number;
  bookings?: {
    id: string;
    total_amount?: number | string | null;
    platform_fee?: number | string | null;
    commission_amount?: number | string | null;
    vendor_payout_amount?: number | string | null;
    fee_payer?: string | null;
  } | null;
}

export interface Wallet {
  id: string;
  vendor_id: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface PricingTier {
  id: string;
  name: string;
  commission_type: 'percentage' | 'flat';
  commission_value: number;
  min_monthly_bookings: number;
  min_rating?: number;
  priority_order: number;
  effective_from: string;
  effective_until?: string;
  is_active: boolean;
  fee_payer: 'vendor' | 'tourist' | 'shared';
  tourist_percentage?: number | null;
  vendor_percentage?: number | null;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ServicePricingOverride {
  id: string;
  service_id: string;
  override_enabled: boolean;
  override_type: 'flat' | 'percentage';
  override_value: number;
  fee_payer: 'vendor' | 'tourist' | 'shared';
  tourist_percentage?: number;
  vendor_percentage?: number;
  effective_from: string;
  effective_until?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentCalculation {
  success: boolean;
  error?: string;
  base_price: number;
  platform_fee: number;
  tourist_fee: number;
  vendor_fee: number;
  vendor_payout: number;
  total_customer_payment: number;
  fee_payer: 'vendor' | 'tourist' | 'shared';
  pricing_source: 'tier' | 'override';
  pricing_reference_id: string;
  service_id: string;
}

export interface PricingPreview {
  base_price: number;
  platform_fee: number;
  tourist_fee: number;
  vendor_fee: number;
  vendor_payout: number;
  total_customer_payment: number;
  fee_payer: 'vendor' | 'tourist' | 'shared';
  pricing_source: 'tier' | 'override';
  applied_rule: string;
  pricing_reference_id?: string;
}

export type TierCommissionResolve = {
  platformFee: number;
  pricingReferenceId: string;
  fee_payer: 'vendor' | 'tourist' | 'shared';
  tourist_percentage: number | null;
  vendor_percentage: number | null;
};
