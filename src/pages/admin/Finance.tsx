import { format } from 'date-fns';
import { useAdminTransactions } from '../../hooks/hook';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { formatCurrencyWithConversion } from '../../lib/utils';
import { useState } from 'react';
import { usePreferences } from '../../contexts/PreferencesContext'
import type { Transaction } from '../../lib/database';
import { supabase } from '../../lib/supabaseClient';

export function Finance() {
  const { transactions, loading, error, refetch } = useAdminTransactions();
  const { selectedCurrency, selectedLanguage } = usePreferences()
  const [activeTab, setActiveTab] = useState<'withdrawals' | 'payments' | 'refunds' | 'rejected'>('withdrawals');
  const [uploadingReceipt, setUploadingReceipt] = useState<string | null>(null);
  const [paymentNotes, setPaymentNotes] = useState<{[key: string]: string}>({});
  const [dateRange, setDateRange] = useState<'all' | 'month' | 'quarter' | 'year'>('all');

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

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
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-sm text-red-700">Error loading finance data: {error}</p>
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
    const styles: Record<string, string> = {
      approved: 'bg-blue-50 text-blue-700',
      completed: 'bg-emerald-50 text-emerald-700',
      rejected: 'bg-red-50 text-red-700',
      pending: 'bg-amber-50 text-amber-700',
      failed: 'bg-gray-100 text-gray-600',
    };
    const cls = styles[status] || 'bg-gray-100 text-gray-600';
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
        {status}
      </span>
    );
  };

  const getActionButtons = (transaction: any) => {
    // Approved withdrawals - show upload and complete options
    if (transaction.transaction_type === 'withdrawal' && transaction.status === 'approved') {
      return (
        <div className="flex items-center gap-2 min-w-[220px]">
          <label className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
            transaction.receipt_url 
              ? 'border border-gray-200 text-gray-600 hover:bg-gray-50' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}>
            📎 {transaction.receipt_url ? 'Replace' : 'Upload Receipt'}
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
              className="hidden"
            />
          </label>
          {transaction.receipt_url && (
            <a href={transaction.receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap">
              View
            </a>
          )}
          <button
            onClick={() => handleCompletePayment(transaction.id)}
            disabled={uploadingReceipt === transaction.id || !transaction.receipt_url}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {uploadingReceipt === transaction.id ? 'Uploading…' : '✓ Complete'}
          </button>
        </div>
      );
    }

    // Rejected withdrawals - show follow-up options
    if (transaction.transaction_type === 'withdrawal' && transaction.status === 'rejected') {
      return (
        <div className="space-y-2 min-w-[180px]">
          {transaction.payment_notes && (
            <div className="text-xs text-gray-600 bg-red-50 border border-red-100 p-2 rounded-lg">
              <span className="font-medium text-red-700">Rejection note:</span><br />
              {transaction.payment_notes}
            </div>
          )}
          <button
            onClick={() => {
              alert('Follow-up functionality can be implemented here (e.g., contact service provider, resubmit request)');
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
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
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
        >
          View Receipt
        </a>
      );
    }

    return <span className="text-xs text-gray-400">—</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Finance Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Platform revenue and withdrawal management</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Time</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button
            onClick={exportFinancialReport}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            📊 Export Report
          </button>
          <button
            onClick={exportVendorReport}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            👥 Vendor Report
          </button>
          <button
            onClick={exportMonthlyTrends}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            📈 Trends
          </button>
        </div>
      </div>

      {/* Business Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-emerald-500 p-4 hover:shadow-sm transition-all">
          <p className="text-xs font-medium text-gray-500">Total Revenue</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">
            {formatCurrencyWithConversion(stats.totalRevenue, 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')}
          </p>
          <p className="text-xs text-emerald-600 mt-1">
            +{stats.monthlyData[stats.monthlyData.length - 1]?.revenue ?
              ((stats.monthlyData[stats.monthlyData.length - 1].revenue /
                (stats.monthlyData[stats.monthlyData.length - 2]?.revenue || 1)) * 100 - 100).toFixed(1) : 0}% from last month
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-blue-500 p-4 hover:shadow-sm transition-all">
          <p className="text-xs font-medium text-gray-500">Net Revenue</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">
            {formatCurrencyWithConversion(stats.netRevenue, 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')}
          </p>
          <p className="text-xs text-gray-400 mt-1">After withdrawals & refunds</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-amber-500 p-4 hover:shadow-sm transition-all">
          <p className="text-xs font-medium text-gray-500">Pending Withdrawals</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.pendingWithdrawals}</p>
          <p className="text-xs text-gray-400 mt-1">
            {formatCurrencyWithConversion(stats.pendingAmount, 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-violet-500 p-4 hover:shadow-sm transition-all">
          <p className="text-xs font-medium text-gray-500">Success Rate</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.successRate}%</p>
          <p className="text-xs text-gray-400 mt-1">{stats.totalTransactions} transactions</p>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-blue-500 p-4 hover:shadow-sm transition-all">
          <p className="text-xs font-medium text-gray-500">Ready for Payment</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.approvedWithdrawals}</p>
          <p className="text-xs text-gray-400 mt-1">
            {formatCurrencyWithConversion(stats.approvedAmount, 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-red-500 p-4 hover:shadow-sm transition-all">
          <p className="text-xs font-medium text-gray-500">Rejected Withdrawals</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.rejectedWithdrawals}</p>
          <p className="text-xs text-gray-400 mt-1">Need follow-up</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-red-500 p-4 hover:shadow-sm transition-all">
          <p className="text-xs font-medium text-gray-500">Failed Transactions</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.failedTransactions}</p>
          <p className="text-xs text-gray-400 mt-1">Require investigation</p>
        </div>
      </div>

      {/* Monthly Trends Chart */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Revenue Trends</h3>
          <p className="text-xs text-gray-500 mt-0.5">Last 6 months performance overview</p>
        </div>
        <div className="p-5">
          <div className="space-y-3">
            {stats.monthlyData.map((month: any) => (
              <div key={month.month} className="group">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-gray-900">{month.month}</span>
                  <span className="text-xs font-medium text-gray-600">
                    Net: {formatCurrencyWithConversion(month.net, 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.max((month.revenue / Math.max(...stats.monthlyData.map((m: any) => m.revenue), 1)) * 100, 3)}%`
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>Revenue: {formatCurrencyWithConversion(month.revenue, 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')}</span>
                  <span>Withdrawals: {formatCurrencyWithConversion(month.withdrawals, 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Vendors */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Top Performing Vendors</h3>
          <p className="text-xs text-gray-500 mt-0.5">Ranked by total revenue</p>
        </div>
        <div className="p-5">
          <div className="space-y-3">
            {stats.topVendors.slice(0, 5).map((vendor: any, index: number) => (
              <div key={vendor.vendorId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{vendor.vendorName}</div>
                    <div className="text-xs text-gray-500">
                      {vendor.transactionCount} transactions
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {formatCurrencyWithConversion(vendor.totalRevenue, 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatCurrencyWithConversion(vendor.pendingWithdrawals, 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')} pending
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              onClick={() => setActiveTab('withdrawals')}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-sm transition-all text-left"
            >
              <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-sm">💰</div>
              <div>
                <div className="text-sm font-medium text-gray-900">Process Withdrawals</div>
                <div className="text-xs text-gray-500">{stats.approvedWithdrawals} pending</div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('rejected')}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-sm transition-all text-left"
            >
              <div className="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center text-sm">📞</div>
              <div>
                <div className="text-sm font-medium text-gray-900">Follow Up Rejections</div>
                <div className="text-xs text-gray-500">{stats.rejectedWithdrawals} need attention</div>
              </div>
            </button>

            <button
              onClick={exportFinancialReport}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-sm transition-all text-left"
            >
              <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-sm">📊</div>
              <div>
                <div className="text-sm font-medium text-gray-900">Generate Report</div>
                <div className="text-xs text-gray-500">Export financial data</div>
              </div>
            </button>

            <button
              onClick={() => refetch()}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-sm transition-all text-left"
            >
              <div className="w-8 h-8 bg-violet-50 text-violet-600 rounded-lg flex items-center justify-center text-sm">🔄</div>
              <div>
                <div className="text-sm font-medium text-gray-900">Refresh Data</div>
                <div className="text-xs text-gray-500">Update latest transactions</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs + Transaction Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Transactions</h3>
            <p className="text-xs text-gray-500 mt-0.5">{currentTransactions.length} records</p>
          </div>
          <div className="inline-flex gap-1 bg-gray-50 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('withdrawals')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === 'withdrawals'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Withdrawals ({approvedWithdrawals.length})
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === 'payments'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Payments ({completedPayments.length})
            </button>
            <button
              onClick={() => setActiveTab('refunds')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === 'refunds'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Refunds ({completedRefunds.length})
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === 'rejected'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Rejected ({stats.rejectedWithdrawals})
            </button>
          </div>
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
                      <button onClick={() => setSelectedTransaction(transaction)} className="text-blue-600 hover:underline">{transaction.payment_method.replace('_', ' ')}</button>
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

          {/* Payment details modal */}
          {selectedTransaction && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
              <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setSelectedTransaction(null)} />
              <div className="relative bg-white shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col rounded-2xl">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold">Payment Details</h2>
                  <button onClick={() => setSelectedTransaction(null)} className="text-gray-500 hover:text-black">Close</button>
                </div>
                <div className="p-6 overflow-y-auto">
                  <p className="text-sm text-gray-600">Method: <span className="font-medium">{selectedTransaction.payment_method.replace('_', ' ')}</span></p>
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
                          {selectedTransaction.payout_meta.name && (
                            <div className="text-sm text-gray-700">Account name: <span className="font-medium">{selectedTransaction.payout_meta.name}</span>
                              <button className="ml-3 text-gray-500" onClick={() => navigator.clipboard.writeText(selectedTransaction.payout_meta.name || '')}>Copy</button>
                            </div>
                          )}
                          <div className="text-sm text-gray-600">Phone: <span className="font-mono">{(selectedTransaction.payout_meta.country_code || '') + ' ' + (selectedTransaction.payout_meta.phone || '')}</span></div>
                          <div className="mt-3"><button onClick={() => navigator.clipboard.writeText(((selectedTransaction.payout_meta.country_code || '') + (selectedTransaction.payout_meta.phone || '')).trim())} className="px-3 py-1 bg-gray-100 rounded text-sm">Copy phone number</button></div>
                        </div>
                      )
                    ) : (
                      <div className="text-sm text-gray-500">No payout details available for this transaction.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentTransactions.length === 0 && (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-lg">📋</span>
              </div>
              <p className="text-sm font-medium text-gray-900">No {activeTab} found</p>
              <p className="text-xs text-gray-500 mt-1">Try adjusting your date range or filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}