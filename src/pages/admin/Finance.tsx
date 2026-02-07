import { format } from 'date-fns';
import { useAdminTransactions } from '../../hooks/hook';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { formatCurrencyWithConversion } from '../../lib/utils';
import { useState } from 'react';
import { usePreferences } from '../../contexts/PreferencesContext'
import { supabase } from '../../lib/supabaseClient';

export function Finance() {
  const { transactions, loading, error, refetch } = useAdminTransactions();
  const { selectedCurrency, selectedLanguage } = usePreferences()
  const [activeTab, setActiveTab] = useState<'withdrawals' | 'payments' | 'refunds' | 'rejected'>('withdrawals');
  const [uploadingReceipt, setUploadingReceipt] = useState<string | null>(null);
  const [paymentNotes, setPaymentNotes] = useState<{[key: string]: string}>({});
  const [dateRange, setDateRange] = useState<'all' | 'month' | 'quarter' | 'year'>('all');

  // Filter transactions by date range
  const getFilteredTransactions = () => {
    const now = new Date();
    let startDate: Date;

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

    return transactions.filter(t => new Date(t.created_at) >= startDate);
  };

  const filteredTransactions = getFilteredTransactions();

  // Export functions
  const exportToCSV = (data: any[], filename: string) => {
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
  };

  const exportFinancialReport = () => {
    const reportData = filteredTransactions.map(t => ({
      'Transaction ID': t.id.slice(0, 8),
      'Vendor': t.vendors?.business_name || 'Unknown',
      'Type': t.transaction_type,
      'Amount': t.amount,
      'Currency': t.currency,
      'Status': t.status,
      'Payment Method': t.payment_method,
      'Reference': t.reference,
      'Created At': format(new Date(t.created_at), 'yyyy-MM-dd HH:mm:ss'),
      'Processed By': t.processed_by || 'N/A',
      'Notes': t.payment_notes || ''
    }));

    exportToCSV(reportData, `financial-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const exportVendorReport = () => {
    const vendorReport = Object.values(vendorStats).map((vendor: any) => ({
      'Vendor Name': vendor.vendorName,
      'Total Revenue': vendor.totalRevenue,
      'Total Withdrawals': vendor.totalWithdrawals,
      'Pending Withdrawals': vendor.pendingWithdrawals,
      'Transaction Count': vendor.transactionCount,
      'Net Balance': vendor.totalRevenue - vendor.totalWithdrawals
    }));

    exportToCSV(vendorReport, `vendor-performance-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const exportMonthlyTrends = () => {
    const trendsData = stats.monthlyData.map((month: any) => ({
      'Month': month.month,
      'Revenue': month.revenue,
      'Withdrawals': month.withdrawals,
      'Net Revenue': month.net
    }));

    exportToCSV(trendsData, `monthly-trends-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">Error loading finance data: {error}</p>
      </div>
    );
  }

  const handleReceiptUpload = async (transactionId: string, file: File) => {
    setUploadingReceipt(transactionId);
    try {
      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${transactionId}-receipt-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      // Update transaction with receipt URL and notes (but don't complete yet)
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          receipt_url: publicUrl,
          payment_notes: paymentNotes[transactionId] || '',
          processed_by: (await supabase.auth.getUser()).data.user?.id,
          processed_at: new Date().toISOString()
          // Status remains 'approved' until explicitly completed
        })
        .eq('id', transactionId);

      if (updateError) {
        throw updateError;
      }

      // Clear payment notes for this transaction
      setPaymentNotes(prev => ({ ...prev, [transactionId]: '' }));

      refetch(); // Refresh the transactions list
      alert('Receipt uploaded successfully! You can now complete the payment.');
    } catch (err) {
      console.error('Error uploading receipt:', err);
      alert('Failed to upload receipt. Please try again.');
    } finally {
      setUploadingReceipt(null);
    }
  };

  const handleCompletePayment = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('id', transactionId);

      if (error) {
        throw error;
      }

      refetch(); // Refresh the transactions list
      alert('Payment marked as completed successfully!');
    } catch (err) {
      console.error('Error completing payment:', err);
      alert('Failed to complete payment. Please try again.');
    }
  };

  // Filter transactions by type and status for finance processing
  const approvedWithdrawals = filteredTransactions.filter(t =>
    t.transaction_type === 'withdrawal' && t.status === 'approved'
  );
  const completedPayments = filteredTransactions.filter(t => 
    ((t.transaction_type === 'payment' || t.transaction_type === 'withdrawal') && t.status === 'completed')
  );
  const completedRefunds = filteredTransactions.filter(t => 
    t.transaction_type === 'refund' && t.status === 'completed'
  );
  const rejectedWithdrawals = filteredTransactions.filter(t =>
    t.transaction_type === 'withdrawal' && t.status === 'rejected'
  );

  const getCurrentTransactions = () => {
    switch (activeTab) {
      case 'withdrawals':
        return approvedWithdrawals;
      case 'payments':
        return completedPayments;
      case 'refunds':
        return completedRefunds;
      case 'rejected':
        return rejectedWithdrawals;
      default:
        return approvedWithdrawals;
    }
  };

  const currentTransactions = getCurrentTransactions();

  // Calculate comprehensive business insights
  const totalRevenue = filteredTransactions
    .filter(t => t.transaction_type === 'payment' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalWithdrawals = filteredTransactions
    .filter(t => t.transaction_type === 'withdrawal' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalRefunds = filteredTransactions
    .filter(t => t.transaction_type === 'refund' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const pendingWithdrawals = transactions.filter(t =>
    t.transaction_type === 'withdrawal' && t.status === 'pending'
  );

  const failedTransactions = transactions.filter(t => t.status === 'failed');

  // Monthly trends (last 6 months)
  const currentDate = new Date();
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthName = format(date, 'MMM yyyy');
    const monthTransactions = filteredTransactions.filter(t => {
      const transactionDate = new Date(t.created_at);
      return transactionDate.getMonth() === date.getMonth() &&
             transactionDate.getFullYear() === date.getFullYear() &&
             t.status === 'completed';
    });
    const revenue = monthTransactions
      .filter(t => t.transaction_type === 'payment')
      .reduce((sum, t) => sum + t.amount, 0);
    const withdrawals = monthTransactions
      .filter(t => t.transaction_type === 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0);
    return { month: monthName, revenue, withdrawals, net: revenue - withdrawals };
  }).reverse();

  // Vendor performance
  const vendorStats = filteredTransactions.reduce((acc, t) => {
    if (!t.vendor_id) return acc;
    if (!acc[t.vendor_id]) {
      acc[t.vendor_id] = {
        vendorId: t.vendor_id,
        vendorName: t.vendors?.business_name || 'Unknown Vendor',
        totalRevenue: 0,
        totalWithdrawals: 0,
        pendingWithdrawals: 0,
        transactionCount: 0
      };
    }
    if (t.transaction_type === 'payment' && t.status === 'completed') {
      acc[t.vendor_id].totalRevenue += t.amount;
      acc[t.vendor_id].transactionCount += 1;
    }
    if (t.transaction_type === 'withdrawal') {
      if (t.status === 'completed') {
        acc[t.vendor_id].totalWithdrawals += t.amount;
      } else if (t.status === 'pending') {
        acc[t.vendor_id].pendingWithdrawals += t.amount;
      }
    }
    return acc;
  }, {} as Record<string, any>);

  const topVendors = Object.values(vendorStats)
    .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5);

  // Calculate stats
  const stats = {
    totalRevenue,
    totalWithdrawals,
    totalRefunds,
    netRevenue: totalRevenue - totalWithdrawals - totalRefunds,
    approvedWithdrawals: approvedWithdrawals.length,
    approvedAmount: approvedWithdrawals.reduce((sum, t) => sum + t.amount, 0),
    completedPayments: completedPayments.length,
    completedRefunds: completedRefunds.length,
    rejectedWithdrawals: rejectedWithdrawals.length,
    pendingWithdrawals: pendingWithdrawals.length,
    pendingAmount: pendingWithdrawals.reduce((sum, t) => sum + t.amount, 0),
    failedTransactions: failedTransactions.length,
    monthlyData,
    topVendors,
    totalTransactions: filteredTransactions.length,
    successRate: transactions.length > 0 ?
      ((transactions.filter(t => t.status === 'completed').length / transactions.length) * 100).toFixed(1) : '0'
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Approved
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Completed
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Rejected
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const getActionButtons = (transaction: any) => {
    // Approved withdrawals - show upload and complete options
    if (transaction.transaction_type === 'withdrawal' && transaction.status === 'approved') {
      return (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleReceiptUpload(transaction.id, file);
                }
              }}
              disabled={uploadingReceipt === transaction.id}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            />
            <span className="text-xs text-gray-500">Upload Receipt</span>
          </div>
          <textarea
            placeholder="Payment notes (optional)"
            value={paymentNotes[transaction.id] || ''}
            onChange={(e) => setPaymentNotes(prev => ({ ...prev, [transaction.id]: e.target.value }))}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1"
            rows={2}
          />
          <button
            onClick={() => handleCompletePayment(transaction.id)}
            disabled={uploadingReceipt === transaction.id || !transaction.receipt_url}
            className="w-full bg-green-600 text-white text-xs px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Complete Payment
          </button>
          {uploadingReceipt === transaction.id && (
            <div className="text-xs text-blue-600">Uploading...</div>
          )}
        </div>
      );
    }

    // Rejected withdrawals - show follow-up options
    if (transaction.transaction_type === 'withdrawal' && transaction.status === 'rejected') {
      return (
        <div className="space-y-2">
          <div className="text-xs text-red-600 font-medium">Rejected Withdrawal</div>
          {transaction.payment_notes && (
            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
              <strong>Rejection Notes:</strong><br />
              {transaction.payment_notes}
            </div>
          )}
          <button
            onClick={() => {
              // Could implement follow-up logic here
              alert('Follow-up functionality can be implemented here (e.g., contact vendor, resubmit request)');
            }}
            className="w-full bg-blue-600 text-white text-xs px-3 py-1 rounded hover:bg-blue-700"
          >
            Follow Up
          </button>
        </div>
      );
    }

    // Completed transactions - show receipt if available
    if (transaction.status === 'completed' && transaction.receipt_url) {
      return (
        <a
          href={transaction.receipt_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 text-xs underline"
        >
          View Receipt
        </a>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Finance Dashboard</h1>
        <div className="flex items-center space-x-4">
          {/* Date Range Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Period:</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="all">All Time</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
          </div>

          {/* Export Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={exportFinancialReport}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 flex items-center"
            >
              📊 Export Report
            </button>
            <button
              onClick={exportVendorReport}
              className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700 flex items-center"
            >
              🏪 Vendor Report
            </button>
            <button
              onClick={exportMonthlyTrends}
              className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm hover:bg-purple-700 flex items-center"
            >
              📈 Trends Report
            </button>
          </div>
        </div>
      </div>

      {/* Business Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">$</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrencyWithConversion(stats.totalRevenue, 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')}
                  </dd>
                  <dd className="text-xs text-green-600 mt-1">
                    +{stats.monthlyData[stats.monthlyData.length - 1]?.revenue ?
                      ((stats.monthlyData[stats.monthlyData.length - 1].revenue /
                        (stats.monthlyData[stats.monthlyData.length - 2]?.revenue || 1)) * 100 - 100).toFixed(1) : 0}% from last month
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">💰</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Net Revenue</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrencyWithConversion(stats.netRevenue, 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')}
                  </dd>
                  <dd className="text-xs text-gray-600 mt-1">
                    Revenue - Withdrawals - Refunds
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">⏳</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Withdrawals</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.pendingWithdrawals}</dd>
                  <dd className="text-xs text-gray-600 mt-1">
                    {formatCurrencyWithConversion(stats.pendingAmount, 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">📊</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Success Rate</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.successRate}%</dd>
                  <dd className="text-xs text-gray-600 mt-1">
                    {stats.totalTransactions} total transactions
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{stats.approvedWithdrawals}</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Ready for Payment</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.approvedWithdrawals}</dd>
                  <dd className="text-xs text-gray-600 mt-1">
                    {formatCurrencyWithConversion(stats.approvedAmount, 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{stats.rejectedWithdrawals}</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Rejected Withdrawals</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.rejectedWithdrawals}</dd>
                  <dd className="text-xs text-gray-600 mt-1">
                    Need follow-up
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{stats.failedTransactions}</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Failed Transactions</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.failedTransactions}</dd>
                  <dd className="text-xs text-gray-600 mt-1">
                    Require investigation
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Trends Chart */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Revenue Trends (Last 6 Months)</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {stats.monthlyData.map((month: any) => (
              <div key={month.month} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{month.month}</span>
                    <span className="text-sm text-gray-500">
                      Net: {formatCurrencyWithConversion(month.net, 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{
                        width: `${Math.max((month.revenue / Math.max(...stats.monthlyData.map((m: any) => m.revenue))) * 100, 5)}%`
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Revenue: {formatCurrencyWithConversion(month.revenue, 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')}</span>
                    <span>Withdrawals: {formatCurrencyWithConversion(month.withdrawals, 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Vendors */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Top Performing Vendors</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {stats.topVendors.slice(0, 5).map((vendor: any, index: number) => (
              <div key={vendor.vendorId} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">{index + 1}</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{vendor.vendorName}</div>
                    <div className="text-sm text-gray-500">
                      {vendor.transactionCount} transactions
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrencyWithConversion(vendor.totalRevenue, 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatCurrencyWithConversion(vendor.pendingWithdrawals, 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')} pending
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => setActiveTab('withdrawals')}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg">💰</span>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-900">Process Withdrawals</div>
                <div className="text-sm text-gray-500">{stats.approvedWithdrawals} pending</div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('rejected')}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg">📞</span>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-900">Follow Up Rejections</div>
                <div className="text-sm text-gray-500">{stats.rejectedWithdrawals} need attention</div>
              </div>
            </button>

            <button
              onClick={exportFinancialReport}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg">📊</span>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-900">Generate Report</div>
                <div className="text-sm text-gray-500">Export financial data</div>
              </div>
            </button>

            <button
              onClick={() => refetch()}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg">🔄</span>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-900">Refresh Data</div>
                <div className="text-sm text-gray-500">Update latest transactions</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('withdrawals')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'withdrawals'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Approved Withdrawals ({approvedWithdrawals.length})
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'payments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Completed Payments ({completedPayments.length})
            </button>
            <button
              onClick={() => setActiveTab('refunds')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'refunds'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Completed Refunds ({completedRefunds.length})
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'rejected'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Rejected Withdrawals ({stats.rejectedWithdrawals})
            </button>
          </nav>
        </div>

        <div className="p-6">
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
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{transaction.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.vendors?.business_name || 'Unknown Vendor'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrencyWithConversion(transaction.amount, transaction.currency, selectedCurrency || 'UGX', selectedLanguage || 'en-US')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {transaction.payment_method.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(transaction.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {transaction.reference}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {getActionButtons(transaction)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {currentTransactions.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No {activeTab} found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}