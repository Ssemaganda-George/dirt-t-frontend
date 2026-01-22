import { createClient } from '@supabase/supabase-js'

// Create a service role client for admin operations
// This bypasses RLS policies for operations that need elevated permissions
let serviceClient: any = null

export function getServiceClient() {
  if (!serviceClient) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl) {
      throw new Error('VITE_SUPABASE_URL is not set')
    }

    // Use service role key if available, otherwise fall back to anon key
    // Note: This is not ideal for production, but allows the app to work
    const key = serviceKey || import.meta.env.VITE_SUPABASE_ANON_KEY

    if (!key) {
      throw new Error('No Supabase key available')
    }

    serviceClient = createClient(supabaseUrl, key)
  }

  return serviceClient
}