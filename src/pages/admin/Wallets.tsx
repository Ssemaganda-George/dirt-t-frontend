import { format } from 'date-fns';
import { useAdminTransactions } from '../../hooks/hook';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { formatCurrencyWithConversion } from '../../lib/utils';
import { usePreferences } from '../../contexts/PreferencesContext'
import { updateTransactionStatus, getAllVendorWallets, getAllTransactionsForAdmin } from '../../lib/database';
import { useState, useEffect } from 'react';

interface VendorWallet {
  id: string;
  vendor_id: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
  vendors: {
    business_name: string;
    business_email: string;
    status: string;
    created_at: string;
  };
}

interface WalletStats {
  totalVendors: number;
  activeVendors: number;
  totalBalance: number;
  totalEarnings: number;
  totalWithdrawn: number;
  pendingWithdrawals: number;
  recentTransactions: number;
}

export function Transactions() {
  const { transactions, loading: txLoading, error: txError, refetch } = useAdminTransactions();
  const { selectedCurrency, selectedLanguage } = usePreferences()
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [vendorWallets, setVendorWallets] = useState<VendorWallet[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'vendors' | 'transactions' | 'approvals'>('overview');

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [walletsData, transactionsData] = await Promise.all([
        getAllVendorWallets(),
        // Use admin version so admins see all transactions (not limited by RLS for non-admins)
        getAllTransactionsForAdmin()
      ]);

      setVendorWallets(walletsData);
      setAllTransactions(transactionsData);
    } catch (err) {
      console.error('Error loading wallet data:', err);
      setError('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (transactionId: string, approved: boolean) => {
    setProcessingId(transactionId);
    try {
      await updateTransactionStatus(transactionId, approved ? 'approved' : 'failed');
      refetch(); // Refresh the transactions list
      loadWalletData(); // Refresh wallet data
    } catch (err) {
      console.error('Error updating transaction status:', err);
      alert('Failed to update transaction status. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  // Calculate comprehensive stats
  const calculateStats = (): WalletStats => {
    const totalVendors = vendorWallets.length;
    const activeVendors = vendorWallets.filter(w => w.vendors?.status === 'approved').length;
    const totalBalance = vendorWallets.reduce((sum, w) => sum + (Number(w.balance) || 0), 0);
    const totalEarnings = allTransactions
      .filter(t => t.transaction_type === 'payment' && t.status === 'completed')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const totalWithdrawn = allTransactions
      .filter(t => t.transaction_type === 'withdrawal' && t.status === 'completed')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const pendingWithdrawals = transactions.filter(t =>
      t.transaction_type === 'withdrawal' && t.status === 'pending'
    ).length;
    const recentTransactions = allTransactions.filter(t =>
      new Date(t.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;

    return {
      totalVendors,
      activeVendors,
      totalBalance,
      totalEarnings,
      totalWithdrawn,
      pendingWithdrawals,
      recentTransactions
    };
  };

  const stats = calculateStats();

  // Filter to show only pending withdrawals that need admin approval
  const pendingWithdrawals = transactions.filter(t =>
    t.transaction_type === 'withdrawal' && t.status === 'pending'
  );

  if (loading || txLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || txError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading wallet data: {error || txError}</p>
        <button
          onClick={() => { loadWalletData(); refetch(); }}
          className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', current: activeTab === 'overview' },
    { id: 'vendors', name: 'Vendor Wallets', current: activeTab === 'vendors' },
    { id: 'transactions', name: 'All Transactions', current: activeTab === 'transactions' },
    { id: 'approvals', name: 'Withdrawal Approvals', current: activeTab === 'approvals' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Wallet Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage vendor wallets and withdrawal requests</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { loadWalletData(); refetch(); }}
            className="px-4 py-2 border border-gray-200 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition"
          >
            Refresh
          </button>
          <a
            href="/admin/finance"
            className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition"
          >
            Finance Processing
          </a>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                tab.current
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-blue-500 p-4 hover:shadow-sm transition-all">
              <p className="text-xs font-medium text-gray-500">Total Vendors</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.totalVendors}</p>
              <p className="text-xs text-gray-400 mt-1">Registered</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-emerald-500 p-4 hover:shadow-sm transition-all">
              <p className="text-xs font-medium text-gray-500">Active Vendors</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.activeVendors}</p>
              <p className="text-xs text-gray-400 mt-1">With balance</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-emerald-500 p-4 hover:shadow-sm transition-all">
              <p className="text-xs font-medium text-gray-500">Total Balance</p>
              <p className="text-lg font-semibold text-gray-900 mt-2">
                {formatCurrencyWithConversion(stats.totalBalance, 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')}
              </p>
              <p className="text-xs text-gray-400 mt-1">All wallets</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-violet-500 p-4 hover:shadow-sm transition-all">
              <p className="text-xs font-medium text-gray-500">Recent Transactions</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.recentTransactions}</p>
              <p className="text-xs text-gray-400 mt-1">Last 30 days</p>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-emerald-500 p-4 hover:shadow-sm transition-all">
              <p className="text-xs font-medium text-gray-500">Total Earnings</p>
              <p className="text-lg font-semibold text-gray-900 mt-2">
                {formatCurrencyWithConversion(stats.totalEarnings, 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')}
              </p>
              <p className="text-xs text-emerald-600 mt-1">↑ Incoming</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-red-500 p-4 hover:shadow-sm transition-all">
              <p className="text-xs font-medium text-gray-500">Total Withdrawn</p>
              <p className="text-lg font-semibold text-gray-900 mt-2">
                {formatCurrencyWithConversion(stats.totalWithdrawn, 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')}
              </p>
              <p className="text-xs text-red-600 mt-1">↓ Outgoing</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-amber-500 p-4 hover:shadow-sm transition-all">
              <p className="text-xs font-medium text-gray-500">Pending Approvals</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.pendingWithdrawals}</p>
              <p className="text-xs text-gray-400 mt-1">Awaiting review</p>
            </div>
          </div>

          {/* Top Performing Vendors */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200">
            <div className="border-b border-gray-100 px-5 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Top Performing Vendors</h3>
            </div>
            <div className="p-5">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vendorWallets
                      .sort((a, b) => b.balance - a.balance)
                      .slice(0, 10)
                      .map((wallet) => {
                        const name = wallet.vendors?.business_name || (wallet.vendor_id ? `Vendor ${wallet.vendor_id.slice(0,8)}` : 'Unknown');
                        const email = wallet.vendors?.business_email || (wallet.vendor_id ? wallet.vendor_id.slice(0,8) : '—');
                        // If vendor metadata is missing (join returned null), mark as 'missing'
                        const status = wallet.vendors?.status ?? (wallet.vendors === null ? 'missing' : 'unknown');
                        const joinedAt = wallet.vendors?.created_at || wallet.created_at || null;
                        const balance = formatCurrencyWithConversion(wallet.balance, wallet.currency || 'UGX', selectedCurrency || wallet.currency || 'UGX', selectedLanguage || 'en-US');

                        const statusCls =
                          status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                          status === 'pending' ? 'bg-amber-50 text-amber-700' :
                          status === 'missing' ? 'bg-red-50 text-red-800' :
                          'bg-gray-100 text-gray-600';

                        return (
                          <tr key={wallet.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 truncate">{name}</div>
                                  <div className="text-xs text-gray-500 truncate">{email}</div>
                                  {wallet.vendors === null && (
                                    <div className="text-xs text-red-600 mt-1">Missing vendor record — <a className="underline" href={`/admin/vendors/${wallet.vendor_id}`}>View vendor</a></div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{balance}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                  <span title={wallet.vendors === null ? 'Vendor metadata not found' : undefined} className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusCls}`}>{status}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{joinedAt ? format(new Date(joinedAt), 'MMM dd, yyyy') : '—'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center gap-2">
                                <a href={`/admin/vendors/${wallet.vendor_id}`} className="inline-flex items-center px-2 py-1 text-xs rounded-md text-blue-600 hover:underline">View</a>
                                <button
                                  onClick={() => { /* export vendor wallet */ alert('Export wallet for ' + name); }}
                                  className="inline-flex items-center px-2 py-1 text-xs rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                                >
                                  Export
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Vendor Wallets Tab */}
      {activeTab === 'vendors' && (
        <div className="bg-white shadow-sm rounded-xl border border-gray-200">
          <div className="border-b border-gray-100 px-5 py-3">
              <h3 className="text-sm font-semibold text-gray-900">All Vendor Wallets</h3>
            </div>
            <div className="p-5">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendor Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Wallet Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Transactions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vendorWallets.map((wallet) => {
                                    const vendorTransactions = allTransactions.filter(t => t.vendor_id === wallet.vendor_id);
                    return (
                      <tr key={wallet.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {wallet.vendors?.business_name || (wallet.vendor_id ? `Vendor ${wallet.vendor_id.slice(0,8)}` : 'Unknown Vendor')}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {wallet.vendors?.business_email || (wallet.vendor_id ? wallet.vendor_id.slice(0,8) : '—')}
                                </div>
                                {wallet.vendors === null && (
                                  <div className="text-xs text-red-600 mt-1">Missing vendor record — <a className="underline" href={`/admin/vendors/${wallet.vendor_id}`}>View vendor</a></div>
                                )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {formatCurrencyWithConversion(wallet.balance, wallet.currency || 'UGX', selectedCurrency || wallet.currency || 'UGX', selectedLanguage || 'en-US')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            wallet.vendors?.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : wallet.vendors?.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {wallet.vendors?.status || 'unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {vendorTransactions.length}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(wallet.updated_at), 'MMM dd, yyyy HH:mm')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* All Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="bg-white shadow-sm rounded-xl border border-gray-200">
          <div className="border-b border-gray-100 px-5 py-3">
              <h3 className="text-sm font-semibold text-gray-900">All Transactions</h3>
            </div>
            <div className="p-5">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allTransactions
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 100)
                    .map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{transaction.id.slice(0, 8)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.vendors?.business_name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                          {transaction.transaction_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {formatCurrencyWithConversion(transaction.amount, transaction.currency || 'UGX', selectedCurrency || transaction.currency || 'UGX', selectedLanguage || 'en-US')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            transaction.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : transaction.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {transaction.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Approvals Tab */}
      {activeTab === 'approvals' && (
        <>
          {/* Approval Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-amber-500 p-4 hover:shadow-sm transition-all">
              <p className="text-xs font-medium text-gray-500">Pending Approvals</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">{pendingWithdrawals.length}</p>
              <p className="text-xs text-gray-400 mt-1">Awaiting review</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-emerald-500 p-4 hover:shadow-sm transition-all">
              <p className="text-xs font-medium text-gray-500">Pending Amount</p>
              <p className="text-lg font-semibold text-gray-900 mt-2">
                {formatCurrencyWithConversion(pendingWithdrawals.reduce((sum, t) => sum + t.amount, 0), 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')}
              </p>
              <p className="text-xs text-gray-400 mt-1">Total pending</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-blue-500 p-4 hover:shadow-sm transition-all">
              <p className="text-xs font-medium text-gray-500">Approved Today</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">
                {transactions.filter(t =>
                  t.transaction_type === 'withdrawal' &&
                  t.status === 'approved' &&
                  new Date(t.created_at).toDateString() === new Date().toDateString()
                ).length}
              </p>
              <p className="text-xs text-gray-400 mt-1">Today's approvals</p>
            </div>
          </div>

          {/* Pending Withdrawals Table */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200">
            <div className="border-b border-gray-100 px-5 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Pending Withdrawal Approvals</h3>
            </div>
            <div className="p-5">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transaction ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vendor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requested
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingWithdrawals.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{transaction.id.slice(0, 8)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.vendors?.business_name || 'Unknown Vendor'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {formatCurrencyWithConversion(transaction.amount, transaction.currency || 'UGX', selectedCurrency || transaction.currency || 'UGX', selectedLanguage || 'en-US')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                          {transaction.payment_method.replace('_', ' ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleApproval(transaction.id, true)}
                              disabled={processingId === transaction.id}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {processingId === transaction.id ? 'Processing...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleApproval(transaction.id, false)}
                              disabled={processingId === transaction.id}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pendingWithdrawals.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No pending withdrawal approvals</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}