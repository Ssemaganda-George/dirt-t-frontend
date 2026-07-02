import { CreditCard, Smartphone } from 'lucide-react'
import { FieldError } from '../booking/BookingFormFeedback'
import { fieldInputClass } from '../../lib/bookingFormValidation'
import {
  detectMarzpayProvider,
  isMobileUiMethod,
  type MarzpayPaymentFieldsValue,
  type MarzpayUiMethod,
} from '../../lib/marzpayApi'

export type { MarzpayPaymentFieldsValue, MarzpayUiMethod }

type Props = {
  name: string
  value: MarzpayPaymentFieldsValue
  onChange: (value: MarzpayPaymentFieldsValue) => void
  errors?: { phone?: string; mobileProvider?: string }
  onClearError?: (field: 'phone' | 'mobileProvider') => void
  className?: string
  inputClassName?: string
  showMoMoHint?: boolean
}

export default function MarzpayPaymentFields({
  name,
  value,
  onChange,
  errors = {},
  onClearError,
  className = '',
  inputClassName = '',
  showMoMoHint = true,
}: Props) {
  const mobileSelected = isMobileUiMethod(value.method)
  const cardSelected = value.method === 'card'

  const setMethod = (method: 'mobile' | 'card') => {
    if (method === 'card') {
      onChange({ ...value, method: 'card' })
      onClearError?.('phone')
      onClearError?.('mobileProvider')
      return
    }
    onChange({ ...value, method: 'mobile' })
  }

  const setPhone = (phone: string) => {
    const detected = detectMarzpayProvider(phone)
    onChange({
      ...value,
      phone,
      provider: detected || value.provider,
    })
    onClearError?.('phone')
    if (detected) onClearError?.('mobileProvider')
  }

  const setProvider = (provider: 'MTN' | 'Airtel') => {
    onChange({ ...value, provider })
    onClearError?.('mobileProvider')
  }

  const phoneInputClass = inputClassName
    ? fieldInputClass(Boolean(errors.phone), inputClassName)
    : fieldInputClass(Boolean(errors.phone), 'w-full px-3 py-3 border border-gray-300 rounded-lg text-base')

  return (
    <div className={className}>
      <div className="grid gap-2">
        <label
          className={`flex items-start gap-3 p-3 min-h-[44px] rounded-lg border cursor-pointer transition-colors ${
            mobileSelected ? 'border-emerald-700 bg-emerald-50/60' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <input
            type="radio"
            name={name}
            value="mobile"
            checked={mobileSelected}
            onChange={() => setMethod('mobile')}
            className="mt-1 shrink-0"
          />
          <Smartphone className="w-5 h-5 text-gray-600 mt-0.5 shrink-0" strokeWidth={1.75} aria-hidden />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-gray-900">Mobile Money</span>
            <span className="block text-xs text-gray-500 mt-0.5">MTN or Airtel. Approve on your phone.</span>
          </span>
        </label>
        <label
          className={`flex items-start gap-3 p-3 min-h-[44px] rounded-lg border cursor-pointer transition-colors ${
            cardSelected ? 'border-emerald-700 bg-emerald-50/60' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <input
            type="radio"
            name={name}
            value="card"
            checked={cardSelected}
            onChange={() => setMethod('card')}
            className="mt-1 shrink-0"
          />
          <CreditCard className="w-5 h-5 text-gray-600 mt-0.5 shrink-0" strokeWidth={1.75} aria-hidden />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-gray-900">Debit or credit card</span>
            <span className="block text-xs text-gray-500 mt-0.5">Visa or Mastercard.</span>
          </span>
        </label>
      </div>

      {mobileSelected && (
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Money Provider</label>
            <div className={`flex gap-2 ${errors.mobileProvider ? 'ring-1 ring-red-500 rounded-lg p-1' : ''}`}>
              {(['MTN', 'Airtel'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProvider(p)}
                  className={`flex-1 py-2.5 rounded-lg border font-medium text-sm ${
                    value.provider === p ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <FieldError message={errors.mobileProvider} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Money Number *</label>
            {value.provider && (
              <p className="text-xs text-gray-500 mb-1">
                Provider: <span className="font-medium">{value.provider}</span> (auto-detected)
              </p>
            )}
            <input
              type="tel"
              placeholder="0712345678 or +256712345678"
              className={phoneInputClass}
              value={value.phone}
              onChange={e => setPhone(e.target.value.trimStart())}
              autoComplete="tel"
              aria-invalid={Boolean(errors.phone)}
            />
            <FieldError message={errors.phone} />
          </div>
          {showMoMoHint && (
            <p className="text-xs text-gray-500">Secure payment via MarzPay. You will receive a USSD prompt on your phone.</p>
          )}
        </div>
      )}
    </div>
  )
}

/** @deprecated Use MarzpayPaymentFields */
export { isMobileUiMethod } from '../../lib/marzpayApi'
