import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, PlusCircle, TrendingDown, PiggyBank, Wallet as WalletIcon, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePreferences } from '../contexts/PreferencesContext'
import { supabase } from '../lib/supabaseClient'
import { Booking } from '../lib/database'
import { convertCurrency, formatCurrencyWithConversion } from '../lib/utils'
import { useMarzpayCollect } from '../hooks/useMarzpayCollect'
import MarzpayPaymentFields from '../components/payment/MarzpayPaymentFields'
import { getMarzpayMobileValidationErrors, isMobileUiMethod, type MarzpayPaymentFieldsValue } from '../lib/marzpayApi'

type WalletTopUp = {
  id: string
  amount: number
  currency: string
  note?: string
  payment_method: 'card' | 'mobile_money' | 'bank_transfer'
  reference?: string
  created_at: string
}

type WalletActivity = {
  id: string
  type: 'topup' | 'spend'
  amount: number
  currency: string
  title: string
  created_at: string
}

export default function Wallet() {
  const { user } = useAuth()
  const { selectedCurrency, selectedLanguage } = usePreferences()

  const [bookings, setBookings] = useState<Booking[]>([])
  const [topUps, setTopUps] = useState<WalletTopUp[]>([])
  const [amountInput, setAmountInput] = useState('')
  const [noteInput, setNoteInput] = useState('')
  const [paymentFields, setPaymentFields] = useState<MarzpayPaymentFieldsValue>({ method: 'mobile', phone: '', provider: '' })
  const [fieldErrors, setFieldErrors] = useState<{ phone?: string; mobileProvider?: string }>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const pendingTopUpRef = useRef<{ amount: number; note: string; reference: string; payment_method: 'card' | 'mobile_money' } | null>(null)

  const displayCurrency = selectedCurrency || 'UGX'
  const storageKey = user ? `dt_wallet_topups_${user.id}` : ''

  const persistTopUps = (nextTopUps: WalletTopUp[]) => {
    if (!storageKey) return
    localStorage.setItem(storageKey, JSON.stringify(nextTopUps))
  }

  const loadTopUps = () => {
    if (!storageKey) return
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) {
        setTopUps([])
        return
      }
      const parsed = JSON.parse(raw) as WalletTopUp[]
      if (Array.isArray(parsed)) setTopUps(parsed)
    } catch {
      setTopUps([])
    }
  }

  const fetchTopUpsFromDatabase = async () => {
    if (!user) return
    try {
      const { data, error: dbError } = await supabase
        .from('transactions')
        .select('id, amount, currency, payment_method, reference, created_at')
        .eq('tourist_id', user.id)
        .eq('transaction_type', 'payment')
        .ilike('reference', 'WALLET_TOPUP_%')
        .order('created_at', { ascending: false })

      if (dbError) return

      const normalizedTopUps: WalletTopUp[] = (data || []).map((transaction: any) => ({
        id: transaction.id,
        amount: Number(transaction.amount) || 0,
        currency: transaction.currency || 'UGX',
        payment_method: (transaction.payment_method || 'mobile_money') as 'card' | 'mobile_money' | 'bank_transfer',
        reference: transaction.reference || undefined,
        created_at: transaction.created_at,
      }))

      if (normalizedTopUps.length > 0) {
        setTopUps(normalizedTopUps)
        persistTopUps(normalizedTopUps)
      }
    } catch {
      // Keep local data as fallback if DB read fails
    }
  }

  const recordSuccessfulTopUp = useCallback(async () => {
    const pending = pendingTopUpRef.current
    if (!pending || !user) return

    const nextTopUp: WalletTopUp = {
      id: crypto.randomUUID(),
      amount: pending.amount,
      currency: displayCurrency,
      note: pending.note,
      payment_method: pending.payment_method,
      reference: pending.reference,
      created_at: new Date().toISOString(),
    }

    const nextTopUps = [nextTopUp, ...topUps]
    setTopUps(nextTopUps)
    persistTopUps(nextTopUps)

    const { error: insertError } = await supabase.from('transactions').insert({
      booking_id: null,
      vendor_id: null,
      tourist_id: user.id,
      amount: pending.amount,
      currency: displayCurrency,
      transaction_type: 'payment',
      status: 'completed',
      payment_method: pending.payment_method,
      reference: pending.reference,
    })

    if (!insertError) await fetchTopUpsFromDatabase()
    pendingTopUpRef.current = null
  }, [user, topUps, displayCurrency, storageKey])

  const {
    pay,
    processing,
    pollingMessage,
    setError: setPaymentError,
    cleanup,
    reset: resetPayment,
  } = useMarzpayCollect({
    channelPrefix: 'wallet',
    onCompleted: async (reference) => {
      if (pendingTopUpRef.current) pendingTopUpRef.current.reference = reference
      setSaving(false)
      setPaymentSuccess(true)
      await recordSuccessfulTopUp()
      setAmountInput('')
      setNoteInput('')
      setPaymentFields({ method: 'mobile', phone: '', provider: '' })
    },
    onFailed: () => {
      setSaving(false)
      pendingTopUpRef.current = null
      setError('Payment was not completed or was declined. Please try again.')
    },
  })

  useEffect(() => {
    if (!user) return
    fetchBookings()
    loadTopUps()
    fetchTopUpsFromDatabase()
  }, [user])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      setError('')
      const { data, error: dbError } = await supabase
        .from('bookings')
        .select(`id, total_amount, currency, status, created_at, services (title)`)
        .eq('tourist_id', user?.id)
        .order('created_at', { ascending: false })
      if (dbError) throw dbError
      setBookings((data as unknown as Booking[]) || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load wallet activity')
    } finally {
      setLoading(false)
    }
  }

  const confirmedSpendBookings = useMemo(
    () => bookings.filter((booking) => booking.status === 'confirmed' || booking.status === 'completed'),
    [bookings]
  )

  const totalSaved = useMemo(
    () => topUps.reduce((sum, topUp) => sum + convertCurrency(topUp.amount, topUp.currency, displayCurrency), 0),
    [topUps, displayCurrency]
  )

  const totalSpent = useMemo(
    () => confirmedSpendBookings.reduce((sum, booking) => sum + convertCurrency(booking.total_amount, booking.currency, displayCurrency), 0),
    [confirmedSpendBookings, displayCurrency]
  )

  const balance = totalSaved - totalSpent

  const activities = useMemo<WalletActivity[]>(() => {
    const topUpActivities = topUps.map((topUp) => ({
      id: `topup-${topUp.id}`,
      type: 'topup' as const,
      amount: topUp.amount,
      currency: topUp.currency,
      title: topUp.note?.trim() ? topUp.note : 'Wallet top up',
      created_at: topUp.created_at,
    }))
    const spendActivities = confirmedSpendBookings.map((booking) => {
      const svc = booking.services as any
      const title = Array.isArray(svc) ? svc[0]?.title : svc?.title
      return {
        id: `spend-${booking.id}`,
        type: 'spend' as const,
        amount: booking.total_amount,
        currency: booking.currency,
        title: title || 'Service booking',
        created_at: booking.created_at,
      }
    })
    return [...topUpActivities, ...spendActivities]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
  }, [topUps, confirmedSpendBookings])

  const handleAddFunds = async () => {
    const amount = Number(amountInput)
    if (!amount || amount <= 0) {
      setError('Enter a valid amount to add')
      return
    }

    if (isMobileUiMethod(paymentFields.method)) {
      const errs = getMarzpayMobileValidationErrors(paymentFields)
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs)
        setError(errs.phone || errs.mobileProvider || 'Complete mobile money details.')
        return
      }
    }

    const reference = `WALLET_TOPUP_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    const isCard = paymentFields.method === 'card'
    pendingTopUpRef.current = {
      amount,
      note: noteInput.trim()
        ? `${noteInput.trim()} • ${isCard ? 'Card' : `Mobile Money (${paymentFields.phone.trim()})`}`
        : isCard ? 'Card top-up' : `Mobile Money (${paymentFields.phone.trim()})`,
      reference,
      payment_method: isCard ? 'card' : 'mobile_money',
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')
      setPaymentError(null)
      setFieldErrors({})
      await pay({
        amount: Math.round(amount),
        method: paymentFields.method,
        phone: paymentFields.phone,
        description: `Wallet top-up - ${reference}`,
        metadata: { type: 'wallet_topup', reference },
      })
    } catch (err: any) {
      console.error('[Wallet] Payment error:', err)
      setError(err.message || 'Failed to initiate payment. Please try again.')
      setSaving(false)
      pendingTopUpRef.current = null
    }
  }

  const handleCancelPayment = () => {
    cleanup()
    resetPayment()
    setSaving(false)
    pendingTopUpRef.current = null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const mobileIncomplete = isMobileUiMethod(paymentFields.method) && (!paymentFields.provider || !paymentFields.phone.trim())

  return (
    <div className="min-h-screen bg-gray-50">
      {paymentSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setPaymentSuccess(false)}></div>
          <div className="relative bg-white rounded-xl shadow-lg max-w-md w-full p-6 z-10">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2 text-center">Payment Successful!</h2>
            <p className="text-sm text-gray-700 mb-4 text-center">
              Your wallet has been topped up successfully. The funds are now available in your balance.
            </p>
            <div className="flex justify-center">
              <button type="button" onClick={() => setPaymentSuccess(false)} className="px-6 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <Link to="/profile" className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">My Wallet</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">Save money and monitor your service spending in one place.</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600">Saved</p>
              <PiggyBank className="h-5 w-5 text-gray-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-semibold text-gray-900">
              {formatCurrencyWithConversion(totalSaved, displayCurrency, displayCurrency, selectedLanguage || 'en-US')}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600">Spent on services</p>
              <TrendingDown className="h-5 w-5 text-gray-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-semibold text-gray-900">
              {formatCurrencyWithConversion(totalSpent, displayCurrency, displayCurrency, selectedLanguage || 'en-US')}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600">Available balance</p>
              <WalletIcon className="h-5 w-5 text-gray-500" />
            </div>
            <p className={`text-2xl sm:text-3xl font-semibold ${balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              {formatCurrencyWithConversion(balance, displayCurrency, displayCurrency, selectedLanguage || 'en-US')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 h-fit">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add funds</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ({displayCurrency})</label>
                <input type="number" min="0" step="0.01" value={amountInput} onChange={(e) => setAmountInput(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                <input type="text" value={noteInput} onChange={(e) => setNoteInput(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="e.g. Weekend travel budget" />
              </div>

              <MarzpayPaymentFields
                name="walletPaymentMethod"
                value={paymentFields}
                onChange={(value) => {
                  setPaymentFields(value)
                  setFieldErrors({})
                  setError('')
                }}
                errors={fieldErrors}
                onClearError={(field) => setFieldErrors(p => { const n = { ...p }; delete n[field]; return n })}
              />

              {processing && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-gray-600" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    <div className="text-sm text-gray-700">{pollingMessage || 'Processing payment...'}</div>
                  </div>
                  <button type="button" onClick={handleCancelPayment} className="mt-3 text-sm text-gray-500 hover:text-gray-700 underline">
                    Cancel
                  </button>
                </div>
              )}

              <button
                onClick={handleAddFunds}
                disabled={saving || processing || mobileIncomplete}
                className="w-full min-h-[48px] inline-flex items-center justify-center bg-gray-900 text-white font-medium px-4 py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>Processing...</>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    {paymentFields.method === 'card' ? 'Add Funds with card' : 'Add Funds via Mobile Money'}
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent wallet activity</h2>
            {activities.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-gray-300 rounded-xl bg-gray-50">
                <WalletIcon className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600">No activity yet. Add funds or make a booking to start tracking.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 sm:p-4 rounded-xl border border-gray-200 bg-gray-50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{new Date(activity.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right ml-3">
                      <p className={`text-sm sm:text-base font-semibold ${activity.type === 'topup' ? 'text-green-700' : 'text-gray-900'}`}>
                        {activity.type === 'topup' ? '+' : '-'}
                        {formatCurrencyWithConversion(activity.amount, activity.currency, displayCurrency, selectedLanguage || 'en-US')}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">{activity.type === 'topup' ? 'Saved' : 'Spent'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
