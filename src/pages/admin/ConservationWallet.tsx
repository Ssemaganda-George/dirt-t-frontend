import { format } from 'date-fns';
import { useState } from 'react';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useAdminTransactions } from '../../hooks/hook';
import { formatCurrencyWithConversion } from '../../lib/utils';
import { usePreferences } from '../../contexts/PreferencesContext';

export default function ConservationWallet() {
  const { transactions, loading, error } = useAdminTransactions();
  const { selectedCurrency, selectedLanguage } = usePreferences();
  const [dateRange, setDateRange] = useState<'all' | 'month' | 'quarter' | 'year'>('all');
  const [query, setQuery] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all')

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

  const filtered = getFilteredTransactions();

  const isConservationTx = (t: any) => {
    const ref = (t.reference || '') as string;
    const notes = (t.payment_notes || '') as string;
    return /otx-|offset|conservation|carbon/i.test(ref) || /conservation|offset|carbon|otx-/i.test(notes);
  };

  const conservationTx = filtered.filter(isConservationTx);
  const conservationBalance = conservationTx.reduce((sum, t) => sum + t.amount, 0);

  const matchesQuery = (t: any) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const fields = [t.id, t.name, t.reference, t.payment_notes, (t.tourists?.full_name || '' )];
    return fields.some((f: any) => (String(f || '')).toLowerCase().includes(q));
  }

  const matchesStatus = (t: any) => {
    if (!statusFilter || statusFilter === 'all') return true;
    return String(t.status) === statusFilter;
  }

  const filteredList = conservationTx.filter(t => matchesQuery(t) && matchesStatus(t));

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

  const exportConservation = (list?: any[]) => {
    const source = list || filteredList || conservationTx
    const data = source.map(t => ({
      id: t.id,
      amount: t.amount,
      currency: t.currency,
      status: t.status,
      reference: t.reference,
      notes: t.payment_notes || '',
      created_at: format(new Date(t.created_at), 'yyyy-MM-dd HH:mm:ss')
    }));

    if (data.length === 0) {
      alert('No conservation transactions in the selected range.');
      return;
    }

    exportToCSV(data, `conservation-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  if (loading) return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg"/></div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4"><p className="text-red-800">Error loading transactions: {String(error)}</p></div>;

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Conservation Wallet</h1>
          <p className="mt-2 text-sm text-gray-600">View and export funds tagged for conservation and carbon offsets</p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ID, donor, reference, comments"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-56"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
            <option value="failed">Failed</option>
          </select>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value as any)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="all">All Time</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button onClick={() => exportConservation(filteredList)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm">Export</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-medium text-gray-500">Conservation Balance</p>
        <p className="text-2xl font-semibold text-gray-900 mt-2">{formatCurrencyWithConversion(conservationBalance, 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')}</p>
        <p className="text-xs text-gray-400 mt-1">Funds tagged for carbon offsets and tree planting</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Conservation Transactions ({filteredList.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Donor</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Comments</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredList.map((t: any) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 text-sm text-gray-700">{t.id.slice(0,8)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{t.name || t.tourists?.full_name || t.tourists?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatCurrencyWithConversion(t.amount, t.currency || 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{t.status}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{t.reference || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{t.payment_notes || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{format(new Date(t.created_at), 'yyyy-MM-dd')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
