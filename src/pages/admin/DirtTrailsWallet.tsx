import { format } from 'date-fns';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { TrendingUp, DollarSign, CreditCard } from 'lucide-react';

import { useAdminTransactions } from '../../hooks/hook';
import { getAdminProfileId, getVendorWallet } from '../../lib/database';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { formatCurrencyWithConversion } from '../../lib/utils';
import { usePreferences } from '../../contexts/PreferencesContext';

// Assume commission rate is 5% (can be made configurable)

export function DirtTrailsWallet() {
  const { transactions, loading, error } = useAdminTransactions();
  const { selectedCurrency } = usePreferences();
  const [activeTab, setActiveTab] = useState<'overview' | 'earnings' | 'commissions' | 'refunds' | 'transactions'>('overview');
  const [dateRange, setDateRange] = useState<'all' | 'month' | 'quarter' | 'year'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20); // Show 20 transactions per page

  const [adminWallet, setAdminWallet] = useState<any>(null);

  // Memoize filtered transactions based on date range
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    const now = new Date();
    let startDate: Date | null = null;

    switch (dateRange) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return transactions;
    }

    return transactions.filter(t => !startDate || new Date(t.created_at) >= startDate);
  }, [transactions, dateRange]);

  // Memoize stats calculation
  const stats = useMemo(() => {
    if (!filteredTransactions) {
      return {
        totalRevenue: 0,
        totalCommissions: 0,
        totalRefunds: 0,
        totalWithdrawals: 0,
        netBalance: 0,
        pendingWithdrawals: 0
      };
    }

    // Total Revenue - all completed payments
    const totalRevenue = filteredTransactions
      .filter(t => t.transaction_type === 'payment' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    // Total Commissions - from admin wallet balance
    const totalCommissions = adminWallet?.balance || 0;

    // Total Refunds - completed refunds
    const totalRefunds = filteredTransactions
      .filter(t => t.transaction_type === 'refund' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    // Total Withdrawals - completed withdrawals
    const totalWithdrawals = filteredTransactions
      .filter(t => t.transaction_type === 'withdrawal' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    // Pending withdrawals
    const pendingWithdrawals = filteredTransactions
      .filter(t => t.transaction_type === 'withdrawal' && t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0);

    // Net Balance
    const netBalance = totalRevenue + totalCommissions - totalRefunds - totalWithdrawals;

    return {
      totalRevenue,
      totalCommissions,
      totalRefunds,
      totalWithdrawals,
      netBalance,
      pendingWithdrawals
    };
  }, [filteredTransactions, adminWallet]);

  // Calculate wallet statistics
  useEffect(() => {
    if (transactions && transactions.length > 0) {
      // Stats are now calculated via useMemo, no need for separate calculateStats function
    }

    // Fetch admin wallet balance
    const loadAdminWallet = async () => {
      try {
        const adminId = await getAdminProfileId();
        if (adminId) {
          const wallet = await getVendorWallet(adminId);
          setAdminWallet(wallet);
        }
      } catch (err) {
        console.error('Failed to load admin wallet for DirtTrailsWallet:', err);
        setAdminWallet(null);
      }
    };

    loadAdminWallet();
  }, [transactions]); // Removed dateRange from dependencies since filtering is now memoized

  // Memoize transaction category filters
  const commissionTransactions = useMemo(() => 
    filteredTransactions.filter((t: any) => t.transaction_type === 'payment' && t.status === 'completed'),
    [filteredTransactions]
  );

  const refundTransactions = useMemo(() => 
    filteredTransactions.filter((t: any) => t.transaction_type === 'refund'),
    [filteredTransactions]
  );

  const earningTransactions = useMemo(() => 
    filteredTransactions.filter((t: any) => t.transaction_type === 'payment' && t.status === 'completed'),
    [filteredTransactions]
  );

  const allCompanyTransactions = useMemo(() => 
    filteredTransactions.filter((t: any) => ['payment', 'withdrawal', 'refund'].includes(t.transaction_type)),
    [filteredTransactions]
  );

  const getCurrentTransactions = useCallback(() => {
    switch (activeTab) {
      case 'commissions':
        return commissionTransactions;
      case 'refunds':
        return refundTransactions;
      case 'earnings':
        return earningTransactions;
      case 'transactions':
        return allCompanyTransactions;
      default:
        return [];
    }
  }, [activeTab, commissionTransactions, refundTransactions, earningTransactions, allCompanyTransactions]);

  const currentTransactions = useMemo(() => getCurrentTransactions(), [getCurrentTransactions]);

  // Pagination logic
  const totalPages = Math.ceil(currentTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = useMemo(() => 
    currentTransactions.slice(startIndex, endIndex),
    [currentTransactions, startIndex, endIndex]
  );

  // Reset to page 1 when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, dateRange]);

  // Memoize export functions
  const exportToCSV = useCallback((data: any[], filename: string) => {
    const headers = Object.keys(data[0] || {}).join(',');
    const rows = data.map(row =>
      Object.values(row).map(value =>
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(',')
    );
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }, []);

  const exportWalletReport = useCallback(() => {
    const reportData = currentTransactions.map((t: any) => ({
      'Transaction ID': t.id.slice(0, 8),
      'Type': t.transaction_type,
      'Amount': t.amount,
      'Currency': t.currency,
      'Status': t.status,
      'Reference': t.reference,
      'Created At': format(new Date(t.created_at), 'yyyy-MM-dd HH:mm:ss'),
      'Vendor': t.vendors?.business_name || 'N/A'
    }));

    exportToCSV(reportData, `dirt-trails-wallet-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  }, [currentTransactions, exportToCSV]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading wallet data: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dirt Trails Wallet</h1>
          <p className="mt-2 text-sm text-gray-600">Track company finances, commissions, charges, and internal earnings</p>
        </div>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Net Balance Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-md p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-100">Net Balance</p>
              <p className="text-xl font-semibold text-gray-900 mt-2">
                {formatCurrencyWithConversion(stats.netBalance, selectedCurrency)}
              </p>
            </div>
            <DollarSign className="h-10 w-10 text-blue-200 opacity-50" />
          </div>
        </div>

        {/* Total Revenue Card */}
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-600">
          <div>
            <p className="text-xs font-medium text-gray-600">Total Revenue</p>
            <p className="text-xl font-semibold text-gray-900 mt-2">
              {formatCurrencyWithConversion(stats.totalRevenue, selectedCurrency)}
            </p>
          </div>
          <TrendingUp className="mt-4 h-5 w-5 text-green-600" />
        </div>

        {/* Total Commissions Card */}
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-600">
          <div>
            <p className="text-xs font-medium text-gray-600">Commissions Earned</p>
            <p className="text-xl font-semibold text-gray-900 mt-2">
              {formatCurrencyWithConversion(stats.totalCommissions, selectedCurrency)}
            </p>
          </div>
          <CreditCard className="mt-4 h-5 w-5 text-purple-600" />
        </div>

        {/* Platform Charges Card */}
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-600">
          <div>
            <p className="text-xs font-medium text-gray-600">Refunds Issued</p>
            <p className="text-xl font-semibold text-gray-900 mt-2">
              {formatCurrencyWithConversion(stats.totalRefunds, selectedCurrency)}
            </p>
          </div>
          <CreditCard className="mt-4 h-5 w-5 text-orange-600" />
        </div>

        {/* Total Withdrawals Card */}
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-600">
          <div>
            <p className="text-xs font-medium text-gray-600">Withdrawals</p>
            <p className="text-xl font-semibold text-gray-900 mt-2">
              {formatCurrencyWithConversion(stats.totalWithdrawals, selectedCurrency)}
            </p>
          </div>
          <TrendingUp className="mt-4 h-5 w-5 text-red-600 rotate-180" />
        </div>
      </div>

      {/* Tabs Section */}
      <div className="bg-white rounded-xl shadow-md">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('earnings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'earnings'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Earnings ({earningTransactions.length})
            </button>
            <button
              onClick={() => setActiveTab('commissions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'commissions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Commissions ({commissionTransactions.length})
            </button>
            <button
              onClick={() => setActiveTab('refunds')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'refunds'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Refunds ({refundTransactions.length})
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'transactions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              All Transactions ({allCompanyTransactions.length})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Wallet Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="text-xs font-medium text-gray-600">Total Earnings</p>
                    <p className="text-xl font-bold text-green-600 mt-2">
                      {formatCurrencyWithConversion(stats.totalRevenue + stats.totalCommissions, selectedCurrency)}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Revenue + Commissions</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="text-xs font-medium text-gray-600">Refunds Processed</p>
                    <p className="text-xl font-bold text-orange-600 mt-2">
                      {formatCurrencyWithConversion(stats.totalRefunds, selectedCurrency)}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Charges to company</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                    <span className="text-gray-700">Revenue from Bookings</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrencyWithConversion(stats.totalRevenue, selectedCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                    <span className="text-gray-700">Commissions (calculated from bookings)</span>
                    <span className="font-semibold text-gray-900">
                      +{formatCurrencyWithConversion(stats.totalCommissions, selectedCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                    <span className="text-gray-700">Refunds Issued</span>
                    <span className="font-semibold text-orange-600">
                      -{formatCurrencyWithConversion(stats.totalRefunds, selectedCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                    <span className="text-gray-700">Vendor Withdrawals</span>
                    <span className="font-semibold text-red-600">
                      -{formatCurrencyWithConversion(stats.totalWithdrawals, selectedCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-3 bg-blue-50 px-4 py-2 rounded-lg">
                    <span className="text-sm text-gray-900 font-semibold">Net Balance</span>
                    <span className="font-bold text-lg text-blue-600">
                      {formatCurrencyWithConversion(stats.netBalance, selectedCurrency)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={exportWalletReport}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Export Report
                </button>
              </div>
            </div>
          )}

          {activeTab !== 'overview' && (
            <div className="space-y-4">
              {/* Transaction count and pagination info */}
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Showing {startIndex + 1}-{Math.min(endIndex, currentTransactions.length)} of {currentTransactions.length} transactions
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>

              {paginatedTransactions.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Reference
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedTransactions.map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 capitalize">
                              {transaction.transaction_type.replace(/_/g, ' ')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                              {formatCurrencyWithConversion(transaction.amount, selectedCurrency)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                transaction.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : transaction.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : transaction.status === 'failed'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {transaction.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {transaction.reference}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-between items-center">
                    <button
                      onClick={exportWalletReport}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Export {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                    </button>
                    {totalPages > 1 && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                        >
                          First
                        </button>
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                        >
                          ‹
                        </button>
                        <span className="text-xs text-gray-600 px-2">
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                        >
                          ›
                        </button>
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                        >
                          Last
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No transactions found for this category</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Date Range</h3>
        <div className="flex space-x-3">
          {(['all', 'month', 'quarter', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                dateRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === 'all' ? 'All Time' : range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
