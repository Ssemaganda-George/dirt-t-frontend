import { format } from 'date-fns';
import { useState, useEffect, type ReactNode } from 'react';
import { useAdminTransactions } from '../../hooks/hook';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { formatCurrencyWithConversion } from '../../lib/utils';
import { usePreferences } from '../../contexts/PreferencesContext'
import {
  updateTransactionStatus,
  getAllVendorWallets,
  getAllTransactionsForAdmin,
  getAllBookings,
  getAllVendors,
  platformTakeFromBooking,
  platformTakeFromTransaction,
} from '../../lib/database';
import type { Transaction, Vendor } from '../../lib/database';

function walletsPlatformFeeCell(
  tx: { transaction_type: string; booking_id?: string | null; bookings?: unknown },
  serviceCurrency: string,
  targetCurrency: string,
  locale: string
): ReactNode {
  if (tx.transaction_type !== 'payment') return '—';
  const bookings = tx.bookings as { id?: string } | null | undefined;
  // Debug log
  // eslint-disable-next-line no-console
  console.debug('walletsPlatformFeeCell: tx.bookings =', bookings);
  if (bookings?.id) {
    const fee = platformTakeFromTransaction(tx as never);
    // Show 0 if booking exists but fee is zero
    return formatCurrencyWithConversion(
      fee,
      serviceCurrency,
      targetCurrency,
      locale
    );
  }
  if (tx.booking_id) {
    return <span className="text-amber-700 font-normal text-xs">N/A</span>;
  }
  return '—';
}

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
  /** Rows in `vendors` (directory) */
  registeredVendorsCount: number;
  /** `vendors.status = approved` */
  approvedVendorsCount: number;
  /** Rows in `wallets` */
  vendorWalletRowsCount: number;
  /** Wallets whose vendor_id exists in `vendors` */
  walletsLinkedCount: number;
  /** Wallets with no matching vendor row (data cleanup needed) */
  orphanWalletsCount: number;
  totalBalance: number;
  /** Platform take: sum of platform_fee + commission_amount on qualifying bookings */
  totalPlatformFeesFromBookings: number;
  totalWithdrawn: number;
  pendingWithdrawals: number;
  recentTransactions: number;
}

