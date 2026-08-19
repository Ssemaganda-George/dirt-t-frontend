import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useVisitorTracking } from './useVisitorTracking'
import { requestFromStatement } from '../lib/tripPlanner/intent'
import { generateTripPlan, getPlannerVisitorId } from '../lib/tripPlannerClient'

export function usePlanTripSubmit() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { visitorSession, loading: visitorLoading } = useVisitorTracking()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const visitorId = visitorSession?.id || (!visitorLoading ? getPlannerVisitorId(null) : null)

  const submitStatement = async (statement: string) => {
    const text = statement.trim()
    if (!text) {
      setError('Tell us what you want in one sentence.')
      return
    }
    if (!visitorId && !user?.id) {
      setError('Visitor session is still starting. Wait a moment and try again.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const result = await generateTripPlan(requestFromStatement(text), {
        visitor_id: visitorId,
        user_id: user?.id,
      })
      navigate(`/plan/${result.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate a plan')
    } finally {
      setSubmitting(false)
    }
  }

  return { submitStatement, submitting, error, visitorId, userId: user?.id }
}
