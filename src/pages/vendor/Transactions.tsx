import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Transaction } from '../../types'
import { getTransactions, requestWithdrawal, getWallet } from '../../store/vendorStore'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import { StatusBadge } from '../../components/StatusBadge'

export default function VendorTransactions() {
  const { profile } = useAuth()
  const vendorId = profile?.id || 'vendor_demo'

  const [txs, setTxs] = useState<Transaction[]>([])
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [amount, setAmount] = useState<number>(0)
  const [currency, setCurrency] = useState('UGX')

  const refresh = () => {
    setTxs(getTransactions(vendorId))
    const w = getWallet(vendorId)
    setCurrency(w.currency)
  }

  useEffect(() => { refresh() }, [])

  const handleWithdraw = () => {
    if (!amount || amount <= 0) return
    requestWithdrawal(vendorId, amount, currency)
    setAmount(0)
    setShowWithdraw(false)
    refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <button onClick={() => setShowWithdraw(true)} className="px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Request Withdrawal</button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {txs.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900 capitalize">{t.transaction_type}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{t.reference}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(t.amount, t.currency)}</td>
                  <td className="px-6 py-4"><StatusBadge status={t.status} variant="small" /></td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDateTime(t.created_at)}</td>
                </tr>
              ))}
              {txs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">No transactions yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showWithdraw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900">Request Withdrawal</h3>
              <button onClick={() => setShowWithdraw(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Currency</label>
                <input value={currency} onChange={(e) => setCurrency(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button onClick={() => setShowWithdraw(false)} className="px-4 py-2 rounded-md border bg-white">Cancel</button>
                <button onClick={handleWithdraw} className="px-4 py-2 rounded-md bg-blue-600 text-white">Submit</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