export function Transactions() {
  const { transactions, loading: txLoading, error: txError, refetch } = useAdminTransactions();
  const { selectedCurrency, selectedLanguage } = usePreferences()
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [vendorWallets, setVendorWallets] = useState<VendorWallet[]>([]);
  const [allVendors, setAllVendors] = useState<Vendor[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'vendors' | 'transactions' | 'approvals'>('overview');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<any | null>(null);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [walletsData, vendorsData, transactionsData, bookingsData] = await Promise.all([
        getAllVendorWallets(),
        getAllVendors(),
        getAllTransactionsForAdmin(),
        getAllBookings()
      ]);

      setVendorWallets(walletsData);
      setAllVendors(vendorsData || []);
      setAllTransactions(transactionsData);
      // Debug: log loaded transactions
      // eslint-disable-next-line no-console
      console.log('Loaded transactionsData:', transactionsData);
      setAllBookings(bookingsData);
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
    const registeredVendorsCount = allVendors.length;
    const approvedVendorsCount = allVendors.filter(v => v.status === 'approved').length;
    const vendorWalletRowsCount = vendorWallets.length;
    const walletsLinkedCount = vendorWallets.filter(w => w.vendors != null).length;
    const orphanWalletsCount = vendorWallets.filter(w => w.vendors == null).length;
    const totalBalance = vendorWallets.reduce((sum, w) => sum + (Number(w.balance) || 0), 0);
    const bookingCountsAsPaid = (b: (typeof allBookings)[0]) => {
      const st = (b as { status?: string }).status;
      const paid = (b as { payment_status?: string }).payment_status;
      if (st !== 'confirmed' && st !== 'completed') return false;
      if (paid === 'refunded') return false;
      return paid === 'paid' || paid == null || paid === '';
    };
    const totalPlatformFeesFromBookings = allBookings
      .filter(bookingCountsAsPaid)
      .reduce((sum, b) => sum + platformTakeFromBooking(b as never), 0);
    const totalWithdrawn = allTransactions
      .filter(t => t.transaction_type === 'withdrawal' && t.status === 'completed')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const pendingWithdrawals = transactions.filter(t =>
      t.transaction_type === 'withdrawal' && t.status === 'pending'
    ).length;
    const recentTransactions = allTransactions.filter(t =>
      new Date(t.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;

    return {
      registeredVendorsCount,
      approvedVendorsCount,
      vendorWalletRowsCount,
      walletsLinkedCount,
      orphanWalletsCount,
      totalBalance,
      totalPlatformFeesFromBookings,
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
            <a href="/admin/tourist-wallets" className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition">Tourist Wallets</a>
            <a href="/admin/conservation-wallet" className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 transition">Conservation Wallet</a>
            <a
              href="/admin/finance"
              className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition"
            >
              Finance Processing
            </a>
        </div>
      </div>

      <div className="border-b border-gray-200 px-2 sm:px-4">
        <nav className="flex w-full flex-wrap sm:flex-nowrap" aria-label="Wallet management tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 min-w-[7.5rem] sm:min-w-0 py-3 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm text-center whitespace-nowrap transition-colors ${
                tab.current
                  ? 'border-blue-600 text-blue-600'
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
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-blue-500 p-4 hover:shadow-sm transition-all">
              <p className="text-xs font-medium text-gray-500">Registered vendors</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.registeredVendorsCount}</p>
              <p className="text-xs text-gray-400 mt-1">Rows in vendors table</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-emerald-500 p-4 hover:shadow-sm transition-all">
              <p className="text-xs font-medium text-gray-500">Approved vendors</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.approvedVendorsCount}</p>
              <p className="text-xs text-gray-400 mt-1">status = approved (directory)</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-indigo-500 p-4 hover:shadow-sm transition-all">
              <p className="text-xs font-medium text-gray-500">Vendor wallets</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.vendorWalletRowsCount}</p>
              <p className="text-xs text-gray-400 mt-1">
                {stats.walletsLinkedCount} linked ·{' '}
                <span className={stats.orphanWalletsCount > 0 ? 'text-amber-700 font-medium' : ''}>
                  {stats.orphanWalletsCount} orphan{stats.orphanWalletsCount === 1 ? '' : 's'}
                </span>
              </p>
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
              <p className="text-xs font-medium text-gray-500">Platform fees &amp; commission</p>
              <p className="text-xs text-gray-400 mt-0.5">From paid bookings (our cut)</p>
              <p className="text-lg font-semibold text-gray-900 mt-2">
                {formatCurrencyWithConversion(stats.totalPlatformFeesFromBookings, 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')}
              </p>
              <p className="text-xs text-emerald-600 mt-1">↑ Booking fee totals</p>
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
              <h3 className="text-sm font-semibold text-gray-900">Wallets by balance</h3>
              <p className="text-xs text-gray-500 mt-1">
                Vendor directory: {stats.registeredVendorsCount} registered ({stats.approvedVendorsCount} approved).
                Ledger: {stats.vendorWalletRowsCount} wallet row{stats.vendorWalletRowsCount === 1 ? '' : 's'} — {stats.orphanWalletsCount} missing vendor row
                {stats.orphanWalletsCount === 1 ? '' : 's'} in DB.
              </p>
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
                      .slice()
                      .sort((a, b) => {
                        const aOk = a.vendors != null ? 1 : 0;
                        const bOk = b.vendors != null ? 1 : 0;
                        if (bOk !== aOk) return bOk - aOk;
                        return Number(b.balance) - Number(a.balance);
                      })
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
                                    <div className="text-xs text-red-600 mt-1">
                                      No vendor row for this wallet&apos;s <span className="font-mono">vendor_id</span> — balance may be legacy.{' '}
                                      <a className="underline" href={`/admin/vendors/${wallet.vendor_id}`}>Open vendor id</a>
                                    </div>
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
                  {vendorWallets
                    .slice()
                    .sort((a, b) => {
                      const aOk = a.vendors != null ? 1 : 0;
                      const bOk = b.vendors != null ? 1 : 0;
                      if (bOk !== aOk) return bOk - aOk;
                      return Number(b.balance) - Number(a.balance);
                    })
                    .map((wallet) => {
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
                                  <div className="text-xs text-red-600 mt-1">
                                    No vendor row for this wallet&apos;s <span className="font-mono">vendor_id</span> — balance may be legacy.{' '}
                                    <a className="underline" href={`/admin/vendors/${wallet.vendor_id}`}>Open vendor id</a>
                                  </div>
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
              {/* {console.log('All Transactions:', allTransactions)} */}
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
                      Platform fee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer paid
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-800">
                          {walletsPlatformFeeCell(
                            transaction,
                            transaction.currency || 'UGX',
                            selectedCurrency || transaction.currency || 'UGX',
                            selectedLanguage || 'en-US'
                          )}
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
                        Payout Account
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
                          {transaction.vendors ? (
                            <button
                              onClick={() => setSelectedVendor(transaction.vendors)}
                              className="text-blue-600 hover:underline"
                            >
                              {transaction.vendors.business_name || 'Unknown Vendor'}
                            </button>
                          ) : (
                            'Unknown Vendor'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {transaction.payout_meta ? (
                            transaction.payout_meta.type === 'bank' ? (
                              <div className="text-sm">
                                <div className="font-medium">{transaction.payout_meta.name || transaction.payout_meta.account_name}</div>
                                <div className="text-xs text-gray-500">Acct: {transaction.payout_meta.account_number}</div>
                              </div>
                            ) : (
                              <div className="text-sm">
                                <div className="font-medium">{transaction.payout_meta.provider || 'Mobile Money'}</div>
                                <div className="text-xs text-gray-500">{transaction.payout_meta.country_code || ''} {transaction.payout_meta.phone || ''}</div>
                              </div>
                            )
                          ) : (
                            <span className="text-xs text-gray-400">No payout info</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {formatCurrencyWithConversion(transaction.amount, transaction.currency || 'UGX', selectedCurrency || transaction.currency || 'UGX', selectedLanguage || 'en-US')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                          <button onClick={() => setSelectedTransaction(transaction)} className="text-blue-600 hover:underline">{transaction.payment_method.replace('_', ' ')}</button>
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

      {/* Payment details modal for approvals */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setSelectedTransaction(null)} />
          <div className="relative bg-white shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col rounded-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Payout Details</h2>
              <button onClick={() => setSelectedTransaction(null)} className="text-gray-500 hover:text-black">Close</button>
            </div>
            <div className="p-6 overflow-y-auto">
              <p className="text-sm text-gray-600">Method: <span className="font-medium">{selectedTransaction.payment_method.replace('_',' ')}</span></p>
              <div className="mt-4">
                {selectedTransaction.payout_meta ? (
                  selectedTransaction.payout_meta.type === 'bank' ? (
                    <div>
                      <div className="text-sm font-medium">{selectedTransaction.payout_meta.name || selectedTransaction.payout_meta.account_name}</div>
                      <div className="text-sm text-gray-600">Account: <span className="font-mono">{selectedTransaction.payout_meta.account_number}</span></div>
                      <div className="mt-3"><button onClick={() => navigator.clipboard.writeText(selectedTransaction.payout_meta.account_number || '')} className="px-3 py-1 bg-gray-100 rounded text-sm">Copy account number</button></div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm font-medium">{selectedTransaction.payout_meta.provider || 'Mobile Money'}</div>
                      <div className="text-sm text-gray-600">Phone: <span className="font-mono">{(selectedTransaction.payout_meta.country_code || '') + ' ' + (selectedTransaction.payout_meta.phone || '')}</span></div>
                      <div className="mt-3"><button onClick={() => navigator.clipboard.writeText(((selectedTransaction.payout_meta.country_code || '') + (selectedTransaction.payout_meta.phone || '')).trim())} className="px-3 py-1 bg-gray-100 rounded text-sm">Copy phone number</button></div>
                    </div>
                  )
                ) : (
                  <div className="text-sm text-gray-500">No payout info available</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vendor details modal */}
      {selectedVendor && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setSelectedVendor(null)} />
          <div className="relative bg-white shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col rounded-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Vendor Details</h2>
              <button onClick={() => setSelectedVendor(null)} className="text-gray-500 hover:text-black">Close</button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="mb-4">
                <h3 className="text-sm font-semibold">{selectedVendor.business_name || 'Business'}</h3>
                <p className="text-xs text-gray-500">{selectedVendor.business_email || ''}</p>
                <p className="text-xs text-gray-400 mt-1">Status: {selectedVendor.status || '—'}</p>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium">Business Phones</h4>
                <div className="mt-2 space-y-2">
                  {(selectedVendor.business_phones || []).map((p: any, i: number) => (
                    <div key={i} className="text-sm text-gray-700">
                      <div className="font-medium">{p.country_code || ''} {p.phone || ''}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium">Bank Details</h4>
                {selectedVendor.bank_details ? (
                  <div className="mt-2 text-sm text-gray-700">
                    <div className="font-medium">{selectedVendor.bank_details.name || selectedVendor.bank_details.account_name}</div>
                    <div className="text-xs text-gray-600">Account: <span className="font-mono">{selectedVendor.bank_details.account_number}</span></div>
                    <div className="text-xs text-gray-600">Branch: {selectedVendor.bank_details.branch || '—'}</div>
                    <div className="mt-2"><button onClick={() => navigator.clipboard.writeText(selectedVendor.bank_details.account_number || '')} className="px-3 py-1 bg-gray-100 rounded text-sm">Copy account number</button></div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 mt-2">No bank details provided</div>
                )}
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium">Mobile Money Accounts</h4>
                <div className="mt-2 space-y-2">
                  {(selectedVendor.mobile_money_accounts || []).map((m: any, idx: number) => (
                    <div key={idx} className="text-sm text-gray-700">
                      <div className="font-medium">{m.provider || 'Mobile Money'}</div>
                      {m.name && <div className="text-sm text-gray-700">Account name: <span className="font-medium">{m.name}</span></div>}
                      <div className="text-xs text-gray-600">{(m.country_code || '') + ' ' + (m.phone || '')}</div>
                      <div className="mt-1">
                        <button onClick={() => navigator.clipboard.writeText((m.name || '').toString())} className="px-3 py-1 bg-gray-100 rounded text-sm mr-2">Copy name</button>
                        <button onClick={() => navigator.clipboard.writeText(((m.country_code || '') + (m.phone || '')).trim())} className="px-3 py-1 bg-gray-100 rounded text-sm">Copy phone</button>
                      </div>
                    </div>
                  ))}
                  {(!selectedVendor.mobile_money_accounts || selectedVendor.mobile_money_accounts.length === 0) && (
                    <div className="text-sm text-gray-500">No mobile money accounts provided</div>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <a href={`/admin/vendors/${selectedVendor.id || ''}`} className="text-sm text-blue-600 hover:underline">Open full vendor profile</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}