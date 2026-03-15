import { useSearchParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../../src/contexts/AuthContext'
import { usePreferences } from '../../contexts/PreferencesContext'
import { convertCurrency, formatCurrency } from '../../lib/utils'
import { supabase } from '../../lib/supabaseClient'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

function generateTxnId() {
  return `OTX-${Date.now()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`
}

function generateTreeIds(count: number) {
  const ids: string[] = []
  const limit = Math.min(count, 100)
  for (let i = 0; i < limit; i++) {
    ids.push(`DT-TREE-${Math.random().toString(36).slice(2,9).toUpperCase()}`)
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
  const [paymentMethod, setPaymentMethod] = useState<string>('mobile')
  const [provider, setProvider] = useState<'mtn' | 'airtel'>('mtn')
  const [phone, setPhone] = useState<string>(profile?.phone || '+256759918649')
  const [comment, setComment] = useState<string>('')
  const [anonymous, setAnonymous] = useState<boolean>(false)
  const { selectedCurrency } = usePreferences()

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    try {
      const orderId = `donate-${Date.now()}`
      const userCurrency = selectedCurrency || 'UGX'
      const numericAmount = Number(amount || 0)
      const amountInUGX = Math.round(convertCurrency(numericAmount, userCurrency, 'UGX'))

      if (paymentMethod === 'mobile') {
        const rawPhone = String(phone || '').trim().replace(/^\+256/, '')
        const phoneFormatted = rawPhone.startsWith('+') ? rawPhone : `+256${rawPhone.replace(/^0/, '')}`
        if (!phoneFormatted || phoneFormatted.length < 10) {
          alert('Please enter a valid mobile money phone number')
          setProcessing(false)
          return
        }

        const { data: session } = await supabase.auth.getSession()
        const collectRes = await fetch(`${supabaseUrl}/functions/v1/marzpay-collect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            amount: amountInUGX,
            phone_number: phoneFormatted,
            order_id: orderId,
            description: `Offset donation — ${trees} trees / ${kg}kg`,
            user_id: session?.session?.user?.id || undefined,
          }),
        })

        const result = await collectRes.json().catch(() => ({}))
        if (!collectRes.ok) {
          const msg = result?.error || `Payment initiation failed (${collectRes.status})`
          throw new Error(msg)
        }
        if (!result?.success || !result?.data?.reference) {
          throw new Error(result?.error || 'Payment initiation failed')
        }

        const ref = result.data.reference
        navigate(`/checkout/${orderId}/payment?reference=${encodeURIComponent(ref)}`)
        return
      }

      // fallback for card or offline: persist locally
      const txn = generateTxnId()
      const treeIds = generateTreeIds(trees)
      const providerValue = paymentMethod === 'mobile' ? provider : null
      const phoneValue = paymentMethod === 'mobile' ? phone : null
      const record = {
        txn,
        userId: user?.id || null,
        name: anonymous ? 'Anonymous' : name,
        anonymous: anonymous,
        email,
        paymentMethod,
        provider: providerValue,
        phone: phoneValue,
        payment_notes: comment || null,
        kg,
        trees,
        amount: numericAmount,
        treeIds,
        date: new Date().toISOString()
      }
      try {
        const raw = localStorage.getItem('dirttrails_offsets')
        const arr = raw ? JSON.parse(raw) : []
        arr.push(record)
        localStorage.setItem('dirttrails_offsets', JSON.stringify(arr))
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
              <>
                ≈ {formatCurrency(Math.round(convertCurrency(Number(amount), selectedCurrency || 'UGX', 'UGX')), 'UGX')} will be charged
              </>
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

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <input type="radio" name="payment" checked={paymentMethod === 'mobile'} onChange={() => setPaymentMethod('mobile')} className="mt-1" />
              <div>
                <div className="font-medium">Mobile Money</div>
                <div className="text-sm text-gray-500">Select provider to continue →</div>
                {paymentMethod === 'mobile' && (
                  <div className="mt-3 pl-3">
                    <label className="text-sm text-gray-600 block mb-2">Provider</label>
                    <select value={provider} onChange={(e) => setProvider(e.target.value as any)} className="w-44 border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3">
                      <option value="mtn">MTN</option>
                      <option value="airtel">Airtel</option>
                    </select>

                    <label className="text-sm text-gray-600 block mb-2">Phone number</label>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712345678 or +256712345678" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <input type="radio" name="payment" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} className="mt-1" />
              <div>
                <div className="font-medium">Credit / Debit Card <span className="text-xs text-gray-500">(coming soon)</span></div>
                <div className="text-sm text-gray-500">VISA • AMEX • DISC</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-lg shadow" disabled={processing || (paymentMethod === 'mobile' && !phone)}>
            {processing ? 'Processing...' : `Pay ${formatCurrency(Number(amount || 0), selectedCurrency || 'UGX')}`}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 text-gray-600">Back</button>
        </div>
      </form>

    </div>
  )
}

