import { format } from 'date-fns';
import { useAdminTransactions } from '../../hooks/hook';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { formatCurrency } from '../../lib/utils';
import { updateTransactionStatus } from '../../lib/database';
import { useState } from 'react';

export function Finance() {
  const { transactions, loading, error, refetch } = useAdminTransactions();
  const [activeTab, setActiveTab] = useState<'withdrawals' | 'payments' | 'refunds'>('withdrawals');

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

  const handleTransactionStatusUpdate = async (transactionId: string, status: 'approved' | 'completed' | 'failed') => {
    try {
      await updateTransactionStatus(transactionId, status);
      refetch(); // Refresh the transactions list
    } catch (err) {
      console.error('Error updating transaction status:', err);
      alert('Failed to update transaction status. Please try again.');
    }
  };

  // Filter transactions by type and tab
  const withdrawals = transactions.filter(t => t.transaction_type === 'withdrawal');
  const payments = transactions.filter(t => t.transaction_type === 'payment');
  const refunds = transactions.filter(t => t.transaction_type === 'refund');

  const getCurrentTransactions = () => {
    switch (activeTab) {
      case 'withdrawals':
        return withdrawals;
      case 'payments':
        return payments;
      case 'refunds':
        return refunds;
      default:
        return withdrawals;
    }
  };

  const currentTransactions = getCurrentTransactions();

  // Calculate stats
  const stats = {
    pendingWithdrawals: withdrawals.filter(t => t.status === 'pending').length,
    approvedWithdrawals: withdrawals.filter(t => t.status === 'approved').length,
    completedWithdrawals: withdrawals.filter(t => t.status === 'completed').length,
    totalPayments: payments.length,
    completedPayments: payments.filter(t => t.status === 'completed').length,
    totalRefunds: refunds.length,
    completedRefunds: refunds.filter(t => t.status === 'completed').length,
  };

  const getStatusBadgeVariant = (status: string) => {
    return 'default'; // StatusBadge only accepts 'default' or 'small'
  };

  const getActionButtons = (transaction: any) => {
    if (transaction.transaction_type === 'withdrawal') {
      if (transaction.status === 'pending') {
        return (
          <button
            onClick={() => handleTransactionStatusUpdate(transaction.id, 'approved')}
            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
          >
            Approve
          </button>
        );
      } else if (transaction.status === 'approved') {
        return (
          <div className="flex space-x-2">
            <button
              onClick={() => handleTransactionStatusUpdate(transaction.id, 'completed')}
              className="text-green-600 hover:text-green-900 text-sm"
            >
              Mark Paid
            </button>
            <button
              onClick={() => handleTransactionStatusUpdate(transaction.id, 'failed')}
              className="text-red-600 hover:text-red-900 text-sm"
            >
              Reject
            </button>
          </div>
        );
      }
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Finance Management</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{stats.pendingWithdrawals}</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Withdrawals</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.pendingWithdrawals}</dd>
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
                  <span className="text-white text-sm font-medium">{stats.approvedWithdrawals}</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Approved Withdrawals</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.approvedWithdrawals}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{stats.completedPayments}</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed Payments</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.completedPayments}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{stats.completedRefunds}</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed Refunds</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.completedRefunds}</dd>
                </dl>
              </div>
            </div>
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
              Withdrawals ({withdrawals.length})
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'payments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Payments ({payments.length})
            </button>
            <button
              onClick={() => setActiveTab('refunds')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'refunds'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Refunds ({refunds.length})
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
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {transaction.payment_method.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={transaction.status} variant={getStatusBadgeVariant(transaction.status)} />
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