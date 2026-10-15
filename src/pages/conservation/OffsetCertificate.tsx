import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Award, Loader2, MapPin, TreePine } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type Certificate = {
  certificate_number: string | null
  status: string
  tonnes_co2e: number
  buyer_email: string
  trees_equivalent: number
  project_description: string | null
  retired_at: string | null
  currency: string
  total_amount: number
  trees: {
    external_id: string | null
    species: string
    latitude: number
    longitude: number
    planted_on: string
  }[]
}

export default function OffsetCertificate() {
  const [searchParams] = useSearchParams()
  const reference = searchParams.get('reference') || ''
  const [data, setData] = useState<Certificate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!reference) {
      setError('Missing certificate reference')
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await supabase.functions.invoke(
          `carbon-offsets/certificate?reference=${encodeURIComponent(reference)}`,
        )
        if (res.error) throw new Error(res.error.message || 'Certificate not found')
        if (!cancelled) setData(res.data?.data || null)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [reference])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Verifying certificate…
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Certificate not found</h1>
        <p className="text-gray-600 mb-6">{error || 'The reference may be incorrect.'}</p>
        <Link to="/conservation/offsets" className="text-emerald-700 font-medium hover:underline">
          Buy a verified offset →
        </Link>
      </div>
    )
  }

  const isRetired = data.status === 'retired'

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div
        className={`rounded-2xl border-2 p-8 ${
          isRetired ? 'border-emerald-500 bg-emerald-50/40' : 'border-amber-400 bg-amber-50/40'
        }`}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className={`p-3 rounded-full ${
              isRetired ? 'bg-emerald-500/10' : 'bg-amber-500/10'
            }`}
          >
            <Award
              className={`h-7 w-7 ${isRetired ? 'text-emerald-700' : 'text-amber-700'}`}
            />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500">DirtTrails</p>
            <h1 className="text-2xl font-bold text-gray-900">Carbon Offset Certificate</h1>
          </div>
        </div>

        {!isRetired && (
          <p className="mb-6 rounded-lg bg-amber-100 p-3 text-sm text-amber-800">
            This order is still pending payment. The certificate becomes valid once the tonnes are
            retired.
          </p>
        )}

        <dl className="grid gap-4 sm:grid-cols-2 mb-8">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Certificate number</dt>
            <dd className="font-mono font-semibold text-gray-900">
              {data.certificate_number || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Status</dt>
            <dd
              className={`font-semibold capitalize ${
                isRetired ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {data.status}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Tonnes CO₂e retired</dt>
            <dd className="text-2xl font-bold text-gray-900">{data.tonnes_co2e}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Equivalent trees</dt>
            <dd className="text-2xl font-bold text-gray-900">
              ~{data.trees_equivalent.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Beneficiary</dt>
            <dd className="text-gray-900">{data.buyer_email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Retired on</dt>
            <dd className="text-gray-900">
              {data.retired_at ? new Date(data.retired_at).toLocaleDateString() : '—'}
            </dd>
          </div>
        </dl>

        {data.project_description && (
          <div className="mb-8 rounded-lg bg-white p-4 border">
            <h2 className="text-sm font-semibold text-gray-800 mb-1">Project</h2>
            <p className="text-sm text-gray-700">{data.project_description}</p>
          </div>
        )}

        {data.trees?.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <TreePine className="h-4 w-4 text-emerald-700" /> Sample tracked trees
            </h2>
            <div className="overflow-x-auto rounded-lg border bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Tree ID</th>
                    <th className="px-3 py-2 text-left font-medium">Species</th>
                    <th className="px-3 py-2 text-left font-medium">Planted</th>
                    <th className="px-3 py-2 text-left font-medium">Coordinates</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trees.map((t, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2 font-mono">{t.external_id || '—'}</td>
                      <td className="px-3 py-2">{t.species}</td>
                      <td className="px-3 py-2">
                        {t.planted_on ? new Date(t.planted_on).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-3 py-2 text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {t.latitude?.toFixed(3)}, {t.longitude?.toFixed(3)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-4">
        <Link to="/conservation/geotagging" className="text-emerald-700 font-medium hover:underline">
          View the tree map →
        </Link>
        <Link to="/conservation/offsets" className="text-gray-600 hover:underline">
          Buy another offset
        </Link>
      </div>
    </div>
  )
}
