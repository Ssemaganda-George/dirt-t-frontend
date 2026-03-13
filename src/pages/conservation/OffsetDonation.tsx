import { useSearchParams, Link } from 'react-router-dom'
import { useState } from 'react'

export default function OffsetDonation() {
  const [search] = useSearchParams()
  const kg = Number(search.get('kg') || '0')
  const trees = Number(search.get('trees') || '0')
  const [amount, setAmount] = useState<string>('')

  const suggestedAmount = (trees: number) => {
    // simple default: $5 per tree as placeholder
    return trees > 0 ? trees * 5 : Math.ceil((kg || 0) * 0.01)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold mb-4">Offset Your Carbon</h1>
      <p className="text-gray-700 mb-4">You're offsetting <strong>{kg} kg CO₂e</strong> (~{trees} trees).</p>

      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <label className="block text-sm text-gray-700 mb-2">Suggested contribution</label>
        <div className="flex items-center gap-3 mb-3">
          <input className="border rounded px-3 py-2 w-40" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Suggested $${suggestedAmount(trees)}`} />
          <button onClick={() => setAmount(String(suggestedAmount(trees)))} className="px-3 py-2 bg-emerald-600 text-white rounded">Use suggested</button>
        </div>

        <p className="text-sm text-gray-600">Contributions support tree planting and local conservation projects. This is a demonstration flow — no payment processing is configured yet.</p>
      </div>

      <div className="flex gap-3">
        <Link to="/" className="px-4 py-2 border rounded">Back</Link>
        <a
          className={`px-4 py-2 bg-emerald-600 text-white rounded ${!amount ? 'opacity-50 pointer-events-none' : ''}`}
          href={`/conservation/checkout?kg=${encodeURIComponent(kg)}&trees=${encodeURIComponent(trees)}&suggested=${encodeURIComponent(amount)}`}
        >
          Donate (demo)
        </a>
      </div>
    </div>
  )
}
