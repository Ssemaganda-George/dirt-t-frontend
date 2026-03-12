import { Link } from 'react-router-dom'

export default function Geotagging() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold mb-4">Geotagging & Monitoring</h1>
      <p className="text-gray-600 mb-6">Use geotagging tools to monitor conservation areas, track biodiversity, and report changes over time. This page will provide mapping tools and instructions for submitting geotagged observations.</p>
      <Link to="/" className="text-emerald-600 hover:underline">Back to home</Link>
    </div>
  )
}
