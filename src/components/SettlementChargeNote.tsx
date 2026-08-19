import { formatCurrency, normalizeServiceCurrency } from '../lib/utils'
import { usePreferences } from '../contexts/PreferencesContext'

/** Shown when display currency differs from the UGX (or listing) amount MarzPay will collect. */
export default function SettlementChargeNote({
  amount,
  settlementCurrency,
}: {
  amount: number
  settlementCurrency: string
}) {
  const { selectedCurrency } = usePreferences()
  const settlement = normalizeServiceCurrency(settlementCurrency)
  const display = normalizeServiceCurrency(selectedCurrency || 'UGX')
  if (settlement === display) return null

  return (
    <p className="text-xs text-gray-500">
      You will be charged {formatCurrency(amount, settlement)} via MarzPay.
    </p>
  )
}
