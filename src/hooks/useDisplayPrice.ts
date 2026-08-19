import { useCallback } from 'react'
import { usePreferences } from '../contexts/PreferencesContext'
import { formatCurrencyWithConversion } from '../lib/utils'

/** Display-only money formatting. Never use this value as a MarzPay charge amount. */
export function useDisplayPrice() {
  const { selectedCurrency, selectedLanguage } = usePreferences()
  const displayCurrency = selectedCurrency || 'UGX'
  const locale = selectedLanguage || 'en'

  const formatPrice = useCallback(
    (amount: number | string, serviceCurrency: string) => {
      const numeric = Number(amount)
      const safe = Number.isFinite(numeric) ? numeric : 0
      return formatCurrencyWithConversion(safe, serviceCurrency, displayCurrency, locale)
    },
    [displayCurrency, locale]
  )

  return { formatPrice, displayCurrency, locale }
}
