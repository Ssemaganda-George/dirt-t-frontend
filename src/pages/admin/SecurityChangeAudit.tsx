import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type AuditRow = {
  id: number
  occurred_at: string
  table_name: string
  record_id: string | null
  operation: string
  actor_id: string | null
}

export default function SecurityChangeAudit() {
  const [rows, setRows] = useState<AuditRow[]>([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('security_change_audit')
      .select('id,occurred_at,table_name,record_id,operation,actor_id')
      .order('occurred_at', { ascending: false })
      .limit(100)
    if (loadError) setError(loadError.message)
    else setRows((data || []) as AuditRow[])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Security change audit</h1>
      <p className="text-sm text-slate-600">
        Immutable trigger log for bookings, orders, payments, transactions, wallets, vendors, and profiles. Login IP is captured on auth.sessions into login_history.
      </p>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Table</th>
              <th className="px-3 py-2">Op</th>
              <th className="px-3 py-2">Record</th>
              <th className="px-3 py-2">Actor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">{new Date(row.occurred_at).toLocaleString()}</td>
                <td className="px-3 py-2">{row.table_name}</td>
                <td className="px-3 py-2">{row.operation}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.record_id || '—'}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.actor_id || '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-slate-500" colSpan={5}>No audit rows yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
