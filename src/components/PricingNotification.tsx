import { formatCurrencyWithConversion } from '../lib/utils';

interface PricingNotificationProps {
  price: number;
  currency: string;
  fee: number;
  description: string;
  selectedCurrency: string;
  selectedLanguage: string;
}

export default function PricingNotification({
  price,
  currency,
  fee,
  description,
  selectedCurrency,
  selectedLanguage
}: PricingNotificationProps) {
  if (!price || price <= 0) return null;

  const vendorPayout = price - fee;

  return (
    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-start space-x-2">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-blue-800">Pricing Information</p>
          <div className="mt-1 text-sm text-blue-700 space-y-1">
            <p>{description}</p>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Service Price:</span>
                <span className="font-medium">{formatCurrencyWithConversion(price, currency, selectedCurrency, selectedLanguage)}</span>
              </div>
              <div className="flex justify-between">
                <span>Platform Fee:</span>
                <span className="font-medium text-red-600">-{formatCurrencyWithConversion(fee, currency, selectedCurrency, selectedLanguage)}</span>
              </div>
              <div className="flex justify-between border-t border-blue-200 pt-1">
                <span className="font-medium">You Receive:</span>
                <span className="font-bold text-green-600">{formatCurrencyWithConversion(vendorPayout, currency, selectedCurrency, selectedLanguage)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}