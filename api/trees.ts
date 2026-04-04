import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    return res.status(500).json({ error: 'Server not configured. Set SUPABASE URL and anon key in environment.' })
  }

  const supabase = createClient(supabaseUrl, anonKey)

  try {
    const debug = process.env.DEBUG_TREES_API === '1' || process.env.DEBUG_TREES_API === 'true'

    let query = supabase
      .from('trees')
      .select('id, external_id, species, latitude, longitude, planted_by, planted_on, images')
      .order('created_at', { ascending: false })

    if (!debug) query = (query as any).eq('approved', true)

    const { data, error } = await query

    console.log('api/trees debug=', { debug, error: error ? error.message : null, count: Array.isArray(data) ? data.length : 0 })

    if (error) {
      console.error('api/trees supabase error', error)
      return res.status(500).json({ error: error.message || 'Could not fetch trees' })
    }

    return res.status(200).json(data || [])
  } catch (err: any) {
    console.error('api/trees unexpected error', err)
    return res.status(500).json({ error: err?.message || 'Unexpected error' })
  }
}
