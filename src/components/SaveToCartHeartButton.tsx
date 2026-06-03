import { Heart } from 'lucide-react'
import { useServiceCartSave } from '../hooks/useServiceCartSave'
import type { Service } from '../types'

interface SaveToCartHeartButtonProps {
  service: Service
  ticketTypes?: unknown[]
  className?: string
  iconClassName?: string
}

export default function SaveToCartHeartButton({
  service,
  ticketTypes,
  className = 'absolute right-2.5 top-2.5 rounded-full border border-white/80 bg-white/95 p-2 shadow-sm transition-colors hover:bg-white',
  iconClassName,
}: SaveToCartHeartButtonProps) {
  const { isSaved, toggleSave } = useServiceCartSave(service, ticketTypes)

  const heartClassName = iconClassName
    ? `${iconClassName} transition-colors ${isSaved ? 'fill-red-500 text-red-500' : 'text-gray-700'}`
    : `h-4 w-4 transition-colors ${isSaved ? 'fill-red-500 text-red-500' : 'text-gray-700'}`

  return (
    <button
      type="button"
      onClick={toggleSave}
      className={className}
      aria-label={isSaved ? 'Remove from cart' : 'Save to cart'}
      aria-pressed={isSaved}
    >
      <Heart className={heartClassName} />
    </button>
  )
}
