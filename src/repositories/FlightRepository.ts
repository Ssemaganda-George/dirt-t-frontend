import { supabase } from '../lib/supabaseClient'
import type { Flight } from '../types'

export async function getFlights(): Promise<Flight[]> {
  const { data, error } = await supabase
    .from('flights')
    .select('*')
    .order('departure_time', { ascending: true })

  if (error) {
    console.error('Error fetching flights:', error)
    throw error
  }

  return data || []
}

export async function getFlightById(id: string): Promise<Flight | null> {
  const { data, error } = await supabase
    .from('flights')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching flight:', error)
    throw error
  }

  return data
}

export async function createFlight(flight: Omit<Flight, 'id' | 'created_at' | 'updated_at'>): Promise<Flight> {
  const { data, error } = await supabase
    .from('flights')
    .insert(flight)
    .select()
    .single()

  if (error) {
    console.error('Error creating flight:', error)
    throw error
  }

  return data
}

export async function updateFlight(id: string, updates: Partial<Flight>): Promise<Flight> {
  const { data, error } = await supabase
    .from('flights')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating flight:', error)
    throw error
  }

  return data
}

export async function deleteFlight(id: string): Promise<void> {
  const { error } = await supabase
    .from('flights')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting flight:', error)
    throw error
  }
}

export async function updateFlightStatus(id: string, status: Flight['status']): Promise<Flight> {
  const { data, error } = await supabase
    .from('flights')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating flight status:', error)
    throw error
  }

  return data
}
