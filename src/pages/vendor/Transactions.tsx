import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Transaction } from '../../types'
import { getTransactions, requestWithdrawal, getWalletStats } from '../../lib/database'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import { StatusBadge } from '../../components/StatusBadge'
import { supabase } from '../../lib/supabaseClient'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays, format } from 'date-fns'

export default function VendorTransactions() {
  const { profile, vendor, loading: authLoading } = useAuth()
  const vendorId = vendor?.id || profile?.id || 'vendor_demo'

  const [txs, setTxs] = useState<Transaction[]>([])
  const [filteredTxs, setFilteredTxs] = useState<Transaction[]>([])
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [amount, setAmount] = useState<number>(0)
  const [currency, setCurrency] = useState('UGX')
  const [walletStats, setWalletStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtering states
  const [dateRange, setDateRange] = useState('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [transactionType, setTransactionType] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'recommendations'>('overview')

  const refresh = async () => {
    if (authLoading) return

    try {
      setLoading(true)
      setError(null)

      // Check if user is authenticated and has vendor role
      if (!profile || profile.role !== 'vendor') {
        setError('You must be logged in as a vendor to view wallet data.')
        return
      }

      const [transactions, stats] = await Promise.all([
        getTransactions(vendorId),
        getWalletStats(vendorId)
      ])

      setTxs(transactions)
      setWalletStats(stats)
      setCurrency(stats.currency)

      // Apply initial filters
      applyFilters(transactions)
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

  // Apply filters to transactions
  const applyFilters = (transactions: Transaction[]) => {
    let filtered = [...transactions]

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date()
      let startDate: Date
      let endDate: Date = now

      switch (dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          startDate = startOfWeek(now)
          endDate = endOfWeek(now)
          break
        case 'month':
          startDate = startOfMonth(now)
          endDate = endOfMonth(now)
          break
        case 'last30':
          startDate = subDays(now, 30)
          break
        case 'custom':
          if (customStartDate && customEndDate) {
            startDate = new Date(customStartDate)
            endDate = new Date(customEndDate)
          } else {
            startDate = new Date(0) // Show all if custom dates not set
          }
          break
        default:
          startDate = new Date(0) // Show all
      }

      if (dateRange !== 'all') {
        filtered = filtered.filter(tx => {
          const txDate = new Date(tx.created_at)
          return txDate >= startDate && txDate <= endDate
        })
      }
    }

    // Transaction type filter
    if (transactionType !== 'all') {
      filtered = filtered.filter(tx => tx.transaction_type === transactionType)
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status === statusFilter)
    }

    setFilteredTxs(filtered)
  }

  // Update filters when they change
  useEffect(() => {
    if (txs.length > 0) {
      applyFilters(txs)
    }
  }, [dateRange, customStartDate, customEndDate, transactionType, statusFilter, txs])

  useEffect(() => {
    if (!authLoading && vendorId && vendorId !== 'vendor_demo') {
      refresh()
    }
  }, [authLoading, vendorId])

  // Set up real-time subscriptions for wallet and transaction updates
  useEffect(() => {
    if (authLoading || !vendorId || vendorId === 'vendor_demo') return

    // Subscribe to transactions changes for this vendor
    const transactionsSubscription = supabase
      .channel('vendor_transactions_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `vendor_id=eq.${vendorId}`
      }, () => {
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
      }, () => {
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

  // Export functions
  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Reference', 'Amount', 'Currency', 'Status']
    const csvData = filteredTxs.map(tx => [
      formatDateTime(tx.created_at),
      tx.transaction_type,
      tx.reference,
      tx.amount.toString(),
      tx.currency,
      tx.status
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const generateReport = () => {
    const totalTransactions = filteredTxs.length
    const totalAmount = filteredTxs.reduce((sum, tx) => sum + tx.amount, 0)
    const avgTransaction = totalTransactions > 0 ? totalAmount / totalTransactions : 0

    const report = {
      period: dateRange,
      totalTransactions,
      totalAmount: formatCurrency(totalAmount, currency),
      averageTransaction: formatCurrency(avgTransaction, currency),
      dateGenerated: format(new Date(), 'PPP'),
      filters: {
        dateRange,
        transactionType,
        status: statusFilter
      }
    }

    // Create a simple text report
    const reportText = `
FINANCIAL REPORT
================

Period: ${report.period === 'all' ? 'All Time' : report.period}
Generated: ${report.dateGenerated}

SUMMARY STATISTICS
------------------
Total Transactions: ${report.totalTransactions}
Total Amount: ${report.totalAmount}
Average Transaction: ${report.averageTransaction}

FILTERS APPLIED
---------------
Date Range: ${report.filters.dateRange}
Transaction Type: ${report.filters.transactionType}
Status: ${report.filters.status}

TRANSACTION BREAKDOWN
---------------------
${filteredTxs.slice(0, 10).map(tx => `${formatDateTime(tx.created_at)} - ${tx.transaction_type} - ${formatCurrency(tx.amount, tx.currency)} - ${tx.status}`).join('\n')}

${filteredTxs.length > 10 ? `\n... and ${filteredTxs.length - 10} more transactions` : ''}
    `.trim()

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `financial_report_${format(new Date(), 'yyyy-MM-dd')}.txt`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Business Dashboard</h1>
              <p className="mt-2 text-sm text-gray-600">
                Monitor your performance, manage transactions, and access business insights
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={() => setShowWithdraw(true)}
                disabled={!walletStats || walletStats.currentBalance <= 0}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                Withdraw Funds
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'transactions'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Transaction History
              </button>
              <button
                onClick={() => setActiveTab('recommendations')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'recommendations'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Business Recommendations
              </button>
            </nav>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="text-red-800 text-sm">{error}</div>
              </div>
              <button
                onClick={refresh}
                className="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-sm text-gray-500">Loading wallet data...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Overview Tab Content */}
            {activeTab === 'overview' && (
              <>
                {/* Wallet Statistics Cards */}
                {walletStats && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                      <div className="p-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-medium text-gray-500 truncate">Current Balance</dt>
                              <dd className="text-lg font-medium text-gray-900">{formatCurrency(walletStats.currentBalance, walletStats.currency)}</dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 px-5 py-3">
                        <div className="text-sm text-gray-500">Available for withdrawal</div>
                      </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                      <div className="p-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-medium text-gray-500 truncate">Completed Earnings</dt>
                              <dd className="text-lg font-medium text-gray-900">{formatCurrency(walletStats.completedBalance, walletStats.currency)}</dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 px-5 py-3">
                        <div className="text-sm text-gray-500">From completed bookings</div>
                      </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                      <div className="p-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <svg className="h-6 w-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-medium text-gray-500 truncate">Pending Earnings</dt>
                              <dd className="text-lg font-medium text-gray-900">{formatCurrency(walletStats.pendingBalance, walletStats.currency)}</dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 px-5 py-3">
                        <div className="text-sm text-gray-500">Awaiting completion</div>
                      </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                      <div className="p-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-medium text-gray-500 truncate">Total Earned</dt>
                              <dd className="text-lg font-medium text-gray-900">{formatCurrency(walletStats.totalEarned, walletStats.currency)}</dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 px-5 py-3">
                        <div className="text-sm text-gray-500">All-time earnings</div>
                      </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                      <div className="p-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <svg className="h-6 w-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-medium text-gray-500 truncate">Pending Withdrawals</dt>
                              <dd className="text-lg font-medium text-gray-900">{formatCurrency(walletStats.pendingWithdrawals, walletStats.currency)}</dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 px-5 py-3">
                        <div className="text-sm text-gray-500">{walletStats.pendingWithdrawalsCount || 0} pending</div>
                      </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                      <div className="p-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <svg className="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-medium text-gray-500 truncate">Total Withdrawn</dt>
                              <dd className="text-lg font-medium text-gray-900">{formatCurrency(walletStats.totalWithdrawn, walletStats.currency)}</dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 px-5 py-3">
                        <div className="text-sm text-gray-500">{walletStats.completedWithdrawals || 0} completed</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Performance Insights */}
                {filteredTxs.length > 0 && (
                  <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">Performance Insights</h3>
                        <p className="text-sm text-gray-500">Key metrics and trends for your business</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {filteredTxs.length}
                        </div>
                        <div className="text-sm text-gray-500">Total Transactions</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-green-800">Average Transaction</div>
                            <div className="text-lg font-bold text-green-900">
                              {formatCurrency(
                                filteredTxs.reduce((sum, tx) => sum + tx.amount, 0) / filteredTxs.length,
                                currency
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-blue-800">Total Revenue</div>
                            <div className="text-lg font-bold text-blue-900">
                              {formatCurrency(
                                filteredTxs.reduce((sum, tx) => sum + tx.amount, 0),
                                currency
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-purple-800">Success Rate</div>
                            <div className="text-lg font-bold text-purple-900">
                              {Math.round((filteredTxs.filter(tx => tx.status === 'completed').length / filteredTxs.length) * 100)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-gray-200">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {filteredTxs.filter(tx => tx.status === 'completed').length}
                        </div>
                        <div className="text-sm text-gray-500">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {filteredTxs.filter(tx => tx.status === 'pending').length}
                        </div>
                        <div className="text-sm text-gray-500">Pending</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {filteredTxs.filter(tx => tx.status === 'approved').length}
                        </div>
                        <div className="text-sm text-gray-500">Approved</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {filteredTxs.filter(tx => tx.status === 'failed').length + filteredTxs.filter(tx => tx.status === 'rejected').length}
                        </div>
                        <div className="text-sm text-gray-500">Failed/Rejected</div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Transaction History Tab Content */}
            {activeTab === 'transactions' && (
              <>
                {/* Filters Panel */}
                {showFilters && (
                  <div className="mb-8 bg-white shadow rounded-lg p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                        <select
                          value={dateRange}
                          onChange={(e) => setDateRange(e.target.value)}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="all">All Time</option>
                          <option value="today">Today</option>
                          <option value="week">This Week</option>
                          <option value="month">This Month</option>
                          <option value="last30">Last 30 Days</option>
                          <option value="custom">Custom Range</option>
                        </select>
                      </div>

                      {dateRange === 'custom' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                            <input
                              type="date"
                              value={customStartDate}
                              onChange={(e) => setCustomStartDate(e.target.value)}
                              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                            <input
                              type="date"
                              value={customEndDate}
                              onChange={(e) => setCustomEndDate(e.target.value)}
                              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
                        <select
                          value={transactionType}
                          onChange={(e) => setTransactionType(e.target.value)}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="all">All Types</option>
                          <option value="booking_payment">Booking Payment</option>
                          <option value="withdrawal">Withdrawal</option>
                          <option value="refund">Refund</option>
                          <option value="commission">Commission</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="all">All Statuses</option>
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="completed">Completed</option>
                          <option value="failed">Failed</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-between items-center">
                      <div className="text-sm text-gray-600">
                        Showing {filteredTxs.length} of {txs.length} transactions
                      </div>
                      <button
                        onClick={() => {
                          setDateRange('all')
                          setCustomStartDate('')
                          setCustomEndDate('')
                          setTransactionType('all')
                          setStatusFilter('all')
                        }}
                        className="text-sm text-indigo-600 hover:text-indigo-500"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </div>
                )}

                {/* Transaction History */}
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg leading-6 font-medium text-gray-900">Transaction History</h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                          A complete record of all your payments, earnings, and withdrawals
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setShowFilters(!showFilters)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <svg className="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                          </svg>
                          Filters
                        </button>
                        <button
                          onClick={exportToCSV}
                          disabled={filteredTxs.length === 0}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                          </svg>
                          Export CSV
                        </button>
                        <button
                          onClick={generateReport}
                          disabled={filteredTxs.length === 0}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Generate Report
                        </button>
                        <button
                          onClick={refresh}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <svg className="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Refresh
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Reference
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredTxs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center">
                              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                              </svg>
                              <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions found</h3>
                              <p className="mt-1 text-sm text-gray-500">
                                {txs.length === 0 ? "You haven't made any transactions yet." : "No transactions match your current filters."}
                              </p>
                            </td>
                          </tr>
                        ) : (
                          filteredTxs.slice().reverse().map((transaction) => (
                            <tr key={transaction.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="text-sm font-medium text-gray-900 capitalize">
                                    {transaction.transaction_type.replace('_', ' ')}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {transaction.reference}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {formatCurrency(transaction.amount, transaction.currency)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <StatusBadge status={transaction.status} variant="small" />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDateTime(transaction.created_at)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Business Recommendations Tab Content */}
            {activeTab === 'recommendations' && (
              <>
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Business Recommendations</h3>
                      <p className="text-sm text-gray-500">Professional advice to optimize your business performance</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-indigo-600">
                        
                      </div>
                      <div className="text-sm text-gray-500">AI-Powered Insights</div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Financial Health Recommendations */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                        </div>
                        <div className="ml-4 flex-1">
                          <h4 className="text-lg font-semibold text-green-800 mb-2">Financial Health</h4>
                          <div className="space-y-3">
                            <div className="bg-white p-4 rounded-md shadow-sm">
                              <h5 className="font-medium text-gray-900 mb-1">Cash Flow Management</h5>
                              <p className="text-sm text-gray-600">
                                Maintain at least 3 months of operating expenses in your account. Your current balance of {formatCurrency(walletStats?.currentBalance || 0, walletStats?.currency || 'UGX')} 
                                {walletStats?.currentBalance < 500000 ? 'is below recommended levels. Consider reducing expenses or increasing prices.' : 'is healthy. Keep up the good work!'}
                              </p>
                            </div>
                            <div className="bg-white p-4 rounded-md shadow-sm">
                              <h5 className="font-medium text-gray-900 mb-1">Withdrawal Strategy</h5>
                              <p className="text-sm text-gray-600">
                                Withdraw profits regularly but leave enough for business operations. Consider withdrawing {Math.round((walletStats?.currentBalance || 0) * 0.3)} UGX monthly to maintain healthy cash reserves.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Performance Optimization */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <div className="ml-4 flex-1">
                          <h4 className="text-lg font-semibold text-blue-800 mb-2">Performance Optimization</h4>
                          <div className="space-y-3">
                            <div className="bg-white p-4 rounded-md shadow-sm">
                              <h5 className="font-medium text-gray-900 mb-1">Success Rate Improvement</h5>
                              <p className="text-sm text-gray-600">
                                Your current success rate is {filteredTxs.length > 0 ? Math.round((filteredTxs.filter(tx => tx.status === 'completed').length / filteredTxs.length) * 100) : 0}%. 
                                {filteredTxs.length > 0 && Math.round((filteredTxs.filter(tx => tx.status === 'completed').length / filteredTxs.length) * 100) < 80 
                                  ? 'Focus on improving service quality and customer communication to increase completion rates.' 
                                  : 'Excellent completion rate! Maintain your high standards.'}
                              </p>
                            </div>
                            <div className="bg-white p-4 rounded-md shadow-sm">
                              <h5 className="font-medium text-gray-900 mb-1">Pricing Strategy</h5>
                              <p className="text-sm text-gray-600">
                                Your average transaction is {filteredTxs.length > 0 ? formatCurrency(filteredTxs.reduce((sum, tx) => sum + tx.amount, 0) / filteredTxs.length, currency) : 'N/A'}. 
                                Consider competitive pricing while maintaining profit margins. Regular price reviews can help optimize revenue.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Growth Recommendations */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                        <div className="ml-4 flex-1">
                          <h4 className="text-lg font-semibold text-purple-800 mb-2">Growth Opportunities</h4>
                          <div className="space-y-3">
                            <div className="bg-white p-4 rounded-md shadow-sm">
                              <h5 className="font-medium text-gray-900 mb-1">Expansion Strategies</h5>
                              <p className="text-sm text-gray-600">
                                With {filteredTxs.length} total transactions, consider expanding your service offerings or targeting new customer segments. 
                                Consistent performance like yours suggests readiness for business growth.
                              </p>
                            </div>
                            <div className="bg-white p-4 rounded-md shadow-sm">
                              <h5 className="font-medium text-gray-900 mb-1">Customer Retention</h5>
                              <p className="text-sm text-gray-600">
                                Focus on building long-term customer relationships. Satisfied customers often return and provide referrals, creating sustainable business growth.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Risk Management */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-8 w-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </div>
                        <div className="ml-4 flex-1">
                          <h4 className="text-lg font-semibold text-orange-800 mb-2">Risk Management</h4>
                          <div className="space-y-3">
                            <div className="bg-white p-4 rounded-md shadow-sm">
                              <h5 className="font-medium text-gray-900 mb-1">Transaction Monitoring</h5>
                              <p className="text-sm text-gray-600">
                                Monitor failed/rejected transactions ({filteredTxs.filter(tx => tx.status === 'failed' || tx.status === 'rejected').length} total). 
                                High failure rates may indicate service issues that need immediate attention.
                              </p>
                            </div>
                            <div className="bg-white p-4 rounded-md shadow-sm">
                              <h5 className="font-medium text-gray-900 mb-1">Contingency Planning</h5>
                              <p className="text-sm text-gray-600">
                                Prepare for seasonal fluctuations. Build emergency funds and have backup plans for service disruptions to ensure business continuity.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Items */}
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Recommended Actions</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-indigo-600">1</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Review Pricing Strategy</p>
                            <p className="text-xs text-gray-500">Monthly assessment of competitive pricing</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-indigo-600">2</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Customer Feedback Collection</p>
                            <p className="text-xs text-gray-500">Implement regular feedback mechanisms</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-indigo-600">3</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Cash Reserve Building</p>
                            <p className="text-xs text-gray-500">Maintain 3-month expense buffer</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-indigo-600">4</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Performance Monitoring</p>
                            <p className="text-xs text-gray-500">Weekly review of key metrics</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Withdrawal Modal */}
        {showWithdraw && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowWithdraw(false)}></div>
              </div>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg className="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Request Withdrawal
                      </h3>
                      <div className="mt-4">
                        <div className="mb-4 p-4 bg-indigo-50 rounded-md">
                          <p className="text-sm text-indigo-800">
                            <span className="font-medium">Available Balance:</span>{' '}
                            <span className="font-semibold">{formatCurrency(walletStats?.currentBalance || 0, walletStats?.currency || 'UGX')}</span>
                          </p>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                              Withdrawal Amount
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                              <input
                                type="number"
                                name="amount"
                                id="amount"
                                min={1}
                                max={walletStats?.currentBalance || 0}
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-12 sm:text-sm border-gray-300 rounded-md"
                                placeholder="0.00"
                              />
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">{currency}</span>
                              </div>
                            </div>
                            {amount > (walletStats?.currentBalance || 0) && (
                              <p className="mt-2 text-sm text-red-600">
                                Amount exceeds available balance
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={handleWithdraw}
                    disabled={loading || amount <= 0 || amount > (walletStats?.currentBalance || 0)}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Submitting...' : 'Request Withdrawal'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowWithdraw(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
