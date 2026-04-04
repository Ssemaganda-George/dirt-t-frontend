import { useState } from 'react'
import { Link } from 'react-router-dom'

type Mode = 'flight' | 'car' | 'bus' | 'train' | 'ferry'

export default function CarbonCalculator() {
  const [mode, setMode] = useState<Mode>('flight')
  const [flightType, setFlightType] = useState<'short' | 'medium' | 'long'>('long')
  const [distance, setDistance] = useState<number | ''>('')
  const [passengers, setPassengers] = useState<number>(1)
  const [vehicleType, setVehicleType] = useState<'petrol' | 'diesel' | 'hybrid' | 'electric'>('petrol')
  const [resultKg, setResultKg] = useState<number | null>(null)

  const radiativeForcingMultiplier = 2 // aviation radiative forcing

  const reset = () => {
    setMode('flight')
    setFlightType('long')
    setDistance('')
    setPassengers(1)
    setVehicleType('petrol')
    setResultKg(null)
  }

  const parseDistance = (d: number | '') => {
    if (d === '' || isNaN(Number(d))) return 0
    return Number(d)
  }

  const calculate = () => {
    const d = parseDistance(distance)
    if (d <= 0) {
      setResultKg(null)
      return
    }

    let kg = 0

    if (mode === 'flight') {
      // emission factors in g CO2e per passenger-km (approximate averages)
      const factors: Record<string, number> = {
        short: 250,
        medium: 200,
        long: 160
      }
      const gPerKm = factors[flightType]
      kg = (gPerKm * radiativeForcingMultiplier * d * passengers) / 1000
    } else if (mode === 'car') {
      const map: Record<string, number> = {
        petrol: 180,
        diesel: 160,
        hybrid: 110,
        electric: 60
      }
      const gPerKm = map[vehicleType]
      // adjust for occupancy
      const effectivePassengers = Math.max(1, passengers)
      kg = (gPerKm * d) / 1000 / effectivePassengers
    } else if (mode === 'bus') {
      const gPerKm = 70
      kg = (gPerKm * d) / 1000 / Math.max(1, passengers)
    } else if (mode === 'train') {
      const gPerKm = 60
      kg = (gPerKm * d) / 1000 / Math.max(1, passengers)
    } else if (mode === 'ferry') {
      const gPerKm = 23
      kg = (gPerKm * d) / 1000 / Math.max(1, passengers)
    }

    setResultKg(Number(kg.toFixed(2)))
  }

  const treesForOffset = (kgCO2: number) => {
    // Assume ~22 kg CO2 absorbed per tree per year. Use 10-year horizon for planting impact.
    const perTree10yr = 22 * 10
    return Math.ceil(kgCO2 / perTree10yr)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold mb-4">Enhanced Carbon Footprint Calculator</h1>
      <p className="text-gray-600 mb-6">Calculate your travel emissions using scientifically-backed emission factors and offset your impact.</p>

      <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold mb-3">Calculate My Travel Emissions</h2>

        <label className="block text-sm font-medium text-gray-700 mb-2">Mode of Transport</label>
        <div className="flex gap-2 mb-4">
          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className="border rounded px-3 py-2">
            <option value="flight">Flight</option>
            <option value="car">Car</option>
            <option value="bus">Bus</option>
            <option value="train">Train</option>
            <option value="ferry">Ferry</option>
          </select>
        </div>

        {mode === 'flight' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Flight Type</label>
            <select value={flightType} onChange={(e) => setFlightType(e.target.value as any)} className="border rounded px-3 py-2">
              <option value="short">Short-haul (under ~1,500 km)</option>
              <option value="medium">Medium-haul (~1,500–4,000 km)</option>
              <option value="long">Long-haul (over ~4,000 km)</option>
            </select>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Distance (kilometers)</label>
          <input type="number" min={0} value={distance as any} onChange={(e) => setDistance(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Enter distance in kilometers" className="w-full border rounded px-3 py-2" />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Number of Passengers / Occupancy</label>
          <input type="number" min={1} value={passengers} onChange={(e) => setPassengers(Math.max(1, Number(e.target.value || 1)))} className="w-32 border rounded px-3 py-2" />
        </div>

        {mode === 'car' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Type</label>
            <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value as any)} className="border rounded px-3 py-2">
              <option value="petrol">Petrol</option>
              <option value="diesel">Diesel</option>
              <option value="hybrid">Hybrid</option>
              <option value="electric">Electric</option>
            </select>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={calculate} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-500">Calculate Carbon Footprint</button>
          <button onClick={reset} className="px-4 py-2 border rounded">Reset</button>
        </div>
      </section>

      {resultKg !== null && (
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold mb-2">Result</h3>
          <p className="text-gray-700">Estimated emissions: <strong>{resultKg} kg CO₂e</strong></p>
          <p className="text-gray-700 mb-4">Trees to offset (10-year absorption): <strong>{treesForOffset(resultKg)}</strong></p>
          <div className="flex gap-3">
            <a
              href={`/conservation/offset?kg=${encodeURIComponent(resultKg)}&trees=${encodeURIComponent(treesForOffset(resultKg))}`}
              className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-500"
            >
              Offset my carbon
            </a>
            <button onClick={reset} className="px-4 py-2 border rounded">Reset</button>
          </div>
        </section>
      )}

      <section className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">About Our Carbon Calculation Methodology</h3>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Emission factors (g CO₂e / km)</h4>
            <dl className="text-sm text-gray-700 space-y-2">
              <div className="flex justify-between">
                <dt className="text-gray-600">Flights</dt>
                <dd className="font-medium">150–250 <span className="text-gray-500">(includes {radiativeForcingMultiplier}× RF)</span></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Cars</dt>
                <dd className="font-medium">53–257</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Buses</dt>
                <dd className="font-medium">~70</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Ferries</dt>
                <dd className="font-medium">~23</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Trains</dt>
                <dd className="font-medium">41–81</dd>
              </div>
            </dl>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Key features</h4>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-2">
              <li>Aviation uses radiative forcing (multiplier applied for higher accuracy).</li>
              <li>Car emissions are adjusted for vehicle type and occupancy.</li>
              <li>Factors are based on published research and official emission factor guidance.</li>
              <li>Results are estimates intended for guidance, not regulatory compliance.</li>
            </ul>

            <div className="mt-4 border-t pt-3">
              <h5 className="text-sm font-semibold text-gray-800 mb-1">Offset assumptions</h5>
              <p className="text-sm text-gray-700">We use a conservative tree absorption estimate of ~22 kg CO₂ per tree per year and present offsets over a 10-year horizon to estimate trees needed to balance emissions.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6">
        <Link to="/" className="text-emerald-600 hover:underline">Back to home</Link>
      </div>
    </div>
  )
}
