import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Server not configured. Set SUPABASE_SERVICE_ROLE_KEY in environment.' })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const { userId } = req.body || {}
  if (!userId) return res.status(400).json({ error: 'Missing userId' })

  try {
    // Prefer a dedicated public.login_history table if present
    try {
      const { data: lhData, error: lhErr } = await supabase
        .from('login_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200)

      if (!lhErr && lhData) {
        return res.status(200).json({ sessions: lhData })
      }
    } catch (e) {
      // ignore - fallback below
    }

    // Try admin helper if available (supabase-js admin API)
    // @ts-ignore
    if (supabase.auth && (supabase.auth as any).admin && (supabase.auth as any).admin.listUserSessions) {
      // @ts-ignore
      const { data, error } = await (supabase.auth as any).admin.listUserSessions(userId)
      if (error) return res.status(500).json({ error: error.message || 'Could not list sessions' })
      return res.status(200).json({ sessions: data || [] })
    }

    // Fallback: query auth.sessions table directly (requires service role)
    const { data, error } = await supabase
      .from('auth.sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return res.status(500).json({ error: error.message || 'Could not fetch sessions' })
    return res.status(200).json({ sessions: data || [] })
  } catch (err: any) {
    console.error('get-login-history error', err)
    return res.status(500).json({ error: err?.message || 'Unexpected error' })
  }
}
