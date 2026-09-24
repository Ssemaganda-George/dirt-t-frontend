import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type Incident = {
  id: string
  title: string
  summary: string
  awareness_at: string
  notification_deadline_at: string
  status: 'open' | 'contained' | 'closed'
  pdpo_notified_at: string | null
  pdpo_reference: string | null
}

const dateTime = (value: string) => new Date(value).toLocaleString()

export default function DataBreachIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [awarenessAt, setAwarenessAt] = useState('')
  const [references, setReferences] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase.from('data_breach_incidents')
      .select('id,title,summary,awareness_at,notification_deadline_at,status,pdpo_notified_at,pdpo_reference')
      .order('awareness_at', { ascending: false })
    if (loadError) setError(loadError.message)
    else setIncidents((data || []) as Incident[])
  }, [])

  useEffect(() => { void load() }, [load])

  const create = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (!awarenessAt || new Date(awarenessAt).getTime() > Date.now()) {
      setError('Enter the actual time the breach became known, no later than now.')
      return
    }
    setBusy(true)
    const { error: insertError } = await supabase.from('data_breach_incidents').insert({
      title: title.trim(), summary: summary.trim(), awareness_at: new Date(awarenessAt).toISOString(),
    })
    if (insertError) setError(insertError.message)
    else {
      setTitle('')
      setSummary('')
      setAwarenessAt('')
      await load()
    }
    setBusy(false)
  }

  const recordNotification = async (incident: Incident) => {
    const reference = references[incident.id]?.trim()
    if (!reference || reference.length < 3) {
      setError('Enter the PDPO submission reference or other proof of delivery first.')
      return
    }
    setBusy(true)
    setError('')
    const { error: updateError } = await supabase.from('data_breach_incidents')
      .update({ pdpo_notified_at: new Date().toISOString(), pdpo_reference: reference })
      .eq('id', incident.id)
      .is('pdpo_notified_at', null)
    if (updateError) setError(updateError.message)
    else await load()
    setBusy(false)
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Data breach incidents</h1>
      <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
        Notify the PDPO immediately when a personal data breach occurs. The 48-hour clock below is an internal escalation marker, not permission to wait. Use the <a className="underline" href="https://pdpo.go.ug/media/2022/02/Form_7_-_Notification_of_Data_Breach.pdf" target="_blank" rel="noreferrer">PDPO Form 7</a> and record the delivery reference here. This screen does not send a notification.
      </div>
      <form onSubmit={create} className="space-y-3 rounded-lg border bg-white p-4">
        <h2 className="font-semibold">Record an incident</h2>
        <input aria-label="Incident title" required minLength={3} maxLength={200} placeholder="Incident title" value={title} onChange={event => setTitle(event.target.value)} className="w-full rounded border p-2" />
        <textarea aria-label="Incident summary" required minLength={10} maxLength={5000} placeholder="Brief summary; do not paste passwords or affected personal data" value={summary} onChange={event => setSummary(event.target.value)} className="w-full rounded border p-2" />
        <label className="block text-sm">When the breach became known
          <input type="datetime-local" required value={awarenessAt} onChange={event => setAwarenessAt(event.target.value)} className="mt-1 block rounded border p-2" />
        </label>
        <button disabled={busy} className="rounded bg-red-700 px-4 py-2 text-white disabled:opacity-50">Create incident</button>
      </form>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <div className="space-y-3">
        {incidents.map(incident => {
          const deadlinePassed = new Date(incident.notification_deadline_at).getTime() <= Date.now()
          return <article key={incident.id} className="rounded-lg border bg-white p-4">
            <h2 className="font-semibold">{incident.title}</h2>
            <p className="mt-1 text-sm">{incident.summary}</p>
            <p className="mt-2 text-sm">Aware: {dateTime(incident.awareness_at)} · Internal 48-hour marker: {dateTime(incident.notification_deadline_at)}</p>
            {incident.pdpo_notified_at ? <p className="mt-2 text-sm text-green-800">PDPO notification recorded: {dateTime(incident.pdpo_notified_at)} · Reference: {incident.pdpo_reference}</p> : <div className={`mt-2 rounded p-3 text-sm ${deadlinePassed ? 'bg-red-100 text-red-900' : 'bg-amber-100 text-amber-900'}`}>
              <strong>{deadlinePassed ? '48-hour marker passed. ' : 'Notification pending. '}</strong>Notify immediately and save the proof of delivery.
              <div className="mt-2 flex flex-wrap gap-2">
                <input aria-label={`PDPO reference for ${incident.title}`} placeholder="PDPO reference or proof of delivery" value={references[incident.id] || ''} onChange={event => setReferences(previous => ({ ...previous, [incident.id]: event.target.value }))} className="min-w-64 rounded border p-2" />
                <button type="button" disabled={busy} onClick={() => void recordNotification(incident)} className="rounded bg-slate-800 px-3 py-2 text-white disabled:opacity-50">Record notification</button>
              </div>
            </div>}
          </article>
        })}
        {incidents.length === 0 && <p className="text-sm text-gray-600">No incidents recorded.</p>}
      </div>
    </div>
  )
}
