#!/usr/bin/env node
/**
 * Backfill `public.login_history.country` using an IP geolocation API.
 *
 * Usage:
 *   SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill-login-country.js
 * Optional env:
 *   GEOAPI_URL - e.g. https://ipapi.co (default https://ipapi.co)
 */
const fetch = require('node-fetch')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
const GEOAPI = process.env.GEOAPI_URL || 'https://ipapi.co'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function geolookup(ip) {
  try {
    const res = await fetch(`${GEOAPI}/${encodeURIComponent(ip)}/json/`)
    if (!res.ok) return null
    const j = await res.json()
    return j.country_name || j.country || null
  } catch (e) {
    console.warn('geo lookup failed for', ip, e.message)
    return null
  }
}

async function run() {
  console.log('Fetching login_history rows with missing country...')
  const { data, error } = await supabase
    .from('login_history')
    .select('id, ip_address')
    .is('country', null)
    .limit(500)

  if (error) {
    console.error('Error fetching login_history:', error)
    process.exit(1)
  }

  if (!data || data.length === 0) {
    console.log('No rows to backfill')
    return
  }

  for (const row of data) {
    const ip = row.ip_address
    if (!ip) {
      console.log('Skipping row', row.id, 'no ip')
      continue
    }
    const country = await geolookup(ip)
    if (!country) {
      console.log('No country for ip', ip)
      continue
    }
    const { error: upErr } = await supabase.from('login_history').update({ country }).eq('id', row.id)
    if (upErr) console.warn('Failed to update row', row.id, upErr)
    else console.log('Updated', row.id, '=>', country)
    // small delay to be polite to geo API
    await new Promise(r => setTimeout(r, 200))
  }

  console.log('Backfill complete')
}

run().catch(e => { console.error(e); process.exit(1) })
