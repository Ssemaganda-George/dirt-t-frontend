import { format } from 'date-fns';
import { useState } from 'react';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useAdminTransactions } from '../../hooks/hook';
import { formatCurrencyWithConversion } from '../../lib/utils';
import { usePreferences } from '../../contexts/PreferencesContext';

export default function TouristWallets() {
  const { transactions, loading, error } = useAdminTransactions();
  const { selectedCurrency, selectedLanguage } = usePreferences();
  const [dateRange, setDateRange] = useState<'all' | 'month' | 'quarter' | 'year'>('all');

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

  const filtered = getFilteredTransactions() || [];

  // Group transactions by tourist_id
  const touristsMap: Record<string, any> = {};
  filtered.forEach((t: any) => {
    if (!t.tourist_id) return;
    if (!touristsMap[t.tourist_id]) {
      touristsMap[t.tourist_id] = { id: t.tourist_id, name: t.tourists?.full_name || t.tourists?.name || t.tourist_id, payments: 0, withdrawals: 0, refunds: 0, count: 0 };
    }
    const entry = touristsMap[t.tourist_id];
    entry.count += 1;
    if (t.transaction_type === 'payment' && t.status === 'completed') entry.payments += t.amount;
    if (t.transaction_type === 'withdrawal' && t.status === 'completed') entry.withdrawals += t.amount;
    if (t.transaction_type === 'refund' && t.status === 'completed') entry.refunds += t.amount;
  });

  const tourists = Object.values(touristsMap).map((x: any) => ({
    ...x,
    balance: x.payments - x.withdrawals - x.refunds
  })).sort((a: any, b: any) => b.balance - a.balance);

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

  const exportTourists = () => {
    const data = tourists.map(t => ({
      tourist_id: t.id,
      name: t.name,
      balance: t.balance,
      payments: t.payments,
      withdrawals: t.withdrawals,
      refunds: t.refunds,
      transactions: t.count
    }));
    if (data.length === 0) { alert('No tourist wallets found for the selected range.'); return; }
    exportToCSV(data, `tourist-wallets-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  if (loading) return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg"/></div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4"><p className="text-red-800">Error loading transactions: {String(error)}</p></div>;

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tourist Wallets</h1>
          <p className="mt-2 text-sm text-gray-600">Manage independent tourist savings and funds</p>
        </div>
        <div className="flex gap-2">
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value as any)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="all">All Time</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button onClick={exportTourists} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm">Export</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Tourists ({tourists.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tourist</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Payments</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Withdrawals</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Refunds</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Transactions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {tourists.map((t: any) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 text-sm text-gray-700">{t.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatCurrencyWithConversion(t.balance, 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatCurrencyWithConversion(t.payments, 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatCurrencyWithConversion(t.withdrawals, 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatCurrencyWithConversion(t.refunds, 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{t.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
