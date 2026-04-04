import { format } from 'date-fns';
import { useState, useMemo, useEffect } from 'react';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useAdminTransactions } from '../../hooks/hook';
import { formatCurrencyWithConversion } from '../../lib/utils';
import { usePreferences } from '../../contexts/PreferencesContext';
import { supabase } from '../../lib/supabaseClient';

function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function TouristWallets() {
  const { transactions, loading, error } = useAdminTransactions();
  const { selectedCurrency, selectedLanguage } = usePreferences();
  const [dateRange, setDateRange] = useState<'all' | 'month' | 'quarter' | 'year'>('all');
  const [profileById, setProfileById] = useState<Record<string, { full_name?: string | null; email?: string | null }>>({});

  const filtered = useMemo(() => {
    if (!transactions?.length) return [];
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
    return transactions.filter(t => new Date(t.created_at) >= startDate!);
  }, [transactions, dateRange]);

  const touristIds = useMemo(
    () => [...new Set(filtered.map((t: { tourist_id?: string | null }) => t.tourist_id).filter(Boolean))] as string[],
    [filtered]
  );

  useEffect(() => {
    if (touristIds.length === 0) {
      setProfileById({});
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error: qErr } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', touristIds);
      if (cancelled) return;
      if (qErr) {
        console.error('TouristWallets: profiles fetch failed', qErr);
        setProfileById({});
        return;
      }
      const map: Record<string, { full_name?: string | null; email?: string | null }> = {};
      for (const p of data || []) {
        if (p?.id) map[p.id] = { full_name: p.full_name, email: p.email };
      }
      setProfileById(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [touristIds.join(',')]);

  const tourists = useMemo(() => {
    const touristsMap: Record<
      string,
      { id: string; payments: number; withdrawals: number; refunds: number; count: number }
    > = {};
    for (const t of filtered as any[]) {
      if (!t.tourist_id) continue;
      if (!touristsMap[t.tourist_id]) {
        touristsMap[t.tourist_id] = {
          id: t.tourist_id,
          payments: 0,
          withdrawals: 0,
          refunds: 0,
          count: 0,
        };
      }
      const entry = touristsMap[t.tourist_id];
      entry.count += 1;
      const amt = num(t.amount);
      if (t.transaction_type === 'payment' && t.status === 'completed') entry.payments += amt;
      if (t.transaction_type === 'withdrawal' && t.status === 'completed') entry.withdrawals += amt;
      if (t.transaction_type === 'refund' && t.status === 'completed') entry.refunds += amt;
    }
    return Object.values(touristsMap)
      .map(x => ({
        ...x,
        balance: x.payments - x.withdrawals - x.refunds,
      }))
      .sort((a, b) => b.balance - a.balance);
  }, [filtered]);

  const displayName = (touristId: string) => {
    const p = profileById[touristId];
    const label = p?.full_name?.trim() || p?.email?.trim();
    return label || `User ${touristId.slice(0, 8)}…`;
  };

  const exportToCSV = (data: any[], filename: string) => {
    const headers = Object.keys(data[0] || {}).join(',');
    const rows = data.map(row =>
      Object.values(row)
        .map(value => (typeof value === 'string' && value.includes(',') ? `"${value}"` : value))
        .join(',')
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
      name: displayName(t.id),
      email: profileById[t.id]?.email || '',
      balance: t.balance,
      payments: t.payments,
      withdrawals: t.withdrawals,
      refunds: t.refunds,
      transactions: t.count,
    }));
    if (data.length === 0) {
      alert('No tourist wallets found for the selected range.');
      return;
    }
    exportToCSV(data, `tourist-wallets-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const fmt = (amount: number) =>
    formatCurrencyWithConversion(amount, 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US');

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  if (error)
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading transactions: {String(error)}</p>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tourist Wallets</h1>
          <p className="mt-2 text-sm text-gray-600">Per-tourist totals from completed transactions (derived)</p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value as typeof dateRange)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Time</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button onClick={exportTourists} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm">
            Export
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 max-w-3xl">
        <strong>Balance</strong> = sum of completed <strong>payments</strong> minus completed <strong>withdrawals</strong> and{' '}
        <strong>refunds</strong> in the selected period. Amounts are parsed as numbers so they stay accurate. Profile names load from{' '}
        <code className="text-gray-600">profiles</code> (<code className="text-gray-600">tourist_id</code> = profile id).
      </p>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Tourists ({tourists.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tourist</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Payments</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Withdrawals</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Refunds</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Txns</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {tourists.map(t => (
                <tr key={t.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div className="font-medium">{displayName(t.id)}</div>
                    <div className="text-xs text-gray-400 font-mono truncate max-w-xs" title={t.id}>
                      {t.id}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right tabular-nums font-medium">{fmt(t.balance)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right tabular-nums">{fmt(t.payments)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right tabular-nums">{fmt(t.withdrawals)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right tabular-nums">{fmt(t.refunds)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right tabular-nums">{t.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
