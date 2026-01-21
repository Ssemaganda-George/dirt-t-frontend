import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'red' | 'indigo' | 'teal' | 'orange'
  trend?: string
  trendDirection?: 'up' | 'down' | 'neutral'
  subtitle?: string
  className?: string
  onClick?: () => void
  isWalletCard?: boolean
  actions?: React.ReactNode
}

const colorVariants = {
  blue: {
    bg: 'bg-blue-600',
    border: 'border-blue-700',
    icon: 'text-white',
    trend: 'text-white'
  },
  green: {
    bg: 'bg-green-600',
    border: 'border-green-700',
    icon: 'text-white',
    trend: 'text-white'
  },
  yellow: {
    bg: 'bg-yellow-600',
    border: 'border-yellow-700',
    icon: 'text-white',
    trend: 'text-white'
  },
  purple: {
    bg: 'bg-purple-600',
    border: 'border-purple-700',
    icon: 'text-white',
    trend: 'text-white'
  },
  red: {
    bg: 'bg-red-600',
    border: 'border-red-700',
    icon: 'text-white',
    trend: 'text-white'
  },
  indigo: {
    bg: 'bg-indigo-600',
    border: 'border-indigo-700',
    icon: 'text-white',
    trend: 'text-white'
  },
  teal: {
    bg: 'bg-teal-600',
    border: 'border-teal-700',
    icon: 'text-white',
    trend: 'text-white'
  },
  orange: {
    bg: 'bg-orange-600',
    border: 'border-orange-700',
    icon: 'text-white',
    trend: 'text-white'
  }
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  color,
  trend,
  trendDirection = 'neutral',
  subtitle,
  className = '',
  onClick,
  isWalletCard = false,
  actions
}: StatCardProps) {
  const colors = colorVariants[color]

  const getTrendIcon = () => {
    switch (trendDirection) {
      case 'up':
        return '↗'
      case 'down':
        return '↘'
      default:
        return '→'
    }
  }

  return (
    <div 
      className={`relative overflow-hidden border ${colors.bg} ${colors.border} p-6 shadow-sm hover:shadow-md transition-all duration-300 ${onClick ? 'cursor-pointer hover:scale-105' : ''} ${isWalletCard ? 'bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 border-emerald-600 shadow-lg hover:shadow-xl' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="relative">
        {/* Icon and Title */}
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 ${isWalletCard ? 'bg-white bg-opacity-20 backdrop-blur-sm' : 'bg-white bg-opacity-20'} rounded-lg`}>
            <Icon className={`h-6 w-6 ${isWalletCard ? 'text-white' : colors.icon}`} />
          </div>
          {trend && (
            <div className={`flex items-center text-sm font-medium ${colors.trend}`}>
              <span className="mr-1">{getTrendIcon()}</span>
              {trend}
            </div>
          )}
        </div>

        {/* Value */}
        <div className="mb-2">
          <div className={`text-3xl font-bold mb-1 ${isWalletCard ? 'text-white' : 'text-white'}`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          <div className={`text-sm font-medium ${isWalletCard ? 'text-white' : 'text-white'}`}>
            {title}
          </div>
        </div>

        {/* Subtitle */}
        {subtitle && (
          <div className={`text-xs mt-2 ${isWalletCard ? 'text-emerald-100' : 'text-gray-200'}`}>
            {subtitle}
          </div>
        )}

        {/* Actions */}
        {actions && (
          <div className="mt-4 pt-3 border-t border-white border-opacity-20">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}