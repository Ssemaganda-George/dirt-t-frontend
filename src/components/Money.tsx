import { formatCurrencyPartsWithConversion } from '../lib/utils'

type MoneyProps = {
  amount: number
  serviceCurrency?: string
  targetCurrency?: string
  locale?: string
  className?: string
  currencyClassName?: string
  amountClassName?: string
  smallCurrency?: boolean
}

export default function Money({
  amount,
  serviceCurrency = 'UGX',
  targetCurrency = 'UGX',
  locale = 'en-US',
  className = '',
  currencyClassName = 'text-[11px] text-gray-600 mr-1',
  amountClassName = 'text-[12px] sm:text-[13px] font-normal text-black',
}: MoneyProps) {
  const parts = formatCurrencyPartsWithConversion(amount, serviceCurrency, targetCurrency, locale)

  return (
    <span className={className} aria-hidden>
      <span className={currencyClassName}>{parts.currency}</span>
      <span className={amountClassName}>{parts.amount}</span>
    </span>
  )
}
