import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TreePine, Coins, TrendingUp, Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { getSession } from '../../services/AuthService'

type CreditPrice = {
  sku: string
  name: string
  description: string
  unit: string
  amount: number
  currency: string
  min_quantity: number
}

type Balance = {
  credits_remaining: number
  active_batches: number
  oldest_expires_at: string | null
}

export default function TreeCreditStore() {
  const navigate = useNavigate()
  const [prices, setPrices] = useState<CreditPrice[]>([])
  const [balance, setBalance] = useState<Balance | null>(null)
  const [selectedSku, setSelectedSku] = useState<string>('tree_credit_starter')
  const [credits, setCredits] = useState<number>(100)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await supabase.functions.invoke('tree-credits?pricing')
        if (!cancelled && !res.error) setPrices((res.data?.data || []) as CreditPrice[])

        const session = await getSession()
        if (session?.user) {
          const balRes = await supabase.functions.invoke('tree-credits/balance', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
          if (!balRes.error) setBalance(balRes.data?.data || null)
        }
      } catch (e) {
        console.error('Failed to load credit store', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const selectedPrice = prices.find((p) => p.sku === selectedSku)
  const total = selectedPrice ? Number((selectedPrice.amount * credits).toFixed(2)) : 0

  const handlePurchase = async () => {
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const session = await getSession()
      if (!session?.user) {
        navigate('/login?redirect=/conservation/credits')
        return
      }
      const res = await supabase.functions.invoke('tree-credits/purchase', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { sku: selectedSku, credits },
      })
      if (res.error) throw new Error(res.error.message || 'Purchase failed')
      const data = res.data?.data
      if (data?.pay_url) window.location.href = data.pay_url
      else setSuccess(`Batch created — reference ${data?.reference}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-full bg-emerald-500/10">
          <Coins className="h-7 w-7 text-emerald-700" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Tree Credits</h1>
          <p className="text-gray-600">
            Buy per-tree credits in bulk. Each credit maps to one GPS-verified planting you can
            track, monitor, and report on.
          </p>
        </div>
      </div>

      {balance && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg border p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Credits remaining</p>
            <p className="text-2xl font-bold text-emerald-700">{balance.credits_remaining.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Active batches</p>
            <p className="text-2xl font-bold text-gray-900">{balance.active_batches}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Oldest expiry</p>
            <p className="text-sm font-semibold text-gray-900">
              {balance.oldest_expires_at
                ? new Date(balance.oldest_expires_at).toLocaleDateString()
                : 'No expiry'}
            </p>
          </div>
        </div>
      )}

      {error && <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>}
      {success && (
        <div className="mb-4 p-3 rounded bg-emerald-50 text-emerald-700 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {success}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading pricing…
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            {prices.map((p) => {
              const active = p.sku === selectedSku
              return (
                <button
                  key={p.sku}
                  type="button"
                  onClick={() => {
                    setSelectedSku(p.sku)
                    setCredits(Math.max(p.min_quantity, credits))
                  }}
                  className={`text-left rounded-xl border p-5 transition ${
                    active ? 'border-emerald-600 ring-2 ring-emerald-500/30 bg-emerald-50' : 'hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{p.name}</h3>
                    <TreePine className="h-5 w-5 text-emerald-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{p.description}</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    ${p.amount.toFixed(2)}
                    <span className="text-sm font-normal text-gray-500"> / tree credit</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Minimum {p.min_quantity.toLocaleString()} credits</p>
                </button>
              )
            })}
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold mb-4">How many credits?</h2>
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <input
                type="number"
                min={selectedPrice?.min_quantity ?? 1}
                step={100}
                value={credits}
                onChange={(e) => setCredits(Math.max(1, Number(e.target.value || 0)))}
                className="border rounded px-3 py-2 w-40"
              />
              <div className="flex gap-2">
                {[100, 500, 1000, 5000, 10000].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setCredits(q)}
                    className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
                  >
                    {q.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <p className="text-sm text-gray-600">
                  {credits.toLocaleString()} credits × ${selectedPrice?.amount.toFixed(2) ?? '0.00'}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  ${total.toLocaleString()} {selectedPrice?.currency ?? 'USD'}
                </p>
              </div>
              <button
                type="button"
                onClick={handlePurchase}
                disabled={submitting || credits < (selectedPrice?.min_quantity ?? 1)}
                className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Buy credits
              </button>
            </div>
          </div>
        </>
      )}

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <div className="flex gap-3">
          <TreePine className="h-5 w-5 text-emerald-700 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Verified planting</h4>
            <p className="text-sm text-gray-600">
              Credits convert to GPS-tagged trees that rangers monitor and photograph.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <TrendingUp className="h-5 w-5 text-emerald-700 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Impact statistics</h4>
            <p className="text-sm text-gray-600">
              Pull live counts, species mix, and CO₂ removed into ESG reports.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Coins className="h-5 w-5 text-emerald-700 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Volume discounts</h4>
            <p className="text-sm text-gray-600">
              Unit price drops at 1,000 and 10,000 credits with no lock-in.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
