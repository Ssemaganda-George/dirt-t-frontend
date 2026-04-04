import { format } from 'date-fns';
import { useTransactions } from '../../hooks/hook';
import { useState } from 'react';
import type { Transaction } from '../../lib/database';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { formatCurrency } from '../../lib/utils';
import { updateTransactionStatus } from '../../lib/database';

export function Transactions() {
  const { transactions, loading, error, refetch } = useTransactions();

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
        <p className="text-red-800">Error loading transactions: {error}</p>
      </div>
    );
  }

  const handleTransactionStatusUpdate = async (transactionId: string, status: 'completed' | 'failed') => {
    try {
      await updateTransactionStatus(transactionId, status);
      refetch(); // Refresh the transactions list
    } catch (err) {
      console.error('Error updating transaction status:', err);
      alert('Failed to update transaction status. Please try again.');
    }
  };

  const stats = {
    total: transactions.length,
    totalAmount: transactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0),
    payments: transactions.filter(t => t.transaction_type === 'payment').length,
    withdrawals: transactions.filter(t => t.transaction_type === 'withdrawal').length,
    refunds: transactions.filter(t => t.transaction_type === 'refund').length,
  };

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Transaction Management</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor platform-wide financial activity</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-emerald-500 p-4 hover:shadow-sm transition-all">
          <p className="text-xs font-medium text-gray-500">Total Volume</p>
          <p className="text-lg font-semibold text-gray-900 mt-2">
            {formatCurrency(stats.totalAmount, 'UGX')}
          </p>
          <p className="text-xs text-gray-400 mt-1">Completed</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-blue-500 p-4 hover:shadow-sm transition-all">
          <p className="text-xs font-medium text-gray-500">Payments</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.payments}</p>
          <p className="text-xs text-gray-400 mt-1">Received</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-violet-500 p-4 hover:shadow-sm transition-all">
          <p className="text-xs font-medium text-gray-500">Withdrawals</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.withdrawals}</p>
          <p className="text-xs text-gray-400 mt-1">Processed</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-amber-500 p-4 hover:shadow-sm transition-all">
          <p className="text-xs font-medium text-gray-500">Refunds</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.refunds}</p>
          <p className="text-xs text-gray-400 mt-1">Issued</p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Recent Transactions</h3>
          <p className="text-xs text-gray-500 mt-0.5">All platform financial activity</p>
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
                    Type
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
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{transaction.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        transaction.transaction_type === 'payment' 
                          ? 'bg-green-100 text-green-800'
                          : transaction.transaction_type === 'withdrawal'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {transaction.transaction_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      <button
                        onClick={() => setSelectedTransaction(transaction)}
                        className="text-blue-600 hover:underline"
                        title="View payment details"
                      >
                        {transaction.payment_method.replace('_', ' ')}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={transaction.status} variant="small" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {transaction.reference}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {transaction.transaction_type === 'withdrawal' && transaction.status === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleTransactionStatusUpdate(transaction.id, 'completed')}
                            className="text-green-600 hover:text-green-900 text-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleTransactionStatusUpdate(transaction.id, 'failed')}
                            className="text-red-600 hover:text-red-900 text-sm"
                          >
                            Reject
                          </button>
                        </div>
                      )}
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
                  <div className="mt-4 space-y-3">
                    {selectedTransaction.payout_meta ? (
                      selectedTransaction.payout_meta.type === 'bank' ? (
                        <div>
                          <div className="text-sm font-medium">{selectedTransaction.payout_meta.name || selectedTransaction.payout_meta.account_name}</div>
                          <div className="text-sm text-gray-600">Account: <span className="font-mono">{selectedTransaction.payout_meta.account_number}</span></div>
                          <div className="text-sm text-gray-600">Branch: {selectedTransaction.payout_meta.branch || '—'}</div>
                          <div className="mt-3">
                            <button
                              onClick={() => navigator.clipboard.writeText(selectedTransaction.payout_meta.account_number || '')}
                              className="px-3 py-1 bg-gray-100 rounded text-sm"
                            >Copy account number</button>
                          </div>
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
                          <div className="mt-3">
                            <button
                              onClick={() => navigator.clipboard.writeText(((selectedTransaction.payout_meta.country_code || '') + (selectedTransaction.payout_meta.phone || '')).trim())}
                              className="px-3 py-1 bg-gray-100 rounded text-sm"
                            >Copy phone number</button>
                          </div>
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
          
          {transactions.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No transactions found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}