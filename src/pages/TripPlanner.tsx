import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, CheckCircle, Compass, MapPin } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePreferences } from '../contexts/PreferencesContext'
import { usePlanTripSubmit } from '../hooks/usePlanTripSubmit'
import Money from '../components/Money'
import type { ReconciledSlot } from '../lib/tripPlanner/types'
import {
  fetchTripPlan,
  getPlannerVisitorId,
  requestWishSlot,
  type SavedTripPlan,
} from '../lib/tripPlannerClient'

function SlotCard({
  slot,
  location,
  planId,
  visitorId,
  userId,
}: {
  slot: ReconciledSlot
  location: string | null
  planId: string
  visitorId?: string | null
  userId?: string | null
}) {
  const { selectedCurrency, selectedLanguage } = usePreferences()
  const [wishSent, setWishSent] = useState(false)
  const [wishBusy, setWishBusy] = useState(false)
  const [wishError, setWishError] = useState<string | null>(null)

  const onWish = async () => {
    if (!slot.wish_title || wishSent) return
    setWishBusy(true)
    setWishError(null)
    try {
      await requestWishSlot({
        trip_plan_id: planId,
        visitor_id: visitorId,
        user_id: userId,
        wish_title: slot.wish_title,
        wish_category: slot.wish_category,
        wish_cost_band: slot.wish_cost_band,
        location,
      })
      setWishSent(true)
    } catch (e) {
      setWishError(e instanceof Error ? e.message : 'Could not send request')
    } finally {
      setWishBusy(false)
    }
  }

  const kindLabel =
    slot.kind === 'bookable' ? 'Bookable' : slot.kind === 'reservation' ? 'Reservation' : 'Request'

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700">{kindLabel}</p>
          <h3 className="mt-1 text-sm font-bold text-gray-900">{slot.title}</h3>
          {slot.why ? <p className="mt-1 text-xs text-gray-600">{slot.why}</p> : null}
        </div>
        {slot.kind === 'bookable' && slot.price != null ? (
          <div className="text-right">
            <p className="text-[10px] text-gray-500">Starting from</p>
            <Money
              amount={slot.price}
              serviceCurrency={slot.currency || 'UGX'}
              targetCurrency={selectedCurrency || 'UGX'}
              locale={selectedLanguage || 'en-US'}
              className="inline text-sm font-bold"
              currencyClassName="text-[10px] font-normal text-gray-600 mr-0.5"
              amountClassName="text-sm font-bold text-gray-900"
            />
          </div>
        ) : null}
      </div>
      {slot.kind === 'bookable' && slot.itinerary.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-gray-700">
          {slot.itinerary.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      {slot.kind === 'bookable' && slot.slug ? (
        <Link
          to={`/service/${slot.slug}`}
          className="mt-3 inline-flex text-xs font-semibold text-emerald-700 hover:underline"
        >
          View package →
        </Link>
      ) : null}
      {slot.kind === 'reservation' && slot.slug ? (
        <Link
          to={`/service/${slot.slug}`}
          className="mt-3 inline-flex text-xs font-semibold text-emerald-700 hover:underline"
        >
          Reserve a table →
        </Link>
      ) : null}
      {slot.kind === 'wish' ? (
        <div className="mt-3">
          {wishSent ? (
            <p className="flex items-center gap-1 text-xs font-medium text-emerald-700">
              <CheckCircle className="h-3.5 w-3.5" /> Request received — we use this to onboard vendors
            </p>
          ) : (
            <button
              type="button"
              onClick={() => void onWish()}
              disabled={wishBusy}
              className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:bg-gray-300"
            >
              {wishBusy ? 'Sending…' : 'Request this'}
            </button>
          )}
          {wishError ? <p className="mt-1 text-xs text-red-600">{wishError}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

export default function TripPlanner() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { submitStatement, submitting, error, visitorId } = usePlanTripSubmit()
  const [statement, setStatement] = useState('')
  const [loadingPlan, setLoadingPlan] = useState(Boolean(id))
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saved, setSaved] = useState<SavedTripPlan | null>(null)
  const resolvedVisitorId = visitorId || getPlannerVisitorId(null)

  useEffect(() => {
    if (!id) {
      setLoadingPlan(false)
      return
    }
    if (!visitorId && !user?.id) return
    let cancelled = false
    setLoadingPlan(true)
    void fetchTripPlan(id, { visitor_id: visitorId, user_id: user?.id })
      .then((plan) => {
        if (!cancelled) setSaved(plan)
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Could not load plan')
      })
      .finally(() => {
        if (!cancelled) setLoadingPlan(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, visitorId, user?.id])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitStatement(statement)
  }

  const displayError = loadError || error

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-emerald-50">
      <main className="mx-auto w-full max-w-3xl px-4 py-10">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-sm font-medium text-emerald-700 hover:underline">
          ← Back
        </button>

        {id && loadingPlan ? (
          <div className="rounded-2xl border border-gray-100 bg-white/90 p-8 text-sm text-gray-600 shadow-lg">
            Loading your itinerary…
          </div>
        ) : !saved ? (
          <div className="rounded-2xl border border-gray-100 bg-white/90 p-8 shadow-lg">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-700 text-white">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-emerald-800">Plan a trip</h1>
                <p className="text-sm text-gray-600">One sentence is enough — budget, country, what you want to do.</p>
              </div>
            </div>

            {displayError ? (
              <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                {displayError}
              </div>
            ) : null}

            <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
              <textarea
                rows={4}
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                placeholder="I have $1000 and I want to tour Uganda"
                className="w-full resize-none rounded-xl border border-gray-200 px-3 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-600 focus:outline-none"
              />
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center rounded-lg bg-emerald-700 py-3 font-semibold text-white shadow hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {submitting ? 'Drafting…' : 'Draft my trip'}
              </button>
              <p className="text-center text-xs text-gray-500">
                Need a human instead?{' '}
                <Link to="/create-safari" className="font-medium text-emerald-700 hover:underline">
                  Send a safari inquiry
                </Link>
              </p>
            </form>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold text-emerald-800">{saved.plan.title}</h1>
            <p className="mt-1 text-sm text-gray-600">Prices come from DirtTrails listings. Checkout is not wired yet — open the package to book the existing way.</p>
            {loadError ? <p className="mt-3 text-sm text-red-600">{loadError}</p> : null}
            <div className="mt-6 space-y-6">
              {saved.plan.days.map((day) => (
                <section key={`${day.day}-${day.date || ''}`}>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <MapPin className="h-4 w-4 text-emerald-700" />
                    Day {day.day}
                    {day.location ? <span className="font-normal text-gray-600">· {day.location}</span> : null}
                  </div>
                  <div className="space-y-3">
                    {day.slots.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500">Nothing bookable for this day.</p>
                    ) : (
                      day.slots.map((slot, i) => (
                        <SlotCard
                          key={`${slot.kind}-${slot.service_id || slot.wish_title}-${i}`}
                          slot={slot}
                          location={day.location}
                          planId={saved.id}
                          visitorId={resolvedVisitorId}
                          userId={user?.id}
                        />
                      ))
                    )}
                  </div>
                </section>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setSaved(null)
                navigate('/plan')
              }}
              className="mt-8 w-full rounded-lg border border-gray-200 bg-white py-3 font-semibold text-gray-800 hover:bg-gray-50"
            >
              Plan another trip
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
