import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Heart, MapPin, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Service } from '../lib/database'
import { formatCurrency } from '../lib/utils'

interface SavedItem {
  id: string
  service_id: string
  user_id: string
  created_at: string
  services?: Service
}

export default function Saved() {
  const { user } = useAuth()
  const [savedItems, setSavedItems] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      fetchSavedItems()
    }
  }, [user])

  const fetchSavedItems = async () => {
    try {
      setLoading(true)
      // For now, we'll show a placeholder since saved items functionality isn't implemented yet
      // In a real implementation, this would fetch from a 'saved_items' or 'favorites' table
      setSavedItems([])
    } catch (err: any) {
      setError(err.message || 'Failed to load saved items')
    } finally {
      setLoading(false)
    }
  }

  const removeSavedItem = async (serviceId: string) => {
    // Placeholder for removing saved item
    // In a real implementation, this would delete from the database
    console.log('Remove saved item:', serviceId)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-sm border border-gray-200 p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Saved Items</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchSavedItems}
            className="bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Saved Items</h1>
          <p className="text-gray-600 mt-2">Your favorite services and experiences</p>
        </div>

        {/* Saved Items Grid */}
        {savedItems.length === 0 ? (
          <div className="bg-white shadow-sm border border-gray-200 p-12 text-center">
            <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No saved items yet</h3>
            <p className="text-gray-600 mb-6">
              Start saving your favorite services and experiences to access them quickly later.
            </p>
            <Link
              to="/"
              className="bg-blue-600 text-white px-6 py-3 hover:bg-blue-700 transition-colors inline-block"
            >
              Explore Services
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedItems.map((item) => (
              <div key={item.id} className="bg-white shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {item.services?.images?.[0] && (
                  <div className="relative">
                    <img
                      src={item.services.images[0]}
                      alt={item.services.title}
                      className="w-full h-48 object-cover"
                    />
                    <button
                      onClick={() => removeSavedItem(item.service_id)}
                      className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors"
                    >
                      <Heart className="h-5 w-5 text-red-500 fill-current" />
                    </button>
                  </div>
                )}

                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {item.services?.title || 'Service'}
                  </h3>

                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <MapPin className="h-4 w-4 mr-1" />
                    {item.services?.location || 'Location not specified'}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-gray-900">
                      {item.services ? formatCurrency(item.services.price, item.services.currency) : 'Price not available'}
                    </div>
                    <Link
                      to={`/service/${item.services?.slug || item.service_id}`}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Coming Soon Notice */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <Heart className="h-6 w-6 text-blue-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Saved Items Feature</h3>
              <p className="text-blue-700">
                The saved items functionality is coming soon! You'll be able to save your favorite services,
                create wishlists, and get notified about special offers on items you love.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}