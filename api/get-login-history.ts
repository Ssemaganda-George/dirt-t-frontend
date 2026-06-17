import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({
      error: 'Server not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (server-only, never VITE_*).',
    })
  }

  const authHeader = req.headers?.authorization || req.headers?.Authorization
  const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : null
  if (!token) return res.status(401).json({ error: 'Missing Authorization header' })

  const supabase = createClient(supabaseUrl, serviceKey)

  // ponytail: derive userId from the verified token instead of trusting req.body — closes the IDOR, no userId param needed at all
  const { data: authData, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !authData?.user) return res.status(401).json({ error: 'Invalid or expired session' })
  const userId = authData.user.id

  try {
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
    } catch {
      // fallback below
    }

    // @ts-ignore — admin API when available
    if (supabase.auth && (supabase.auth as any).admin?.listUserSessions) {
      // @ts-ignore
      const { data, error } = await (supabase.auth as any).admin.listUserSessions(userId)
      if (error) return res.status(500).json({ error: error.message || 'Could not list sessions' })
      return res.status(200).json({ sessions: data || [] })
    }

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
