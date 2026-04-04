import { useSearchParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

export default function OffsetSuccess() {
  const [search] = useSearchParams()
  const txn = search.get('txn') || ''
  const [record, setRecord] = useState<any | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('dirttrails_offsets')
      const arr = raw ? JSON.parse(raw) : []
      const found = arr.find((r: any) => r.txn === txn)
      setRecord(found || null)
    } catch (err) {
      console.error(err)
    }
  }, [txn])

  if (!record) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-semibold mb-4">Offset complete</h1>
        <p className="text-gray-700 mb-4">We couldn't find your transaction details. If you were redirected here after payment, the record may be pending.</p>
        <Link to="/" className="text-emerald-600 hover:underline">Back to home</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold mb-4">Thank you — Contribution received</h1>
      <p className="text-gray-700 mb-4">Transaction: <strong>{record.txn}</strong></p>
      <p className="text-gray-700 mb-4">Donor: <strong>{record.name} ({record.email})</strong></p>
      <p className="text-gray-700 mb-4">Amount: <strong>${record.amount}</strong> • Offset: <strong>{record.kg} kg CO₂e</strong> (~{record.trees} trees)</p>

      <div className="bg-white p-4 rounded shadow mb-4">
        <h4 className="font-semibold mb-2">Assigned Tree IDs</h4>
        <div className="text-sm text-gray-700 space-y-1">
          {record.treeIds && record.treeIds.length > 0 ? (
            record.treeIds.map((id: string) => (
              <div key={id} className="font-mono text-xs">{id}</div>
            ))
          ) : (
            <div className="text-sm text-gray-600">Tree IDs will be assigned shortly.</div>
          )}
        </div>
      </div>

      <Link to="/" className="px-4 py-2 bg-emerald-600 text-white rounded">Back to home</Link>
    </div>
  )
}
