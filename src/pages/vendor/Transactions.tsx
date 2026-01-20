import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Transaction } from '../../types'
import { getTransactions, requestWithdrawal, getWalletStats } from '../../lib/database'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import { StatusBadge } from '../../components/StatusBadge'
import { supabase } from '../../lib/supabaseClient'

export default function VendorTransactions() {
  const { profile, vendor, loading: authLoading } = useAuth()
  const vendorId = vendor?.id || profile?.id || 'vendor_demo'

  console.log('VendorTransactions: Auth data:', { profile, vendor, vendorId, authLoading })

  const [txs, setTxs] = useState<Transaction[]>([])
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [amount, setAmount] = useState<number>(0)
  const [currency, setCurrency] = useState('UGX')
  const [walletStats, setWalletStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    if (authLoading) {
      console.log('VendorTransactions: Auth still loading, skipping refresh')
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log('VendorTransactions: Refreshing data for vendorId:', vendorId)

      // Check if user is authenticated and has vendor role
      if (!profile || profile.role !== 'vendor') {
        setError('You must be logged in as a vendor to view wallet data.')
        return
      }

      const [transactions, stats] = await Promise.all([
        getTransactions(vendorId),
        getWalletStats(vendorId)
      ])

      console.log('VendorTransactions: Data loaded:', { transactions: transactions.length, stats })

      setTxs(transactions)
      setWalletStats(stats)
      setCurrency(stats.currency)
    } catch (err) {
      console.error('Error fetching wallet data:', err)

      // Check if it's a table not found error
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      if (errorMessage.includes('relation "transactions" does not exist') ||
          errorMessage.includes('Transactions table does not exist') ||
          (errorMessage.includes('transactions') && errorMessage.includes('does not exist'))) {
        setError('Wallet system is not yet set up. Please contact an administrator to run the database migrations.')
      } else if (errorMessage.includes('column transactions.vendor_id does not exist')) {
        setError('Wallet system database schema is incomplete. Please contact an administrator to complete the setup.')
      } else {
        setError(`Failed to load wallet data: ${errorMessage}. Please try again.`)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    if (!authLoading && vendorId && vendorId !== 'vendor_demo') {
      refresh() 
    }
  }, [authLoading, vendorId])

  // Set up real-time subscriptions for wallet and transaction updates
  useEffect(() => {
    if (authLoading || !vendorId || vendorId === 'vendor_demo') return

    console.log('Setting up real-time subscriptions for vendor:', vendorId)

    // Subscribe to transactions changes for this vendor
    const transactionsSubscription = supabase
      .channel('vendor_transactions_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `vendor_id=eq.${vendorId}`
      }, (payload: any) => {
        console.log('Real-time transaction change:', payload)
        // Refresh data when transactions change
        refresh()
      })
      .subscribe()

    // Subscribe to wallets changes for this vendor
    const walletsSubscription = supabase
      .channel('vendor_wallets_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'wallets',
        filter: `vendor_id=eq.${vendorId}`
      }, (payload: any) => {
        console.log('Real-time wallet change:', payload)
        // Refresh data when wallet changes
        refresh()
      })
      .subscribe()

    // Cleanup subscriptions
    return () => {
      transactionsSubscription.unsubscribe()
      walletsSubscription.unsubscribe()
    }
  }, [vendorId, authLoading])

  const handleWithdraw = async () => {
    if (!amount || amount <= 0) return
    try {
      await requestWithdrawal(vendorId, amount, currency)
      setAmount(0)
      setShowWithdraw(false)
      refresh()
    } catch (err) {
      console.error('Error requesting withdrawal:', err)
      setError('Failed to request withdrawal. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">My Wallet</h1>
        <button 
          onClick={() => setShowWithdraw(true)} 
          disabled={!walletStats || walletStats.currentBalance <= 0}
          className="px-3 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Request Withdrawal
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <div className="text-red-800">{error}</div>
            <button
              onClick={refresh}
              className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Debug Info - visible in development or when ?debug=1 is present */}
      {((import.meta.env && (import.meta.env.DEV === true)) || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1')) && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">Debug Info</h4>
            <span className="text-xs text-gray-500">dev-only</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="font-medium text-gray-700">Auth/Profile</div>
              <pre className="whitespace-pre-wrap text-xs text-gray-700">{JSON.stringify(profile, null, 2)}</pre>
            </div>
            <div>
              <div className="font-medium text-gray-700">Vendor</div>
              <pre className="whitespace-pre-wrap text-xs text-gray-700">{JSON.stringify(vendor, null, 2)}</pre>
            </div>
            <div>
              <div className="font-medium text-gray-700">vendorId</div>
              <pre className="whitespace-pre-wrap text-xs text-gray-700">{vendorId}</pre>
            </div>
            <div>
              <div className="font-medium text-gray-700">Wallet Stats</div>
              <pre className="whitespace-pre-wrap text-xs text-gray-700">{JSON.stringify(walletStats, null, 2)}</pre>
            </div>
            <div className="md:col-span-2">
              <div className="font-medium text-gray-700">Recent Transactions (first 10)</div>
              <pre className="whitespace-pre-wrap text-xs text-gray-700">{JSON.stringify(txs.slice(0, 10), null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {/* Wallet Statistics Cards */}
          {walletStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white shadow rounded-lg p-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500 truncate">Current Balance</dt>
                  <dd className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(walletStats.currentBalance, walletStats.currency)}</dd>
                  <dd className="text-xs text-gray-500 mt-1">Available for withdrawal</dd>
                </div>
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed Bookings Balance</dt>
                  <dd className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(walletStats.completedBalance, walletStats.currency)}</dd>
                  <dd className="text-xs text-gray-500 mt-1">Money for completed bookings</dd>
                </div>
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Bookings Balance</dt>
                  <dd className="text-2xl font-bold text-yellow-600 mt-1">{formatCurrency(walletStats.pendingBalance, walletStats.currency)}</dd>
                  <dd className="text-xs text-gray-500 mt-1">Money paid but booking not completed</dd>
                </div>
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Earned</dt>
                  <dd className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(walletStats.totalEarned, walletStats.currency)}</dd>
                </div>
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Withdrawals</dt>
                  <dd className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(walletStats.pendingWithdrawals, walletStats.currency)}</dd>
                  {walletStats.pendingWithdrawalsCount > 0 && (
                    <dd className="text-xs text-gray-500 mt-1">{walletStats.pendingWithdrawalsCount} pending</dd>
                  )}
                </div>
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Withdrawn</dt>
                  <dd className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(walletStats.totalWithdrawn, walletStats.currency)}</dd>
                  {walletStats.completedWithdrawals > 0 && (
                    <dd className="text-xs text-gray-500 mt-1">{walletStats.completedWithdrawals} withdrawals</dd>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Transaction History */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Transaction History</h3>
              <p className="text-sm text-gray-500">View all your payment and withdrawal transactions</p>
            </div>
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
                      <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">No wallet transactions yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showWithdraw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900">Request Withdrawal</h3>
              <button onClick={() => setShowWithdraw(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-800">
                  Available Balance: <span className="font-semibold">{formatCurrency(walletStats?.currentBalance || 0, walletStats?.currency || 'UGX')}</span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input 
                  type="number" 
                  min={1} 
                  max={walletStats?.currentBalance || 0}
                  value={amount} 
                  onChange={(e) => setAmount(Number(e.target.value))} 
                  className="mt-1 w-full border rounded-md px-3 py-2" 
                />
                {amount > (walletStats?.currentBalance || 0) && (
                  <p className="text-sm text-red-600 mt-1">Amount exceeds available balance</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Currency</label>
                <input value={currency} onChange={(e) => setCurrency(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button onClick={() => setShowWithdraw(false)} className="px-4 py-2 rounded-md border bg-white">Cancel</button>
                <button 
                  onClick={handleWithdraw} 
                  disabled={loading || amount <= 0 || amount > (walletStats?.currentBalance || 0)} 
                  className="px-4 py-2 rounded-md bg-primary-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
