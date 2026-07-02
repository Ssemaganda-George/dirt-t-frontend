import { useSearchParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../../src/contexts/AuthContext'
import { usePreferences } from '../../contexts/PreferencesContext'
import { convertCurrency, formatCurrency } from '../../lib/utils'
import { supabase } from '../../lib/supabaseClient'
import { getOptionalUserId } from '../../services/AuthService'
import MarzpayPaymentFields from '../../components/payment/MarzpayPaymentFields'
import {
  getMarzpayMobileValidationErrors,
  initiateMarzpayCollect,
  isMobileUiMethod,
  redirectMarzpayIfNeeded,
  toMarzpayMethod,
  type MarzpayPaymentFieldsValue,
} from '../../lib/marzpayApi'

function generateTxnId() {
  return `OTX-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

function generateTreeIds(count: number) {
  const ids: string[] = []
  const limit = Math.min(count, 100)
  for (let i = 0; i < limit; i++) {
    ids.push(`DT-TREE-${Math.random().toString(36).slice(2, 9).toUpperCase()}`)
  }
  return ids
}

export default function OffsetCheckout() {
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const kg = Number(search.get('kg') || '0')
  const trees = Number(search.get('trees') || '0')
  const suggested = Number(search.get('suggested') || '') || (trees > 0 ? trees * 5 : Math.ceil(kg * 0.01))

  const [name, setName] = useState(profile?.full_name || '')
  const [email, setEmail] = useState(profile?.email || '')
  const [amount, setAmount] = useState<string>(String(suggested))
  const [processing, setProcessing] = useState(false)
  const [paymentFields, setPaymentFields] = useState<MarzpayPaymentFieldsValue>({
    method: 'mobile',
    phone: profile?.phone || '',
    provider: '',
  })
  const [fieldErrors, setFieldErrors] = useState<{ phone?: string; mobileProvider?: string }>({})
  const [comment, setComment] = useState<string>('')
  const [anonymous, setAnonymous] = useState<boolean>(false)
  const { selectedCurrency } = usePreferences()

  const registerOffsetRpc = async (ref: string, amountInUGX: number, method: string) => {
    try {
      const userId = await getOptionalUserId()
      await supabase.rpc('create_transaction_with_meta_atomic', {
        p_booking_id: null,
        p_vendor_id: null,
        p_tourist_id: userId ?? null,
        p_amount: amountInUGX,
        p_currency: 'UGX',
        p_transaction_type: 'offset',
        p_status: 'pending',
        p_payment_method: method,
        p_reference: ref,
        p_payout_meta: null,
      })
    } catch (rpcErr) {
      console.warn('Failed to register offset transaction:', rpcErr)
    }
  }

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isMobileUiMethod(paymentFields.method)) {
      const errs = getMarzpayMobileValidationErrors(paymentFields)
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs)
        return
      }
    }

    setProcessing(true)
    try {
      const orderId = `donate-${Date.now()}`
      const userCurrency = selectedCurrency || 'UGX'
      const numericAmount = Number(amount || 0)
      const amountInUGX = Math.round(convertCurrency(numericAmount, userCurrency, 'UGX'))
      const isCard = paymentFields.method === 'card'

      if (paymentFields.method === 'mobile' || isCard) {
        const userId = await getOptionalUserId()
        const result = await initiateMarzpayCollect({
          amount: amountInUGX,
          method: toMarzpayMethod(paymentFields.method),
          ...(isCard ? {} : { phone_number: paymentFields.phone }),
          order_id: orderId,
          description: `Offset donation — ${trees} trees / ${kg}kg`,
          user_id: userId ?? undefined,
        })

        await registerOffsetRpc(result.reference, amountInUGX, isCard ? 'card' : 'mobile')

        if (redirectMarzpayIfNeeded(result)) return

        navigate(`/checkout/${orderId}/payment?reference=${encodeURIComponent(result.reference)}`)
        return
      }

      const txn = generateTxnId()
      const treeIds = generateTreeIds(trees)
      const record = {
        txn,
        userId: user?.id || null,
        name: anonymous ? 'Anonymous' : name,
        anonymous,
        email,
        paymentMethod: paymentFields.method,
        provider: isMobileUiMethod(paymentFields.method) ? paymentFields.provider : null,
        phone: isMobileUiMethod(paymentFields.method) ? paymentFields.phone : null,
        payment_notes: comment || null,
        kg,
        trees,
        amount: numericAmount,
        treeIds,
        date: new Date().toISOString(),
      }
      try {
        const raw = localStorage.getItem('dirttrails_offsets')
        const arr = raw ? JSON.parse(raw) : []
        arr.push(record)
        localStorage.setItem('dirttrails_offsets', JSON.stringify(arr))
        try {
          const touristId = await getOptionalUserId()
          await supabase.rpc('create_transaction_with_meta_atomic', {
            p_booking_id: null,
            p_vendor_id: null,
            p_tourist_id: touristId ?? null,
            p_amount: amountInUGX,
            p_currency: 'UGX',
            p_transaction_type: 'offset',
            p_status: 'pending',
            p_payment_method: isMobileUiMethod(paymentFields.method) ? paymentFields.provider : paymentFields.method,
            p_reference: txn,
            p_payout_meta: JSON.stringify({ comment: comment || null }),
          })
        } catch (e) {
          console.warn('Could not persist offset transaction to DB:', e)
        }
      } catch (err) {
        console.error('Failed to persist offset record', err)
      }
      navigate(`/conservation/offset/success?txn=${encodeURIComponent(txn)}`)
    } catch (err) {
      console.error('Offset payment error:', err)
      alert((err as Error).message || 'Payment failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Offset Checkout</h1>
        <p className="mt-2 text-gray-600">Complete your contribution to fund tree planting and local conservation projects.</p>
      </div>

      <form onSubmit={handlePay} className="bg-white rounded-2xl shadow-md p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm text-gray-600 block mb-2">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" required={!anonymous} disabled={anonymous} />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-2">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" required />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input id="anon" type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="h-4 w-4" />
          <label htmlFor="anon" className="text-sm text-gray-600">Donate anonymously</label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-sm text-gray-600">Estimated CO₂e</div>
            <div className="text-xl font-semibold text-gray-900 mt-1">{kg} kg</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-sm text-gray-600">Trees (est.)</div>
            <div className="text-xl font-semibold text-gray-900 mt-1">{trees}</div>
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-600 block mb-2">Contribution amount ({selectedCurrency})</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-40 border border-gray-200 rounded-lg px-3 py-2 text-sm" required />
          <div className="text-xs text-gray-500 mt-2">
            {amount && !isNaN(Number(amount)) ? (
              <>≈ {formatCurrency(Math.round(convertCurrency(Number(amount), selectedCurrency || 'UGX', 'UGX')), 'UGX')} will be charged</>
            ) : (
              'Enter an amount to see the UGX equivalent'
            )}
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-600 block mb-2">Comments (optional)</label>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a short note (e.g., 'Planting in Lake Mburo')" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" rows={3} />
        </div>

        <div className="pt-4 border-t">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">Select Payment Method</h4>
          <MarzpayPaymentFields
            name="offsetPaymentMethod"
            value={paymentFields}
            onChange={(value) => {
              setPaymentFields(value)
              setFieldErrors({})
            }}
            errors={fieldErrors}
            onClearError={(field) => setFieldErrors(p => { const n = { ...p }; delete n[field]; return n })}
          />
        </div>

        <div className="flex items-center justify-between">
          <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-lg shadow disabled:opacity-60" disabled={processing || (isMobileUiMethod(paymentFields.method) && !paymentFields.phone)}>
            {processing ? 'Processing...' : `Pay ${formatCurrency(Number(amount || 0), selectedCurrency || 'UGX')}`}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 text-gray-600">Back</button>
        </div>
      </form>
    </div>
  )
}
