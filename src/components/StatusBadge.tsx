import { cn } from '../lib/utils';

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'small';
}

const statusConfig = {
  pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
  approved: { color: 'bg-green-100 text-green-800', label: 'Approved' },
  rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
  confirmed: { color: 'bg-blue-100 text-blue-800', label: 'Confirmed' },
  cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Cancelled' },
  completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
  paid: { color: 'bg-green-100 text-green-800', label: 'Paid' },
  refunded: { color: 'bg-orange-100 text-orange-800', label: 'Refunded' },
  failed: { color: 'bg-red-100 text-red-800', label: 'Failed' },
  available: { color: 'bg-green-100 text-green-800', label: 'Available' },
  unavailable: { color: 'bg-gray-100 text-gray-800', label: 'Unavailable' },
};

export function StatusBadge({ status, variant = 'default' }: StatusBadgeProps) {
  const config = statusConfig[status as keyof typeof statusConfig] || {
    color: 'bg-gray-100 text-gray-800',
    label: status,
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        config.color,
        variant === 'small' ? 'px-2 py-1 text-xs' : 'px-2.5 py-0.5 text-sm'
      )}
    >
      {config.label}
    </span>
  );
}