import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Transaction } from '../../types'
import { getTransactions, requestWithdrawal, getWalletStats } from '../../lib/database'
import { formatCurrencyWithConversion, formatDateTime } from '../../lib/utils'
import { usePreferences } from '../../contexts/PreferencesContext'
import { supabase } from '../../lib/supabaseClient'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays, format } from 'date-fns'
import { getDailyQuote } from '../../lib/businessQuotes'
import { getDailyRecommendations, type VendorMetrics } from '../../lib/businessRecommendations'

export default function VendorTransactions() {
  const { profile, vendor, loading: authLoading } = useAuth()
  const vendorId = vendor?.id || profile?.id || 'vendor_demo'

  const { selectedCurrency, selectedLanguage } = usePreferences()

  const [txs, setTxs] = useState<Transaction[]>([])
  const [filteredTxs, setFilteredTxs] = useState<Transaction[]>([])
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [amount, setAmount] = useState<number>(0)
  const [currency, setCurrency] = useState('UGX')
  const [walletStats, setWalletStats] = useState<any>(null)
  // Payout account selection
  const [payoutOptions, setPayoutOptions] = useState<any[]>([])
  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null)
  const [setAsDefault, setSetAsDefault] = useState(false)
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

  // Daily quote — changes every day, unique per vendor
  const dailyQuote = useMemo(() => getDailyQuote(vendorId), [vendorId])

  // Daily recommendations — changes every day, unique per vendor, adapts to data
  const dailyRecs = useMemo(() => {
    const metrics: VendorMetrics = {
      currentBalance: walletStats?.currentBalance || 0,
      totalEarned: walletStats?.totalEarned || 0,
      pendingBalance: walletStats?.pendingBalance || 0,
      completedBalance: walletStats?.completedBalance || 0,
      pendingWithdrawals: walletStats?.pendingWithdrawals || 0,
      totalWithdrawn: walletStats?.totalWithdrawn || 0,
      currency: walletStats?.currency || currency || 'UGX',
      totalTransactions: filteredTxs.length,
      completedTransactions: filteredTxs.filter(tx => tx.status === 'completed').length,
      failedTransactions: filteredTxs.filter(tx => tx.status === 'failed' || tx.status === 'rejected').length,
      avgTransactionAmount: filteredTxs.length > 0 ? filteredTxs.reduce((sum, tx) => sum + tx.amount, 0) / filteredTxs.length : 0,
      successRate: filteredTxs.length > 0 ? Math.round((filteredTxs.filter(tx => tx.status === 'completed').length / filteredTxs.length) * 100) : 0,
    }
    return getDailyRecommendations(vendorId, metrics)
  }, [vendorId, walletStats, filteredTxs, currency])

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

  // Build payout options when vendor record changes
  useEffect(() => {
    const buildOptions = () => {
      const opts: any[] = []
      if (!vendor) return opts

      const bank = vendor.bank_details
      if (bank && (bank.account_number || bank.account_name || bank.name)) {
        const acctNum = String(bank.account_number || '')
        const masked = acctNum ? `****${acctNum.slice(-4)}` : ''
        opts.push({ id: 'bank', type: 'bank', label: `${bank.name || 'Bank'} ${masked ? '· ' + masked : ''}`, meta: bank })
      }

      const mobiles = Array.isArray(vendor.mobile_money_accounts) ? vendor.mobile_money_accounts : []
      mobiles.forEach((m: any, i: number) => {
        if (m && (m.phone || m.provider)) {
          const labelPhone = `${m.country_code || ''} ${m.phone || ''}`.trim()
          opts.push({ id: `mobile-${i}`, type: 'mobile', label: `${m.provider || 'Mobile Money'} · ${labelPhone}`, meta: m, index: i })
        }
      })

      // If vendor has a preferred_payout saved, try to select it
      const preferred = vendor.preferred_payout
      if (preferred && opts.find(o => o.id === preferred)) {
        setSelectedPayoutId(preferred)
      } else if (opts.length === 1) {
        // Auto-select when only one option exists
        setSelectedPayoutId(opts[0].id)
      }

      setPayoutOptions(opts)
    }

    buildOptions()
  }, [vendor])

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
      // Ensure a payout account is selected
      if (!selectedPayoutId || payoutOptions.length === 0) {
        setError('Please add a payout account in your profile before withdrawing.')
        return
      }

      const payout = payoutOptions.find(p => p.id === selectedPayoutId)

      // If user opted to set this as default, persist to vendor record
      if (setAsDefault && vendor && vendorId) {
        try {
          await supabase.from('vendors').update({ preferred_payout: selectedPayoutId }).eq('id', vendorId)
        } catch (e) {
          console.warn('Failed to save preferred payout:', e)
        }
      }

      await requestWithdrawal(vendorId, amount, currency, payout)
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
      totalAmount: formatCurrencyWithConversion(totalAmount, currency, selectedCurrency, selectedLanguage),
      averageTransaction: formatCurrencyWithConversion(avgTransaction, currency, selectedCurrency, selectedLanguage),
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
${filteredTxs.slice(0, 10).map(tx => `${formatDateTime(tx.created_at)} - ${tx.transaction_type} - ${formatCurrencyWithConversion(tx.amount, tx.currency, selectedCurrency, selectedLanguage)} - ${tx.status}`).join('\n')}

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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your earnings and payment history</p>
        </div>
        <button
          onClick={() => setShowWithdraw(true)}
          disabled={!walletStats || walletStats.currentBalance <= 0}
          className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Withdraw Funds
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-1.5 inline-flex gap-1">
        {(['overview', 'transactions', 'recommendations'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab === 'overview' ? 'Overview' : tab === 'transactions' ? 'Transactions' : 'Insights'}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-600">{error}</p>
            <button onClick={refresh} className="text-xs font-medium text-gray-600 hover:text-gray-900">Retry</button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-3 text-sm text-gray-500">Loading wallet data...</p>
        </div>
      ) : (
          <div className="space-y-8">
            {/* Overview Tab Content */}
            {activeTab === 'overview' && (
              <>
                {/* Wallet Statistics Cards */}
                {walletStats && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    <div className="bg-white border border-gray-200 border-l-4 border-l-blue-500 rounded-lg p-5 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600">Current Balance</p>
                          <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrencyWithConversion(walletStats.currentBalance, walletStats.currency, selectedCurrency, selectedLanguage)}</p>
                          <p className="text-xs text-gray-600 mt-2">Available for withdrawal</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 border-l-4 border-l-green-600 rounded-lg p-5 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600">Completed Earnings</p>
                          <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrencyWithConversion(walletStats.completedBalance, walletStats.currency, selectedCurrency, selectedLanguage)}</p>
                          <p className="text-xs text-gray-600 mt-2">From completed bookings</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 border-l-4 border-l-yellow-600 rounded-lg p-5 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600">Pending Earnings</p>
                          <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrencyWithConversion(walletStats.pendingBalance, walletStats.currency, selectedCurrency, selectedLanguage)}</p>
                          <p className="text-xs text-gray-600 mt-2">Awaiting completion</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 border-l-4 border-l-blue-600 rounded-lg p-5 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600">Total Earned</p>
                          <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrencyWithConversion(walletStats.totalEarned, walletStats.currency, selectedCurrency, selectedLanguage)}</p>
                          <p className="text-xs text-gray-600 mt-2">All-time earnings</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 border-l-4 border-l-orange-600 rounded-lg p-5 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600">Pending Withdrawals</p>
                          <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrencyWithConversion(walletStats.pendingWithdrawals, walletStats.currency, selectedCurrency, selectedLanguage)}</p>
                          <p className="text-xs text-gray-600 mt-2">{walletStats.pendingWithdrawalsCount || 0} pending</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 border-l-4 border-l-purple-600 rounded-lg p-5 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600">Total Withdrawn</p>
                          <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrencyWithConversion(walletStats.totalWithdrawn, walletStats.currency, selectedCurrency, selectedLanguage)}</p>
                          <p className="text-xs text-gray-600 mt-2">{walletStats.completedWithdrawals || 0} completed</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Performance Insights */}
                {filteredTxs.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <div className="mb-5">
                      <h3 className="text-base font-semibold text-gray-900">Performance Insights</h3>
                      <p className="text-xs text-gray-600 mt-1">Key metrics and trends for your business</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white border border-gray-200 border-l-4 border-l-green-600 rounded p-4">
                        <p className="text-xs font-medium text-gray-600">Average Transaction</p>
                        <p className="text-xl font-bold text-gray-900 mt-2">
                          {formatCurrencyWithConversion(
                            filteredTxs.reduce((sum, tx) => sum + tx.amount, 0) / filteredTxs.length,
                            currency,
                            selectedCurrency,
                            selectedLanguage
                          )}
                        </p>
                      </div>

                      <div className="bg-white border border-gray-200 border-l-4 border-l-blue-600 rounded p-4">
                        <p className="text-xs font-medium text-gray-600">Total Revenue</p>
                        <p className="text-xl font-bold text-gray-900 mt-2">
                          {formatCurrencyWithConversion(
                            filteredTxs.reduce((sum, tx) => sum + tx.amount, 0),
                            currency,
                            selectedCurrency,
                            selectedLanguage
                          )}
                        </p>
                      </div>

                      <div className="bg-white border border-gray-200 border-l-4 border-l-purple-600 rounded p-4">
                        <p className="text-xs font-medium text-gray-600">Success Rate</p>
                        <p className="text-xl font-bold text-gray-900 mt-2">
                          {Math.round((filteredTxs.filter(tx => tx.status === 'completed').length / filteredTxs.length) * 100)}%
                        </p>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3 pt-5 border-t border-gray-100">
                      <div className="text-center">
                        <p className="text-lg font-bold text-green-600">
                          {filteredTxs.filter(tx => tx.status === 'completed').length}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">Completed</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-yellow-600">
                          {filteredTxs.filter(tx => tx.status === 'pending').length}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">Pending</p>
                      </div>
                      <div className="text-center">
                        <div className="text-xl md:text-2xl font-bold text-blue-600">
                          {filteredTxs.filter(tx => tx.status === 'approved').length}
                        </div>
                        <div className="text-xs md:text-sm text-gray-500">Approved</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl md:text-2xl font-bold text-red-600">
                          {filteredTxs.filter(tx => tx.status === 'failed').length + filteredTxs.filter(tx => tx.status === 'rejected').length}
                        </div>
                        <div className="text-xs md:text-sm text-gray-500">Failed/Rejected</div>
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
                  <div className="mb-6 md:mb-8 bg-white shadow rounded-lg p-4 md:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                        <select
                          value={dateRange}
                          onChange={(e) => setDateRange(e.target.value)}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
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
                              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                            <input
                              type="date"
                              value={customEndDate}
                              onChange={(e) => setCustomEndDate(e.target.value)}
                              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            />
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
                        <select
                          value={transactionType}
                          onChange={(e) => setTransactionType(e.target.value)}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
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
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
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

                    <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
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
                        className="text-sm text-indigo-600 hover:text-indigo-500 self-start sm:self-auto"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </div>
                )}

                {/* Transaction History */}
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <div className="px-4 py-4 md:px-6 md:py-5 border-b border-gray-200">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <h3 className="text-lg leading-6 font-medium text-gray-900">Transaction History</h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                          A complete record of all your payments, earnings, and withdrawals
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 lg:gap-3">
                        <button
                          onClick={() => setShowFilters(!showFilters)}
                          className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-w-[80px]"
                        >
                          <svg className="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                          </svg>
                          Filters
                        </button>
                        <button
                          onClick={exportToCSV}
                          disabled={filteredTxs.length === 0}
                          className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
                        >
                          <svg className="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                          </svg>
                          Export CSV
                        </button>
                        <button
                          onClick={generateReport}
                          disabled={filteredTxs.length === 0}
                          className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
                        >
                          <svg className="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Generate Report
                        </button>
                        <button
                          onClick={refresh}
                          className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-w-[80px]"
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
                    {/* Mobile Card View */}
                    <div className="block md:hidden">
                      {filteredTxs.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                          <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions found</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            {txs.length === 0 ? "You haven't made any transactions yet." : "No transactions match your current filters."}
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-200">
                          {filteredTxs.slice().reverse().map((transaction) => (
                            <div key={transaction.id} className="p-4 hover:bg-gray-50">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0 pr-4">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <span className="text-sm font-medium text-gray-900 capitalize truncate">
                                      {transaction.transaction_type.replace('_', ' ')}
                                    </span>
                                    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${
                                      transaction.status === 'completed' ? 'bg-emerald-50 text-emerald-700'
                                        : transaction.status === 'pending' ? 'bg-amber-50 text-amber-700'
                                          : transaction.status === 'approved' ? 'bg-blue-50 text-blue-700'
                                            : 'bg-red-50 text-red-700'
                                    }`}>{transaction.status}</span>
                                  </div>
                                  <div className="text-xs text-gray-500 mb-1 truncate">
                                    {transaction.reference}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {formatDateTime(transaction.created_at)}
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className={`text-lg font-bold ${
                                    transaction.transaction_type === 'payment' ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {transaction.transaction_type === 'payment' ? '+' : '-'}
                                    {formatCurrencyWithConversion(transaction.amount, transaction.currency, selectedCurrency, selectedLanguage)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block">
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
                                  {formatCurrencyWithConversion(transaction.amount, transaction.currency, selectedCurrency, selectedLanguage)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${
                                    transaction.status === 'completed' ? 'bg-emerald-50 text-emerald-700'
                                      : transaction.status === 'pending' ? 'bg-amber-50 text-amber-700'
                                        : transaction.status === 'approved' ? 'bg-blue-50 text-blue-700'
                                          : 'bg-red-50 text-red-700'
                                  }`}>{transaction.status}</span>
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
                </div>
              </>
            )}

            {/* Business Recommendations Tab Content */}
            {activeTab === 'recommendations' && (
              <>
                {/* Daily Business Quote */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl px-4 py-3 mb-5 text-white">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl leading-none opacity-30 select-none">&ldquo;</span>
                    <p className="flex-1 text-sm font-medium leading-snug italic min-w-0">
                      {dailyQuote.text}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0 border-l border-white/20 pl-2.5">
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                        {dailyQuote.author.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold leading-tight">{dailyQuote.author}</p>
                        <p className="text-[10px] text-blue-200 leading-tight">{dailyQuote.title}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Header */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6 mb-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Business Recommendations</h3>
                      <p className="text-sm text-gray-500 mt-0.5">Personalized advice that refreshes daily based on your business data</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium self-start sm:self-auto">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      DirtTrails Ai
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
                  {/* Financial Health — Dynamic */}
                  <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-emerald-500 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                      <h4 className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Financial Health</h4>
                    </div>
                    <div className="p-5 space-y-4">
                      {dailyRecs.financial.map((rec, i) => (
                        <div key={i}>
                          {i > 0 && <hr className="border-gray-100 mb-4" />}
                          <h5 className="text-sm font-medium text-gray-900 mb-1">{rec.title}</h5>
                          <p className="text-sm text-gray-600 leading-relaxed">{rec.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Performance Optimization — Dynamic */}
                  <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-blue-500 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                      <h4 className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Performance Optimization</h4>
                    </div>
                    <div className="p-5 space-y-4">
                      {/* Success rate bar — always shown */}
                      <div>
                        <h5 className="text-sm font-medium text-gray-900 mb-1">Success Rate</h5>
                        <div className="flex items-center gap-3 mb-1.5">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${filteredTxs.length > 0 ? Math.round((filteredTxs.filter(tx => tx.status === 'completed').length / filteredTxs.length) * 100) : 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-900">
                            {filteredTxs.length > 0 ? Math.round((filteredTxs.filter(tx => tx.status === 'completed').length / filteredTxs.length) * 100) : 0}%
                          </span>
                        </div>
                      </div>
                      {dailyRecs.performance.map((rec, i) => (
                        <div key={i}>
                          <hr className="border-gray-100 mb-4" />
                          <h5 className="text-sm font-medium text-gray-900 mb-1">{rec.title}</h5>
                          <p className="text-sm text-gray-600 leading-relaxed">{rec.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Growth Opportunities — Dynamic */}
                  <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-violet-500 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                      <h4 className="text-sm font-semibold text-violet-700 uppercase tracking-wide">Growth Opportunities</h4>
                    </div>
                    <div className="p-5 space-y-4">
                      {dailyRecs.growth.map((rec, i) => (
                        <div key={i}>
                          {i > 0 && <hr className="border-gray-100 mb-4" />}
                          <h5 className="text-sm font-medium text-gray-900 mb-1">{rec.title}</h5>
                          <p className="text-sm text-gray-600 leading-relaxed">{rec.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Risk Management — Dynamic */}
                  <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-amber-500 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                      <h4 className="text-sm font-semibold text-amber-700 uppercase tracking-wide">Risk Management</h4>
                    </div>
                    <div className="p-5 space-y-4">
                      {dailyRecs.risk.map((rec, i) => (
                        <div key={i}>
                          {i > 0 && <hr className="border-gray-100 mb-4" />}
                          <h5 className="text-sm font-medium text-gray-900 mb-1">{rec.title}</h5>
                          <p className="text-sm text-gray-600 leading-relaxed">{rec.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recommended Actions — Dynamic */}
                <div className="mt-5 bg-white rounded-xl border border-gray-200 p-5 md:p-6">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Today's Action Items</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dailyRecs.actions.map((item, i) => {
                      const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-500']
                      return (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                          <span className={`flex-shrink-0 w-6 h-6 ${colors[i % colors.length]} text-white rounded-full flex items-center justify-center text-xs font-bold`}>
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900">{item.label}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Withdrawal Modal */}
        {showWithdraw && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-base font-semibold text-gray-900">Request Withdrawal</h3>
                <button onClick={() => setShowWithdraw(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">
                    Available: <span className="font-semibold text-gray-900">{formatCurrencyWithConversion(walletStats?.currentBalance || 0, walletStats?.currency || 'UGX', selectedCurrency, selectedLanguage)}</span>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={walletStats?.currentBalance || 0}
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{currency}</span>
                  </div>
                  {amount > (walletStats?.currentBalance || 0) && (
                    <p className="mt-1 text-xs text-red-600">Exceeds available balance</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Payout account</label>
                  {payoutOptions.length === 0 ? (
                    <p className="text-sm text-red-600">No payout account found. Please add a bank or mobile-money account in your profile before requesting a withdrawal.</p>
                  ) : payoutOptions.length === 1 ? (
                    <div className="text-sm text-gray-700">{payoutOptions[0].label}</div>
                  ) : (
                    <select
                      value={selectedPayoutId || ''}
                      onChange={(e) => setSelectedPayoutId(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select payout account</option>
                      {payoutOptions.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                  )}

                  {payoutOptions.length > 1 && (
                    <label className="inline-flex items-center mt-2 text-sm text-gray-600">
                      <input type="checkbox" checked={setAsDefault} onChange={(e) => setSetAsDefault(e.target.checked)} className="mr-2" />
                      Set as default payout account
                    </label>
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowWithdraw(false)}
                    className="flex-1 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >Cancel</button>
                  <button
                    onClick={handleWithdraw}
                    disabled={loading || amount <= 0 || amount > (walletStats?.currentBalance || 0) || payoutOptions.length === 0 || !selectedPayoutId}
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >{loading ? 'Submitting...' : 'Withdraw'}</button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}
