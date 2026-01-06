import { Link } from 'react-router-dom'
import { Hotel, Camera, Utensils, Car, Activity, Plane } from 'lucide-react'

const categories = [
  {
    name: 'Hotels',
    href: '/category/hotels',
    icon: Hotel,
    description: 'Find the perfect accommodation for your stay',
    color: 'bg-blue-500'
  },
  {
    name: 'Tours',
    href: '/category/tours',
    icon: Camera,
    description: 'Explore amazing destinations and experiences',
    color: 'bg-green-500'
  },
  {
    name: 'Restaurants',
    href: '/category/restaurants',
    icon: Utensils,
    description: 'Discover great places to eat and drink',
    color: 'bg-orange-500'
  },
  {
    name: 'Transport',
    href: '/category/transport',
    icon: Car,
    description: 'Get around with reliable transportation',
    color: 'bg-purple-500'
  },
  {
    name: 'Flights',
    href: '/flights',
    icon: Plane,
    description: 'Find and book flights to your destination',
    color: 'bg-indigo-500'
  },
  {
    name: 'Activities',
    href: '/category/activities',
    icon: Activity,
    description: 'Book exciting activities and adventures',
    color: 'bg-red-500'
  }
]

export default function Services() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Our Services</h1>
          <p className="text-lg text-gray-600">
            Discover and book amazing experiences, accommodations, and transportation services
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link
              key={category.name}
              to={category.href}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center mb-4">
                <div className={`p-3 rounded-lg ${category.color} text-white mr-4 group-hover:scale-110 transition-transform`}>
                  <category.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{category.name}</h3>
              </div>
              <p className="text-gray-600">{category.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}