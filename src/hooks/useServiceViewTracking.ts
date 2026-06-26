import { useEffect, useRef } from 'react'
import { useVisitorTracking } from './useVisitorTracking'

/** Log one service listing view per mount (per service id). */
export function useServiceViewTracking(serviceId: string | undefined) {
  const { trackServiceView, loading, visitorSession } = useVisitorTracking()
  const trackedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!serviceId || loading || !visitorSession) return
    if (trackedFor.current === serviceId) return

    trackedFor.current = serviceId
    trackServiceView(serviceId, document.referrer || undefined)
  }, [serviceId, loading, visitorSession, trackServiceView])
}
