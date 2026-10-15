import { useEffect, useState } from 'react'
import { Cloud, Leaf, Award, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { getSession } from '../../services/AuthService'

type OffsetPrice = {
  sku: string
  name: string
  description: string
  amount: number
  currency: string
  min_quantity: number
}

// Conservative conversion: 1 tonne CO2e = 1000 kg.
// 22 kg absorbed per tree per year over a 10-year horizon → 220 kg/tree.
// 1000 / 220 ≈ 4.55 trees per tonne. Matches the edge function and the
// carbon calculator so we never overclaim impact.
const TREES_PER_TONNE = 4.55

export default function CarbonOffsetPurchase() {
  const [prices, setPrices] = useState<OffsetPrice[]>([])
  const [tonnes, setTonnes] = useState<number>(1)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await supabase.functions.invoke('carbon-offsets/pricing')
        if (!cancelled) setPrices((res.data?.data || []) as OffsetPrice[])
        const session = await getSession()
        if (!cancelled && session?.user?.email) setEmail(session.user.email)
      } catch (e) {
        console.error('Failed to load offset pricing', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const basePrice = prices.find((p) => p.sku === 'carbon_offset_tonne')
  const bulkPrice = prices.find((p) => p.sku === 'carbon_offset_tonne_bulk')
  const bulkThreshold = bulkPrice?.min_quantity ?? 50

  // Server picks the tier, but we mirror it for honest display.
  const effectiveUnit =
    bulkPrice && tonnes >= bulkThreshold ? bulkPrice.amount : basePrice?.amount ?? 0
  const total = Number((effectiveUnit * tonnes).toFixed(2))
  const trees = Math.max(1, Math.ceil(tonnes * TREES_PER_TONNE))

  const handlePurchase = async () => {
    setSubmitting(true)
    setError('')
    try {
      if (!email.trim()) {
        setError('Please provide an email for your certificate')
        setSubmitting(false)
        return
      }
      const session = await getSession()
      const res = await supabase.functions.invoke('carbon-offsets/purchase', {
        method: 'POST',
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
        body: {
          tonnes_co2e: tonnes,
          sku: 'carbon_offset_tonne',
          buyer_email: email.trim(),
        },
      })
      if (res.error) throw new Error(res.error.message || 'Purchase failed')
      const data = res.data?.data
      if (data?.pay_url) window.location.href = data.pay_url
      else setError('Unable to start checkout. Please try again.')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-full bg-sky-500/10">
          <Cloud className="h-7 w-7 text-sky-700" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Offset Your Carbon</h1>
          <p className="text-gray-600">
            Purchase verified tonnes of CO₂e removed by DirtTrails reforestation. Every tonne is
            retired with a certificate and GPS-verified tree tracking.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading pricing…
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 mb-8">
            <div className="rounded-xl border p-5">
              <h3 className="font-semibold text-gray-900 mb-1">Single tonne</h3>
              <p className="text-2xl font-bold text-sky-700">
                ${basePrice?.amount.toFixed(2) ?? '—'}
                <span className="text-sm font-normal text-gray-500"> / tonne CO₂e</span>
              </p>
              <p className="text-sm text-gray-600 mt-2">Retirement certificate + tree tracking.</p>
            </div>
            <div
              className={`rounded-xl border p-5 ${
                tonnes >= bulkThreshold ? 'border-sky-600 bg-sky-50' : ''
              }`}
            >
              <h3 className="font-semibold text-gray-900 mb-1">
                Bulk — {bulkThreshold}+ tonnes
              </h3>
              <p className="text-2xl font-bold text-sky-700">
                ${bulkPrice?.amount.toFixed(2) ?? '—'}
                <span className="text-sm font-normal text-gray-500"> / tonne CO₂e</span>
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Volume pricing with the same audit trail. Applied automatically at checkout.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold mb-4">How many tonnes?</h2>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <input
                type="number"
                min={1}
                step={0.5}
                value={tonnes}
                onChange={(e) => setTonnes(Math.max(0.5, Number(e.target.value || 0)))}
                className="border rounded px-3 py-2 w-40"
              />
              {[1, 5, 10, 50, 100].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setTonnes(q)}
                  className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
                >
                  {q} t
                </button>
              ))}
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email for your certificate
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="border rounded px-3 py-2 w-full max-w-sm mb-4"
            />

            {error && (
              <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>
            )}

            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <p className="text-sm text-gray-600">
                  {tonnes} tonne{tonnes === 1 ? '' : 's'} × ${effectiveUnit.toFixed(2)} ≈ {trees} trees
                </p>
                <p className="text-2xl font-bold text-gray-900">${total.toLocaleString()} USD</p>
              </div>
              <button
                type="button"
                onClick={handlePurchase}
                disabled={submitting || tonnes <= 0}
                className="px-5 py-2.5 rounded-lg bg-sky-600 text-white font-medium hover:bg-sky-500 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Buy offset
              </button>
            </div>
          </div>
        </>
      )}

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <div className="flex gap-3">
          <Leaf className="h-5 w-5 text-emerald-700 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Native species</h4>
            <p className="text-sm text-gray-600">
              Plantings use indigenous species verified by local rangers.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Award className="h-5 w-5 text-emerald-700 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Serialized certificates</h4>
            <p className="text-sm text-gray-600">
              Each purchase issues a unique, publicly verifiable certificate number.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Cloud className="h-5 w-5 text-sky-700 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Conservative math</h4>
            <p className="text-sm text-gray-600">
              22 kg CO₂ per tree per year over a 10-year horizon — no overclaiming.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
