import { X } from 'lucide-react'

const regions = [
  { name: 'Uganda', language: 'English', code: 'UG' },
  { name: 'United States', language: 'English', code: 'US' },
  { name: 'United Kingdom', language: 'English', code: 'GB' },
  { name: 'Kenya', language: 'English', code: 'KE' },
  { name: 'Tanzania', language: 'English', code: 'TZ' },
  { name: 'Rwanda', language: 'English', code: 'RW' },
  { name: 'South Africa', language: 'English', code: 'ZA' },
  { name: 'Nigeria', language: 'English', code: 'NG' },
  { name: 'Ghana', language: 'English', code: 'GH' },
  { name: 'Canada (English)', language: 'English', code: 'CA-EN' },
  { name: 'Canada (Français)', language: 'Français', code: 'CA-FR' },
  { name: 'Australia', language: 'English', code: 'AU' },
  { name: 'France', language: 'Français', code: 'FR' },
  { name: 'Deutschland', language: 'Deutsch', code: 'DE' },
  { name: 'España', language: 'Español', code: 'ES' },
  { name: 'Italia', language: 'Italiano', code: 'IT' },
  { name: 'India', language: 'English', code: 'IN' },
  { name: 'Singapore', language: 'English', code: 'SG' },
  { name: 'Malaysia', language: 'English', code: 'MY' },
  { name: 'Indonesia', language: 'Indonesian', code: 'ID' }
]

const currencies = [
  { name: 'Ugandan Shilling', code: 'UGX' },
  { name: 'U.S. Dollars', code: 'USD' },
  { name: 'Euro', code: 'EUR' },
  { name: 'British Pound', code: 'GBP' },
  { name: 'Kenyan Shilling', code: 'KES' },
  { name: 'Tanzanian Shilling', code: 'TZS' },
  { name: 'Rwandan Franc', code: 'RWF' },
  { name: 'South African Rand', code: 'ZAR' },
  { name: 'Nigerian Naira', code: 'NGN' },
  { name: 'Ghanaian Cedi', code: 'GHS' },
  { name: 'Canadian Dollar', code: 'CAD' },
  { name: 'Australian Dollar', code: 'AUD' },
  { name: 'Japanese Yen', code: 'JPY' },
  { name: 'Chinese Yuan', code: 'CNY' },
  { name: 'Indian Rupee', code: 'INR' },
  { name: 'Singapore Dollar', code: 'SGD' },
  { name: 'Swiss Franc', code: 'CHF' },
  { name: 'Swedish Krona', code: 'SEK' },
  { name: 'Hong Kong Dollar', code: 'HKD' },
  { name: 'New Zealand Dollar', code: 'NZD' }
]

interface PreferencesModalProps {
  isOpen: boolean
  onClose: () => void
  selectedRegion: string
  selectedCurrency: string
  onRegionChange: (code: string) => void
  onCurrencyChange: (code: string) => void
}

export default function PreferencesModal({
  isOpen,
  onClose,
  selectedRegion,
  selectedCurrency,
  onRegionChange,
  onCurrencyChange
}: PreferencesModalProps) {
  const [activeTab, setActiveTab] = useState('region')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Preferences</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex px-6">
            <button
              onClick={() => setActiveTab('region')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'region'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Region and Language
            </button>
            <button
              onClick={() => setActiveTab('currency')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'currency'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Currency
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {activeTab === 'region' ? (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Choose a region and language
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {regions.map((region) => (
                  <button
                    key={region.code}
                    onClick={() => onRegionChange(region.code)}
                    className={`p-4 text-left border rounded-lg transition-all ${
                      selectedRegion === region.code
                        ? 'border-gray-900 border-2 bg-gray-50'
                        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{region.name}</div>
                    <div className="text-sm text-gray-600">{region.language}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Choose a currency
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {currencies.map((currency) => (
                  <button
                    key={currency.code}
                    onClick={() => onCurrencyChange(currency.code)}
                    className={`p-4 text-left border rounded-lg transition-all ${
                      selectedCurrency === currency.code
                        ? 'border-gray-900 border-2 bg-gray-50'
                        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{currency.name}</div>
                    <div className="text-sm text-gray-600">{currency.code}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <p className="text-sm text-gray-600">
            Any changes to the preferences are optional, and will persist through your user session.
          </p>
        </div>
      </div>
    </div>
  )
}

// Import useState at the top
import { useState } from 'react'