import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Compass, X } from 'lucide-react'
import { usePlanTripSubmit } from '../hooks/usePlanTripSubmit'

function hideOnPath(pathname: string): boolean {
  if (pathname.startsWith('/plan')) return true
  if (pathname.includes('/scan/')) return true
  if (pathname.startsWith('/checkout/')) return true
  if (pathname.startsWith('/payment')) return true
  if (pathname.match(/^\/service\/[^/]+\/(book|inquiry|purchase)/)) return true
  return false
}

export default function PlanTripFab() {
  const { pathname } = useLocation()
  const { submitStatement, submitting, error } = usePlanTripSubmit()
  const [open, setOpen] = useState(false)
  const [statement, setStatement] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const hasBottomNav =
    !pathname.includes('/scan/') &&
    !pathname.startsWith('/service/') &&
    !pathname.match(/^\/checkout\/[^/]+(\/payment)?$/)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  if (hideOnPath(pathname)) return null

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitStatement(statement)
  }

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-end p-4 md:items-end md:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            aria-label="Close trip planner"
            onClick={() => setOpen(false)}
          />
          <form
            onSubmit={(e) => void onSubmit(e)}
            className={`relative z-10 w-full max-w-md rounded-2xl bg-white p-4 shadow-xl ${hasBottomNav ? 'mb-16 md:mb-0' : ''}`}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-gray-900">Plan a trip</p>
                <p className="mt-0.5 text-xs text-gray-500">Say it in one sentence. We draft from live DirtTrails packages.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea
              ref={inputRef}
              rows={4}
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="I have $1000 and I want to tour Uganda"
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-600 focus:outline-none"
            />
            {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={submitting}
              className="mt-3 w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-gray-300"
            >
              {submitting ? 'Drafting…' : 'Draft my trip'}
            </button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`fixed right-4 z-[60] inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-emerald-800 md:right-6 ${
            hasBottomNav ? 'bottom-20 md:bottom-6' : 'bottom-6'
          }`}
          style={{ marginBottom: hasBottomNav ? 'env(safe-area-inset-bottom)' : undefined }}
        >
          <Compass className="h-5 w-5" />
          Plan a trip
        </button>
      )}
    </>
  )
}
