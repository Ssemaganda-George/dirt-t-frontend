import { format } from 'date-fns';
import { useAdminTransactions } from '../../hooks/hook';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { formatCurrency } from '../../lib/utils';
import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export function Finance() {
  const { transactions, loading, error, refetch } = useAdminTransactions();
  const [activeTab, setActiveTab] = useState<'withdrawals' | 'payments' | 'refunds'>('withdrawals');
  const [uploadingReceipt, setUploadingReceipt] = useState<string | null>(null);
  const [paymentNotes, setPaymentNotes] = useState<{[key: string]: string}>({});

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
      const filePath = `receipts/${fileName}`;

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

      // Update transaction with receipt URL and notes
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          receipt_url: publicUrl,
          payment_notes: paymentNotes[transactionId] || '',
          processed_by: (await supabase.auth.getUser()).data.user?.id,
          processed_at: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id', transactionId);

      if (updateError) {
        throw updateError;
      }

      // Clear payment notes for this transaction
      setPaymentNotes(prev => ({ ...prev, [transactionId]: '' }));

      refetch(); // Refresh the transactions list
      alert('Receipt uploaded and payment confirmed successfully!');
    } catch (err) {
      console.error('Error uploading receipt:', err);
      alert('Failed to upload receipt. Please try again.');
    } finally {
      setUploadingReceipt(null);
    }
  };

  // Filter transactions by type and status for finance processing
  const approvedWithdrawals = transactions.filter(t => 
    t.transaction_type === 'withdrawal' && t.status === 'approved'
  );
  const completedPayments = transactions.filter(t => 
    t.transaction_type === 'payment' && t.status === 'completed'
  );
  const completedRefunds = transactions.filter(t => 
    t.transaction_type === 'refund' && t.status === 'completed'
  );

  const getCurrentTransactions = () => {
    switch (activeTab) {
      case 'withdrawals':
        return approvedWithdrawals;
      case 'payments':
        return completedPayments;
      case 'refunds':
        return completedRefunds;
      default:
        return approvedWithdrawals;
    }
  };

  const currentTransactions = getCurrentTransactions();

  // Calculate stats
  const stats = {
    approvedWithdrawals: approvedWithdrawals.length,
    approvedAmount: approvedWithdrawals.reduce((sum, t) => sum + t.amount, 0),
    completedPayments: completedPayments.length,
    completedRefunds: completedRefunds.length,
  };

  const getActionButtons = (transaction: any) => {
    // Only approved withdrawals should appear in Finance page
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
          {uploadingReceipt === transaction.id && (
            <div className="text-xs text-blue-600">Uploading...</div>
          )}
        </div>
      );
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
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{stats.approvedWithdrawals}</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Approved for Payment</dt>
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
                  <span className="text-white text-sm font-medium">$</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Payment Amount</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(stats.approvedAmount, 'UGX')}
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
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Approved
                      </span>
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