import { X, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { usePreferences } from '../contexts/PreferencesContext'

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
  { name: 'Indonesia', language: 'Indonesian', code: 'ID' },
  { name: 'Portugal', language: 'Português', code: 'PT' },
  { name: 'Brasil', language: 'Português', code: 'BR' },
  { name: 'México', language: 'Español', code: 'MX' },
  { name: 'Argentina', language: 'Español', code: 'AR' },
  { name: 'Egypt', language: 'العربية', code: 'EG' },
  { name: 'Morocco', language: 'العربية', code: 'MA' },
  { name: 'Turkey', language: 'Türkçe', code: 'TR' },
  { name: 'Thailand', language: 'ไทย', code: 'TH' },
  { name: 'Japan', language: '日本語', code: 'JP' },
  { name: 'South Korea', language: '한국어', code: 'KR' },
  { name: 'China', language: '中文', code: 'CN' },
  { name: 'Russia', language: 'Русский', code: 'RU' }
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
  { name: 'New Zealand Dollar', code: 'NZD' },
  { name: 'Brazilian Real', code: 'BRL' },
  { name: 'Mexican Peso', code: 'MXN' },
  { name: 'Argentine Peso', code: 'ARS' },
  { name: 'Egyptian Pound', code: 'EGP' },
  { name: 'Moroccan Dirham', code: 'MAD' },
  { name: 'Turkish Lira', code: 'TRY' },
  { name: 'Thai Baht', code: 'THB' },
  { name: 'Korean Won', code: 'KRW' },
  { name: 'Russian Ruble', code: 'RUB' }
]

interface PreferencesModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PreferencesModal({ isOpen, onClose }: PreferencesModalProps) {
  const { selectedRegion, selectedCurrency, updatePreferences, loading } = usePreferences()
  const [activeTab, setActiveTab] = useState('region')
  const [saving, setSaving] = useState(false)
  const [tempRegion, setTempRegion] = useState(selectedRegion)
  const [tempCurrency, setTempCurrency] = useState(selectedCurrency)

  // Update temp values when preferences change
  useEffect(() => {
    setTempRegion(selectedRegion)
    setTempCurrency(selectedCurrency)
  }, [selectedRegion, selectedCurrency])

  const handleRegionChange = (regionCode: string) => {
    setTempRegion(regionCode)
  }

  const handleCurrencyChange = (currencyCode: string) => {
    setTempCurrency(currencyCode)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      // Get language from selected region
      const selectedRegionData = regions.find(r => r.code === tempRegion)
      const language = selectedRegionData ? getLanguageCode(selectedRegionData.language) : 'en'

      await updatePreferences(tempRegion, tempCurrency, language)
      onClose()
    } catch (error) {
      console.error('Error saving preferences:', error)
      // Could add error toast here
    } finally {
      setSaving(false)
    }
  }

  // Helper function to convert language name to code
  const getLanguageCode = (languageName: string): string => {
    const languageMap: { [key: string]: string } = {
      'English': 'en',
      'Français': 'fr',
      'Deutsch': 'de',
      'Español': 'es',
      'Italiano': 'it',
      'Indonesian': 'id',
      'Português': 'pt',
      'العربية': 'ar',
      'Türkçe': 'tr',
      'ไทย': 'th',
      '日本語': 'ja',
      '한국어': 'ko',
      '中文': 'zh',
      'Русский': 'ru'
    }
    return languageMap[languageName] || 'en'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
  <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
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
  <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'region' ? (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Choose a region and language
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {regions.map((region) => (
                  <button
                    key={region.code}
                    onClick={() => handleRegionChange(region.code)}
                    className={`p-4 text-left border rounded-lg transition-all ${
                      tempRegion === region.code
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
                    onClick={() => handleCurrencyChange(currency.code)}
                    className={`p-4 text-left border rounded-lg transition-all ${
                      tempCurrency === currency.code
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
  <div className="p-4 sm:p-6 border-t bg-gray-50 sticky bottom-0" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <p className="text-xs sm:text-sm text-gray-600 leading-tight">
              Any changes to the preferences will persist through your user session.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="sr-only">Saving</span>
                    <span className="hidden sm:inline">Saving...</span>
                  </>
                ) : (
                  'Save Preferences'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}