#!/usr/bin/env node
// Simple local dev API to mimic serverless /api/get-login-history
const express = require('express')
const bodyParser = require('body-parser')
const { createClient } = require('@supabase/supabase-js')

const port = process.env.DEV_API_PORT || 8787
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL. Set environment variables and retry.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

const app = express()
app.use(bodyParser.json())

app.post('/api/get-login-history', async (req, res) => {
  const { userId } = req.body || {}
  if (!userId) return res.status(400).json({ error: 'Missing userId' })

  try {
    // Prefer public.login_history
    try {
      const { data: lhData, error: lhErr } = await supabase
        .from('login_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200)
      if (!lhErr && lhData) return res.json({ sessions: lhData })
    } catch (e) {
      // fallthrough
    }

    // Fallback to auth.sessions
    const { data, error } = await supabase
      .from('auth.sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ sessions: data || [] })
  } catch (err) {
    console.error('dev-api error', err)
    return res.status(500).json({ error: 'Unexpected error' })
  }
})

app.listen(port, () => console.log(`Dev API running on http://localhost:${port}`))
