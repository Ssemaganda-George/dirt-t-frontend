import { supabase } from '../lib/supabaseClient'
import { getCurrentUserId } from '../services/AuthService'

export interface ScanSession {
  id: string
  service_id: string
  created_by: string
  start_time: string
  duration_hours: number
  end_time: string
  status: 'active' | 'expired' | 'cancelled'
  created_at: string
  updated_at: string
}

export async function createScanSession(serviceId: string, durationHours: number): Promise<ScanSession | null> {
  try {
    const { data, error } = await supabase
      .from('scan_sessions')
      .insert([{
        service_id: serviceId,
        created_by: await getCurrentUserId(),
        duration_hours: durationHours,
        end_time: new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString(),
        status: 'active',
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating scan session:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('Exception creating scan session:', err)
    return null
  }
}

export async function getActiveScanSession(serviceId: string): Promise<ScanSession | null> {
  try {
    const { data, error } = await supabase
      .from('scan_sessions')
      .select('*')
      .eq('service_id', serviceId)
      .eq('status', 'active')
      .gt('end_time', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Error getting active scan session:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('Exception getting active scan session:', err)
    return null
  }
}

export async function expireScanSession(sessionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('scan_sessions')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', sessionId)

    if (error) {
      console.error('Error expiring scan session:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('Exception expiring scan session:', err)
    return false
  }
}

export async function getScanSessionsForService(serviceId: string): Promise<ScanSession[]> {
  try {
    const { data, error } = await supabase
      .from('scan_sessions')
      .select('*')
      .eq('service_id', serviceId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching scan sessions:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Exception fetching scan sessions:', err)
    return []
  }
}
