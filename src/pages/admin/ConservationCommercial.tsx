import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  Building2,
  Coins,
  Cloud,
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react'

type Company = {
  id: string
  company_name: string
  contact_email: string | null
  tier: string | null
  status: string | null
  api_key: string
  api_call_limit: number | null
  api_calls_used: number | null
  created_at: string
}

type CreditBatch = {
  id: string
  company_id: string
  sku: string
  credits_purchased: number
  credits_remaining: number
  total_amount: number
  currency: string
  status: string
  reference: string | null
  created_at: string
}

type OffsetOrder = {
  id: string
  company_id: string | null
  tonnes_co2e: number
  total_amount: number
  currency: string
  status: string
  reference: string | null
  certificate_number: string | null
  buyer_email: string | null
  created_at: string
}

const SKU_LABEL: Record<string, string> = {
  tree_credit_starter: 'Starter',
  tree_credit_growth: 'Growth',
  tree_credit_enterprise: 'Enterprise',
  carbon_offset_tonne: 'Single tonne',
  carbon_offset_tonne_bulk: 'Bulk 50t+',
}

const statusClass = (status: string) => {
  switch (status) {
    case 'active':
    case 'paid':
    case 'retired':
      return 'bg-emerald-100 text-emerald-800'
    case 'pending':
      return 'bg-amber-100 text-amber-800'
    case 'suspended':
    case 'failed':
    case 'refunded':
    case 'churned':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export default function AdminConservationCommercial() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [batches, setBatches] = useState<CreditBatch[]>([])
  const [orders, setOrders] = useState<OffsetOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'companies' | 'credits' | 'offsets'>('companies')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [companiesRes, batchesRes, ordersRes] = await Promise.all([
        supabase
          .from('company_subscriptions')
          .select(
            'id, company_name, contact_email, tier, status, api_key, api_call_limit, api_calls_used, created_at',
          )
          .order('created_at', { ascending: false }),
        supabase
          .from('tree_credit_batches')
          .select(
            'id, company_id, sku, credits_purchased, credits_remaining, total_amount, currency, status, reference, created_at',
          )
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('carbon_offset_orders')
          .select(
            'id, company_id, tonnes_co2e, total_amount, currency, status, reference, certificate_number, buyer_email, created_at',
          )
          .order('created_at', { ascending: false })
          .limit(100),
      ])

      if (companiesRes.error) throw companiesRes.error
      if (batchesRes.error) throw batchesRes.error
      if (ordersRes.error) throw ordersRes.error

      setCompanies((companiesRes.data || []) as Company[])
      setBatches((batchesRes.data || []) as CreditBatch[])
      setOrders((ordersRes.data || []) as OffsetOrder[])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const rotateApiKey = async (id: string) => {
    if (!confirm('Rotate this API key? The old key stops working immediately.')) return
    const { data, error: rpcErr } = await supabase.rpc('generate_company_api_key')
    const key = data as unknown as string
    if (rpcErr || !key) {
      setError(rpcErr?.message || 'Could not generate a new API key')
      return
    }
    const { error: updErr } = await supabase
      .from('company_subscriptions')
      .update({ api_key: key })
      .eq('id', id)
    if (updErr) {
      setError(updErr.message)
      return
    }
    setSuccess('API key rotated')
    setTimeout(() => setSuccess(''), 4000)
    load()
  }

  const activateBatch = async (id: string) => {
    if (!confirm('Mark this batch as paid? This grants the credits to the company.')) return
    const { error: updErr } = await supabase
      .from('tree_credit_batches')
      .update({ status: 'paid' })
      .eq('id', id)
    if (updErr) {
      setError(updErr.message)
      return
    }
    setSuccess('Credit batch activated')
    setTimeout(() => setSuccess(''), 4000)
    load()
  }

  const retireOrder = async (id: string) => {
    if (!confirm('Mark this offset order as retired? A certificate is required.')) return
    const year = new Date().getFullYear()
    const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()
    const { error: updErr } = await supabase
      .from('carbon_offset_orders')
      .update({
        status: 'retired',
        certificate_number: `DT-OFFSET-${year}-${rand}`,
        retired_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (updErr) {
      setError(updErr.message)
      return
    }
    setSuccess('Offset order retired with certificate')
    setTimeout(() => setSuccess(''), 4000)
    load()
  }

  const toggleCompanyStatus = async (id: string, status: string | null) => {
    const next = status === 'active' ? 'suspended' : 'active'
    const { error: updErr } = await supabase
      .from('company_subscriptions')
      .update({ status: next })
      .eq('id', id)
    if (updErr) {
      setError(updErr.message)
      return
    }
    setSuccess(`Company ${next}`)
    setTimeout(() => setSuccess(''), 4000)
    load()
  }

  const totals = useMemo(
    () => ({
      companies: companies.length,
      creditsSold: batches
        .filter((b) => b.status === 'paid')
        .reduce((s, b) => s + (b.credits_purchased ?? 0), 0),
      creditsLeft: batches
        .filter((b) => b.status === 'paid')
        .reduce((s, b) => s + (b.credits_remaining ?? 0), 0),
      tonnes: orders
        .filter((o) => o.status === 'paid' || o.status === 'retired')
        .reduce((s, o) => s + Number(o.tonnes_co2e ?? 0), 0),
      revenue: [
        ...batches.filter((b) => b.status === 'paid'),
        ...orders.filter((o) => o.status === 'paid' || o.status === 'retired'),
      ].reduce((s, r) => s + Number(r.total_amount ?? 0), 0),
    }),
    [companies, batches, orders],
  )

  const q = search.toLowerCase()
  const filteredCompanies = companies.filter(
    (c) =>
      !q ||
      c.company_name.toLowerCase().includes(q) ||
      (c.contact_email ?? '').toLowerCase().includes(q),
  )
  const filteredBatches = batches.filter(
    (b) => !q || b.company_id.toLowerCase().includes(q) || (b.reference ?? '').includes(search),
  )
  const filteredOrders = orders.filter(
    (o) =>
      !q ||
      (o.buyer_email ?? '').toLowerCase().includes(q) ||
      (o.company_id ?? '').toLowerCase().includes(q) ||
      (o.reference ?? '').includes(search),
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Conservation Commercialization</h1>
          <p className="text-sm text-gray-600">
            Manage companies, tree credit batches, verified offset orders, and API keys.
          </p>
        </div>
        <button
          onClick={load}
          className="px-3 py-2 border rounded flex items-center gap-2 text-sm hover:bg-gray-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Stat
          label="Companies"
          value={totals.companies}
          icon={<Building2 className="h-4 w-4 text-indigo-600" />}
        />
        <Stat
          label="Credits sold"
          value={totals.creditsSold.toLocaleString()}
          icon={<Coins className="h-4 w-4 text-emerald-600" />}
        />
        <Stat
          label="Credits left"
          value={totals.creditsLeft.toLocaleString()}
          icon={<Coins className="h-4 w-4 text-teal-600" />}
        />
        <Stat
          label="Tonnes retired"
          value={Number(totals.tonnes.toFixed(2))}
          icon={<Cloud className="h-4 w-4 text-sky-600" />}
        />
        <Stat
          label="Revenue (USD)"
          value={`$${totals.revenue.toLocaleString()}`}
          icon={<ShieldCheck className="h-4 w-4 text-amber-600" />}
        />
      </div>

      {error && <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>}
      {success && (
        <div className="mb-4 p-3 rounded bg-emerald-50 text-emerald-700 text-sm">{success}</div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-2">
          {(['companies', 'credits', 'offsets'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-sm rounded border capitalize ${
                tab === t ? 'bg-gray-900 text-white border-gray-900' : 'hover:bg-gray-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, email, or reference"
            className="w-full pl-9 pr-3 py-2 border rounded text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 py-12 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : tab === 'companies' ? (
        <div className="bg-white border rounded-lg overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                {['Company', 'Contact', 'Tier', 'Status', 'API quota', 'API key', 'Actions'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-3 py-2 font-medium text-gray-900">{c.company_name}</td>
                  <td className="px-3 py-2 text-gray-600">{c.contact_email ?? '—'}</td>
                  <td className="px-3 py-2 capitalize">{c.tier ?? 'free'}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${statusClass(c.status ?? 'active')}`}>
                      {c.status ?? 'active'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {(c.api_calls_used ?? 0).toLocaleString()} / {(c.api_call_limit ?? 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500">
                    {c.api_key ? `${c.api_key.slice(0, 12)}…` : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => rotateApiKey(c.id)}
                        className="px-2 py-1 border rounded text-xs hover:bg-gray-50 flex items-center gap-1"
                      >
                        <KeyRound className="h-3 w-3" /> Rotate key
                      </button>
                      <button
                        onClick={() => toggleCompanyStatus(c.id, c.status)}
                        className="px-2 py-1 border rounded text-xs hover:bg-gray-50"
                      >
                        {c.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCompanies.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                    No companies yet. Ask partners to register via the Tree Credits page.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : tab === 'credits' ? (
        <div className="bg-white border rounded-lg overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                {['Company', 'Tier', 'Credits', 'Remaining', 'Amount', 'Status', 'Reference', 'Created', 'Actions'].map(
                  (h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filteredBatches.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="px-3 py-2 font-medium text-gray-900">{b.company_id}</td>
                  <td className="px-3 py-2 text-gray-600">{SKU_LABEL[b.sku] ?? b.sku}</td>
                  <td className="px-3 py-2">{b.credits_purchased.toLocaleString()}</td>
                  <td className="px-3 py-2">{b.credits_remaining.toLocaleString()}</td>
                  <td className="px-3 py-2">
                    {b.currency} {Number(b.total_amount).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${statusClass(b.status)}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500">{b.reference ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-600">
                    {new Date(b.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    {b.status === 'pending' && (
                      <button
                        onClick={() => activateBatch(b.id)}
                        className="px-2 py-1 border rounded text-xs hover:bg-gray-50"
                      >
                        Mark paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredBatches.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                    No credit batches.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                {['Buyer', 'Company', 'Tonnes', 'Amount', 'Certificate', 'Status', 'Reference', 'Actions'].map(
                  (h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="px-3 py-2 text-gray-700">{o.buyer_email ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{o.company_id ?? '—'}</td>
                  <td className="px-3 py-2 font-semibold">{o.tonnes_co2e}</td>
                  <td className="px-3 py-2">
                    {o.currency} {Number(o.total_amount).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500">
                    {o.certificate_number ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${statusClass(o.status)}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500">{o.reference ?? '—'}</td>
                  <td className="px-3 py-2">
                    {o.status === 'paid' && (
                      <button
                        onClick={() => retireOrder(o.id)}
                        className="px-2 py-1 border rounded text-xs hover:bg-gray-50"
                      >
                        Retire
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                    No offset orders.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
        {icon}
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
