import { Link } from 'react-router-dom'

export default function TreePlanting() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold mb-4">Tree Planting Initiatives</h1>
      <p className="text-gray-600 mb-6">Learn about our tree planting partnerships and how you can contribute to reforestation efforts. This page will describe ongoing initiatives and how bookings support planting.</p>
      <Link to="/" className="text-emerald-600 hover:underline">Back to home</Link>
    </div>
  )
}
