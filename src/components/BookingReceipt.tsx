import { CheckCircle } from 'lucide-react'
import { Booking } from '../types'
import { formatCurrencyWithConversion } from '../lib/utils'
import SimilarServicesCarousel from './SimilarServicesCarousel'

interface BookingReceiptProps {
  booking: Booking
  showActions?: boolean
  onClose?: () => void
}

export default function BookingReceipt({ booking, showActions = false, onClose }: BookingReceiptProps) {

  const formatCurrency = (amount: number, currency: string) => {
    return formatCurrencyWithConversion(amount, currency)
  }

  return (
    <div className="max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-auto">
      {/* Receipt Container - Receipt Paper Style */}
      <div className="bg-white border-2 border-gray-300 rounded-sm shadow-lg relative overflow-hidden"
           style={{backgroundImage: 'linear-gradient(90deg, transparent 49%, #e5e7eb 49%, #e5e7eb 51%, transparent 51%)', backgroundSize: '20px 100%'}}>

        {/* Receipt Header - Company Branding */}
        <div className="bg-gray-900 text-white text-center py-2 px-4 relative">
          <div className="absolute inset-0 opacity-10">
            <div className="w-full h-full bg-gradient-to-r from-transparent via-white to-transparent"></div>
          </div>
          <h1 className="text-lg font-bold tracking-wider relative z-10">DIRT TRAILS</h1>
          <p className="text-xs opacity-90 relative z-10">Adventure Booking Receipt</p>
        </div>

        {/* Receipt Body - Traditional Receipt Layout */}
        <div className="p-4 space-y-3 bg-white relative">
          {/* Receipt Number & Date */}
          <div className="text-center border-b-2 border-dotted border-gray-400 pb-2 mb-3">
            <div className="flex justify-between text-xs font-mono">
              <span>Receipt #: {booking.id?.slice(0, 8).toUpperCase() || 'N/A'}</span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
            <div className="text-center mt-1">
              <div className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <CheckCircle className="w-3 h-3" />
                <span className="text-xs font-medium">BOOKING CONFIRMED</span>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-2">
            <div className="text-center">
              <h4 className="font-bold text-gray-900 text-sm border-b border-gray-300 pb-1">CUSTOMER INFORMATION</h4>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">
                  {booking.is_guest_booking ? (booking.guest_name || 'Admin User') : (booking.tourist_profile?.full_name || 'Not available')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium text-right break-all">
                  {booking.is_guest_booking ? (booking.guest_email || 'ssemagandageorge480@gmail.com') : (booking.tourist_profile?.phone || 'Not available')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phone:</span>
                <span className="font-medium">
                  {booking.is_guest_booking ? (booking.guest_phone || '+256') : (booking.tourist_profile?.phone || 'Not available')}
                </span>
              </div>
            </div>
          </div>

          {/* Service Details - Receipt Style */}
          <div className="border-t border-b border-dotted border-gray-400 py-3 space-y-2">
            <div className="text-center">
              <h4 className="font-bold text-gray-900 text-sm">SERVICE DETAILS</h4>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Activity:</span>
                <span className="font-medium text-right">{booking.service?.title || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Location:</span>
                <span className="font-medium text-right">{booking.service?.location || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Category:</span>
                <span className="font-medium text-right">{booking.service?.service_categories?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium text-right">{booking.service_date ? new Date(booking.service_date).toLocaleDateString() : 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium text-right">{booking.service?.duration_hours || 0} hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Participants:</span>
                <span className="font-medium text-right">{booking.guests || 1}</span>
              </div>
            </div>
          </div>

          {/* Provider Information */}
          <div className="space-y-2">
            <div className="text-center">
              <h4 className="font-bold text-gray-900 text-sm border-b border-gray-300 pb-1">SERVICE PROVIDER</h4>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Provider:</span>
                <span className="font-medium text-right">{(booking.service as any)?.vendors?.business_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Contact:</span>
                <span className="font-medium text-right break-all">{(booking.service as any)?.vendors?.business_email || 'N/A'}</span>
              </div>
              {(booking.service as any)?.vendors?.business_address && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Address:</span>
                  <span className="font-medium text-right">{(booking.service as any).vendors.business_address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Price Breakdown - Receipt Style */}
          <div className="border-t-2 border-dotted border-gray-400 pt-3 space-y-2">
            <div className="text-center">
              <h4 className="font-bold text-gray-900 text-sm">PAYMENT SUMMARY</h4>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Unit Price:</span>
                <span className="font-medium">{booking.service ? formatCurrency(booking.service.price, booking.service.currency) : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Quantity:</span>
                <span className="font-medium">{booking.guests || 1}</span>
              </div>
              <div className="border-t border-dashed border-gray-400 pt-1 mt-2">
                <div className="flex justify-between font-bold text-sm">
                  <span>TOTAL:</span>
                  <span className="text-blue-600">{formatCurrency(booking.total_amount || 0, booking.currency || 'UGX')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Receipt Footer */}
          <div className="text-center pt-3 border-t border-dotted border-gray-400">
            <p className="text-xs text-gray-500 mb-1">Thank you for choosing Dirt Trails!</p>
            <p className="text-xs text-gray-400 font-mono">Booking Reference: {booking.id?.slice(0, 12).toUpperCase() || 'N/A'}</p>
            <p className="text-xs text-gray-400 mt-1">Keep this receipt for your records</p>
          </div>
        </div>

        {/* Perforated Edge Effect */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-white"
             style={{backgroundImage: 'radial-gradient(circle at 4px 50%, transparent 2px, #d1d5db 2px)', backgroundSize: '8px 100%'}}>
        </div>
      </div>

      {/* Action Buttons - only show if showActions is true */}
      {showActions && (
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 border-2 border-t-0 border-gray-200 rounded-b-lg -mt-1">
          <button
            onClick={() => window.open(`/service/${booking.service?.slug || booking.service?.id}/inquiry`, '_blank')}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 sm:py-2.5 px-3 sm:px-6 rounded-lg transition-colors text-sm sm:text-sm"
          >
            Message Provider
          </button>
          <button
            onClick={() => window.open('/', '_blank')}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 sm:py-2.5 px-3 sm:px-6 rounded-lg transition-colors text-sm sm:text-sm"
          >
            Home
          </button>
        </div>
      )}

      {/* Similar Services Carousel */}
      {showActions && booking.service?.category_id && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">Other services you may like</h3>
          <SimilarServicesCarousel
            categoryId={booking.service.category_id}
            excludeServiceId={booking.service.id}
            limit={8}
          />
        </div>
      )}

      {/* Close button for modal usage */}
      {onClose && (
        <div className="flex justify-center p-3 sm:p-4 bg-gray-50 border-2 border-t-0 border-gray-200 rounded-b-lg -mt-1">
          <button
            onClick={onClose}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm sm:text-base"
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}