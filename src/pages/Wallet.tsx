import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, PlusCircle, TrendingDown, PiggyBank, Wallet as WalletIcon, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePreferences } from '../contexts/PreferencesContext'
import { supabase } from '../lib/supabaseClient'
import { Booking } from '../lib/database'
import { convertCurrency, formatCurrencyWithConversion } from '../lib/utils'
import type { RealtimeChannel } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

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
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mobile_money' | 'bank_transfer'>('mobile_money')
  const [mobileProvider, setMobileProvider] = useState<'MTN' | 'Airtel' | ''>('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Payment processing states
  const [processing, setProcessing] = useState(false)
  const [pollingMessage, setPollingMessage] = useState('')
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const paymentChannelRef = useRef<RealtimeChannel | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const completionHandledRef = useRef(false)
  const pendingTopUpRef = useRef<{ amount: number; note: string; reference: string } | null>(null)

  const displayCurrency = selectedCurrency || 'UGX'
  const storageKey = user ? `dt_wallet_topups_${user.id}` : ''

  useEffect(() => {
    if (user) {
      fetchBookings()
      loadTopUps()
      fetchTopUpsFromDatabase()
    }
  }, [user])

  const loadTopUps = () => {
    if (!storageKey) return

    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) {
        setTopUps([])
        return
      }

      const parsed = JSON.parse(raw) as WalletTopUp[]
      if (Array.isArray(parsed)) {
        setTopUps(parsed)
      }
    } catch {
      setTopUps([])
    }
  }

  const persistTopUps = (nextTopUps: WalletTopUp[]) => {
    if (!storageKey) return
    localStorage.setItem(storageKey, JSON.stringify(nextTopUps))
  }

  // Payment status checking
  const checkStatus = async (ref: string): Promise<'completed' | 'failed' | null> => {
    try {
      const url = `${supabaseUrl}/functions/v1/marzpay-payment-status?reference=${encodeURIComponent(ref)}&_ts=${Date.now()}`
      const res = await fetch(url, { cache: 'no-store' })
      const raw = await res.text()
      const data = JSON.parse(raw || '{}') as { status?: string }
      if (data?.status === 'completed') return 'completed'
      if (data?.status === 'failed') return 'failed'
      return null
    } catch {
      return null
    }
  }

  // Exponential backoff delays for polling
  const BACKOFF_DELAYS_MS = [500, 1000, 2000, 4000, 8000, 16000, 32000]
  const POLL_TIMEOUT_MS = 90_000

  const recordSuccessfulTopUp = useCallback(async () => {
    const pending = pendingTopUpRef.current
    if (!pending || !user) return

    const nextTopUp: WalletTopUp = {
      id: crypto.randomUUID(),
      amount: pending.amount,
      currency: displayCurrency,
      note: pending.note || 'Wallet top up via Mobile Money',
      payment_method: 'mobile_money',
      reference: pending.reference,
      created_at: new Date().toISOString()
    }

    const nextTopUps = [nextTopUp, ...topUps]
    setTopUps(nextTopUps)
    persistTopUps(nextTopUps)

    // Record in database
    const { error: insertError } = await supabase
      .from('transactions')
      .insert({
        booking_id: null,
        vendor_id: null,
        tourist_id: user.id,
        amount: pending.amount,
        currency: displayCurrency,
        transaction_type: 'payment',
        status: 'completed',
        payment_method: 'mobile_money',
        reference: pending.reference
      })

    if (!insertError) {
      await fetchTopUpsFromDatabase()
    }

    pendingTopUpRef.current = null
  }, [user, topUps, displayCurrency, storageKey])

  const startWatchingReference = async (ref: string): Promise<void> => {
    completionHandledRef.current = false
    setPollingMessage('Check your phone — a USSD prompt should appear shortly.')

    abortControllerRef.current?.abort()
    const abort = new AbortController()
    abortControllerRef.current = abort

    // Progressive status messages
    const messages: [number, string][] = [
      [8000, 'Enter your PIN on the USSD prompt to confirm payment.'],
      [20000, 'Still waiting… Airtel payments can take up to 60 seconds.'],
      [40000, 'Almost there — waiting for network confirmation.'],
      [65000, 'Taking longer than usual. If no prompt appeared, you can try again.'],
    ]
    for (const [delay, msg] of messages) {
      setTimeout(() => {
        if (!abort.signal.aborted && !completionHandledRef.current) setPollingMessage(msg)
      }, delay)
    }

    const cleanup = () => {
      abort.abort()
      if (paymentChannelRef.current) {
        paymentChannelRef.current.unsubscribe()
        paymentChannelRef.current = null
      }
    }

    const handleCompleted = async () => {
      if (completionHandledRef.current) return
      completionHandledRef.current = true
      cleanup()
      setProcessing(false)
      setPollingMessage('')
      setPaymentSuccess(true)
      await recordSuccessfulTopUp()
      setAmountInput('')
      setNoteInput('')
      setMobileNumber('')
      setMobileProvider('')
    }

    const handleFailed = () => {
      if (completionHandledRef.current) return
      completionHandledRef.current = true
      cleanup()
      setPollingMessage('')
      setProcessing(false)
      pendingTopUpRef.current = null
      setError('Payment was not completed or was declined. Please try again.')
    }

    // Realtime subscription
    const channel = supabase
      .channel(`wallet_payment_${ref}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payments', filter: `reference=eq.${ref}` },
        (payload) => {
          const row = payload.new as { status: string }
          if (row.status === 'completed') handleCompleted()
          else if (row.status === 'failed') handleFailed()
        }
      )
      .subscribe()
    paymentChannelRef.current = channel

    // Exponential backoff polling as safety net
    ;(async () => {
      const deadline = Date.now() + POLL_TIMEOUT_MS
      for (let i = 0; i < BACKOFF_DELAYS_MS.length; i++) {
        await new Promise<void>(r => setTimeout(r, BACKOFF_DELAYS_MS[i]))
        if (abort.signal.aborted) return
        if (completionHandledRef.current) return
        if (Date.now() > deadline) return

        const status = await checkStatus(ref)
        if (abort.signal.aborted) return
        if (status === 'completed') { handleCompleted(); return }
        if (status === 'failed') { handleFailed(); return }
      }
    })()
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
      if (paymentChannelRef.current) {
        paymentChannelRef.current.unsubscribe()
        paymentChannelRef.current = null
      }
    }
  }, [])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      setError('')

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          total_amount,
          currency,
          status,
          created_at,
          services (
            title
          )
        `)
        .eq('tourist_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setBookings((data as unknown as Booking[]) || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load wallet activity')
    } finally {
      setLoading(false)
    }
  }

  const fetchTopUpsFromDatabase = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, amount, currency, payment_method, reference, created_at')
        .eq('tourist_id', user.id)
        .eq('transaction_type', 'payment')
        .ilike('reference', 'WALLET_TOPUP_%')
        .order('created_at', { ascending: false })

      if (error) return

      const normalizedTopUps: WalletTopUp[] = (data || []).map((transaction: any) => ({
        id: transaction.id,
        amount: Number(transaction.amount) || 0,
        currency: transaction.currency || 'UGX',
        payment_method: (transaction.payment_method || 'mobile_money') as 'card' | 'mobile_money' | 'bank_transfer',
        reference: transaction.reference || undefined,
        created_at: transaction.created_at
      }))

      if (normalizedTopUps.length > 0) {
        setTopUps(normalizedTopUps)
        persistTopUps(normalizedTopUps)
      }
    } catch {
      // Keep local data as fallback if DB read fails
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
      created_at: topUp.created_at
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
        created_at: booking.created_at
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

    if (paymentMethod === 'mobile_money') {
      if (!mobileProvider) {
        setError('Select a mobile money provider (MTN or Airtel)')
        return
      }
      if (!mobileNumber.trim()) {
        setError('Enter your mobile money number to continue')
        return
      }
    }

    if (paymentMethod === 'card') {
      setError('Card payments are not available yet. Please use Mobile Money.')
      return
    }

    // Normalize phone number
    const rawPhone = mobileNumber.trim().replace(/^\+256/, '')
    const phone = rawPhone.startsWith('+') ? rawPhone : `+256${rawPhone.replace(/^0/, '')}`

    if (!phone || phone.length < 10) {
      setError('Please enter a valid mobile money phone number (e.g. 0712345678 or +256712345678).')
      return
    }

    try {
      setProcessing(true)
      setSaving(true)
      setError('')
      setSuccess('')
      setPollingMessage('')

      const reference = `WALLET_TOPUP_${Date.now()}_${Math.floor(Math.random() * 1000)}`
      
      // Store pending top-up details for when payment completes
      pendingTopUpRef.current = {
        amount,
        note: noteInput.trim() ? `${noteInput.trim()} • Mobile Money (${mobileNumber.trim()})` : `Mobile Money (${mobileNumber.trim()})`,
        reference
      }

      // Call marzpay-collect API
      const { data: session } = await supabase.auth.getSession()
      const collectRes = await fetch(`${supabaseUrl}/functions/v1/marzpay-collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          amount: Math.round(amount),
          phone_number: phone,
          description: `Wallet top-up - ${reference}`,
          user_id: session?.session?.user?.id || undefined,
          metadata: { type: 'wallet_topup', reference }
        }),
      })

      const result = (await collectRes.json().catch(() => ({}))) as {
        success?: boolean
        error?: string
        details?: unknown
        data?: { reference: string; status: string }
      }

      if (!collectRes.ok) {
        const msg = result?.error || `Payment initiation failed (${collectRes.status})`
        throw new Error(msg)
      }
      if (!result?.success || !result?.data?.reference) {
        throw new Error(result?.error || 'Payment initiation failed')
      }

      // Start watching for payment completion
      const paymentRef = result.data.reference
      pendingTopUpRef.current.reference = paymentRef
      await startWatchingReference(paymentRef)
      
    } catch (err: any) {
      console.error('[Wallet] Payment error:', err)
      setError(err.message || 'Failed to initiate payment. Please try again.')
      setProcessing(false)
      setSaving(false)
      pendingTopUpRef.current = null
    }
  }

  const handleCancelPayment = () => {
    abortControllerRef.current?.abort()
    if (paymentChannelRef.current) {
      paymentChannelRef.current.unsubscribe()
      paymentChannelRef.current = null
    }
    setProcessing(false)
    setSaving(false)
    setPollingMessage('')
    pendingTopUpRef.current = null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Payment Success Modal */}
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
              <button
                type="button"
                onClick={() => setPaymentSuccess(false)}
                className="px-6 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <Link
            to="/profile"
            className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 mb-4 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
          >
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
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountInput}
                  onChange={(event) => setAmountInput(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-400"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                <input
                  type="text"
                  value={noteInput}
                  onChange={(event) => setNoteInput(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-400"
                  placeholder="e.g. Weekend travel budget"
                />
              </div>

              <div>
                <p className="block text-sm font-medium text-gray-700 mb-2">Payment Method</p>
                
                {/* Mobile Money Option */}
                <div className={`flex items-center justify-between p-3 rounded-lg border ${paymentMethod === 'mobile_money' ? 'border-gray-900 bg-gray-50' : 'border-gray-200'} cursor-pointer mb-2`}
                  onClick={() => setPaymentMethod('mobile_money')}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="mobile_money"
                      checked={paymentMethod === 'mobile_money'}
                      onChange={() => setPaymentMethod('mobile_money')}
                      className="w-4 h-4"
                    />
                    <div className="text-sm font-medium">Mobile Money</div>
                  </label>
                  <div className="text-sm text-gray-400">→</div>
                </div>

                {/* Credit/Debit Card - coming soon */}
                <div className="p-3 border border-gray-200 rounded-lg text-sm text-gray-500 opacity-70">
                  <div className="flex items-center justify-between">
                    <span>Credit/Debit Card (coming soon)</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <div className="flex items-center gap-1 px-1 py-0.5 border rounded bg-white">
                      <svg width="20" height="12" viewBox="0 0 28 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                        <rect width="28" height="18" rx="3" fill="#1A66FF" />
                        <text x="14" y="12" fill="#fff" fontSize="6" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">VISA</text>
                      </svg>
                    </div>
                    <div className="flex items-center gap-1 px-1 py-0.5 border rounded bg-white">
                      <svg width="20" height="12" viewBox="0 0 28 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                        <rect width="28" height="18" rx="3" fill="#fff" />
                        <circle cx="11" cy="9" r="4" fill="#FF5F00" />
                        <circle cx="17" cy="9" r="4" fill="#EB001B" />
                      </svg>
                    </div>
                    <div className="flex items-center gap-1 px-1 py-0.5 border rounded bg-white">
                      <svg width="20" height="12" viewBox="0 0 28 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                        <rect width="28" height="18" rx="3" fill="#2E77BC" />
                        <text x="14" y="12" fill="#fff" fontSize="5" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">AMEX</text>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {paymentMethod === 'mobile_money' && (
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Select provider to continue</div>
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => setMobileProvider('MTN')} 
                        className={`flex-1 py-2.5 rounded-lg border flex items-center justify-center gap-2 transition-colors ${mobileProvider === 'MTN' ? 'border-gray-900 bg-gray-100' : 'border-gray-200 hover:bg-gray-50'}`}
                      >
                        <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                          <rect width="18" height="14" rx="2" fill="#FFD200" />
                          <text x="9" y="10" fill="#000" fontSize="7" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">MTN</text>
                        </svg>
                        <span className="text-sm font-medium">MTN</span>
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setMobileProvider('Airtel')} 
                        className={`flex-1 py-2.5 rounded-lg border flex items-center justify-center gap-2 transition-colors ${mobileProvider === 'Airtel' ? 'border-gray-900 bg-gray-100' : 'border-gray-200 hover:bg-gray-50'}`}
                      >
                        <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                          <rect width="18" height="14" rx="2" fill="#E60000" />
                          <text x="9" y="10" fill="#fff" fontSize="6" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">A</text>
                        </svg>
                        <span className="text-sm font-medium">Airtel</span>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(event) => setMobileNumber(event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-400"
                      placeholder="0712345678 or +256712345678"
                      disabled={processing}
                    />
                  </div>
                </div>
              )}

              {/* Processing / Payment Status */}
              {processing && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-gray-600" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    <div className="text-sm text-gray-700">{pollingMessage || 'Processing payment...'}</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelPayment}
                    className="mt-3 text-sm text-gray-500 hover:text-gray-700 underline"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <button
                onClick={handleAddFunds}
                disabled={saving || processing || (paymentMethod === 'mobile_money' && (!mobileProvider || !mobileNumber.trim()))}
                className="w-full min-h-[48px] inline-flex items-center justify-center bg-gray-900 text-white font-medium px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-all duration-200 ease-out disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
              >
                {processing ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Funds via Mobile Money
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
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 sm:p-4 rounded-xl border border-gray-200 bg-gray-50"
                  >
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