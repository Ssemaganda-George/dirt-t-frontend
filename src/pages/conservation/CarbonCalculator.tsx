import { Link } from 'react-router-dom'

export default function CarbonCalculator() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold mb-4">Calculate My Carbon</h1>
      <p className="text-gray-600 mb-6">Estimate the carbon footprint of your trips and learn ways to offset emissions. This tool will help calculate emissions and suggest offsets or conservation contributions.</p>
      <Link to="/" className="text-emerald-600 hover:underline">Back to home</Link>
    </div>
  )
}
