import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  ShoppingBag,
  Trash2,
  Users,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useCart, type CartItem } from '../contexts/CartContext'
import {
  buildBookingStateFromCartItem,
  buildShopPurchaseStateFromCart,
  getCartBookingPath,
  usesInlineBookingDrawer,
  mapCategoryToBookingFlow,
} from '../lib/bookingFlow'
import { formatCurrencyWithConversion } from '../lib/utils'
import { usePreferences } from '../contexts/PreferencesContext'

function formatCartDates(item: CartItem): string {
  const { bookingData, category } = item
  const cat = category.toLowerCase()

  if (['hotels', 'hotel', 'accommodation'].includes(cat)) {
    if (bookingData.checkInDate && bookingData.checkOutDate) {
      return `${bookingData.checkInDate} → ${bookingData.checkOutDate}`
    }
  }
  if (cat === 'transport') {
    if (bookingData.startDate && bookingData.endDate) {
      return `${bookingData.startDate} → ${bookingData.endDate}`
    }
  }
  if (bookingData.date) return bookingData.date
  return 'Dates not set'
}

function getCartBackLink(isLoggedIn: boolean, role?: string | null): { to: string; label: string } {
  if (!isLoggedIn) return { to: '/', label: 'Back to home' }
  if (role === 'vendor') return { to: '/vendor', label: 'Back to vendor dashboard' }
  if (role === 'admin') return { to: '/admin', label: 'Back to admin' }
  // Cart lives in the public booking flow — home is the natural return point for tourists too
  return { to: '/', label: 'Back to home' }
}

export default function Saved() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { state, hydrated, removeFromCart, clearCart, getCartTotal } = useCart()
  const { selectedCurrency, selectedLanguage } = usePreferences()

  const items = state.items
  const cartTotal = getCartTotal()
  const backLink = getCartBackLink(Boolean(user), profile?.role)

  const handleContinueBooking = async (item: CartItem) => {
    const slug = item.service?.slug || item.serviceId
    const mappedCategory = mapCategoryToBookingFlow(item.category)

    if (mappedCategory === 'shops') {
      navigate(getCartBookingPath(slug, item.category), {
        state: buildShopPurchaseStateFromCart(item.bookingData),
      })
      return
    }

    if (usesInlineBookingDrawer(mappedCategory)) {
      navigate(`/service/${slug}`, {
        state: {
          openBookingDrawer: true,
          ...buildBookingStateFromCartItem(item.category, item.bookingData),
        },
      })
      return
    }

    const bookingState = buildBookingStateFromCartItem(item.category, item.bookingData)
    const path = getCartBookingPath(slug, item.category)

    // Preload booking shell so navigation doesn't hit a cold dynamic import
    await import('./BookingFlow').catch(() => undefined)
    navigate(path, { state: bookingState ?? undefined })
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-emerald-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <Link
            to={backLink.to}
            className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {backLink.label}
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Your cart</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            {user
              ? 'Saved bookings ready to complete — no login required to checkout as a guest.'
              : 'Continue as a guest — your selections are saved on this device.'}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="bg-white shadow-sm border border-gray-200 rounded-2xl p-12 text-center">
            <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h3>
            <p className="text-gray-600 mb-6">
              Browse stays, tours, and activities — tap the cart icon on any service to save it here.
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center min-h-[48px] bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors"
            >
              Explore services
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(item => {
              const imageUrl =
                item.service?.images?.[0] ||
                'https://images.unsplash.com/photo-1663498798455-8ce6d44d4505?auto=format&fit=crop&w=600&h=600&q=80'
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row">
                    <div className="sm:w-40 h-40 sm:h-auto flex-shrink-0 bg-gray-100">
                      <img
                        src={imageUrl}
                        alt={item.service?.title || 'Service'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex-1 p-4 sm:p-5 flex flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 line-clamp-2">
                            {item.service?.title || 'Service'}
                          </h3>
                          {item.service?.location && (
                            <p className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate">{item.service.location}</span>
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                          aria-label="Remove from cart"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatCartDates(item)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {item.bookingData.guests || 1} guest
                          {(item.bookingData.guests || 1) !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="mt-auto pt-4 flex items-center justify-between gap-3 flex-wrap">
                        <p className="text-lg font-bold text-gray-900">
                          {formatCurrencyWithConversion(
                            item.totalPrice,
                            item.currency,
                            selectedCurrency,
                            selectedLanguage
                          )}
                        </p>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/service/${item.service?.slug || item.serviceId}`}
                            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            View
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleContinueBooking(item)}
                            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                          >
                            Continue booking
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">Estimated total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrencyWithConversion(
                    cartTotal,
                    items[0]?.currency || 'UGX',
                    selectedCurrency,
                    selectedLanguage
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {items.length} item{items.length !== 1 ? 's' : ''} · final price confirmed at checkout
                </p>
              </div>
              <button
                type="button"
                onClick={clearCart}
                className="text-sm text-gray-500 hover:text-red-600 transition-colors self-start sm:self-auto"
              >
                Clear cart
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
