import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function headerCountryCode(req: Request): string | null {
  const raw =
    req.headers.get('cf-ipcountry') ||
    req.headers.get('x-vercel-ip-country') ||
    req.headers.get('x-country-code')
  const code = String(raw || '').trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code) || code === 'XX' || code === 'T1') return null
  return code
}

async function lookupGeo(
  ip: string,
  req: Request
): Promise<{ country: string | null; countryCode: string | null; city: string | null }> {
  const headerCode = headerCountryCode(req)
  const trimmed = String(ip || '').trim()
  if (!trimmed || trimmed === '127.0.0.1' || trimmed.startsWith('192.168.') || trimmed.startsWith('10.')) {
    return { country: headerCode, countryCode: headerCode, city: null }
  }

  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(trimmed)}?fields=success,country,country_code,city`, {
      headers: { Accept: 'application/json' },
    })
    if (response.ok) {
      const data = await response.json()
      if (data?.success !== false) {
        const countryCode = String(data?.country_code || headerCode || '').trim().toUpperCase() || null
        const country = data?.country ? String(data.country).trim() : countryCode
        const city = data?.city ? String(data.city).trim() : null
        return {
          country: country || null,
          countryCode: /^[A-Z]{2}$/.test(countryCode || '') ? countryCode : headerCode,
          city,
        }
      }
    }
  } catch {
    // Fall through
  }

  return { country: headerCode, countryCode: headerCode, city: null }
}

function isUnknownGeo(value: string | null | undefined): boolean {
  if (!value) return true
  const normalized = value.trim().toLowerCase()
  return normalized === '' || normalized === 'unknown'
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const body = await req.json()
    const ipAddress =
      body?.ipAddress ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      null

    if (!ipAddress) {
      return new Response(JSON.stringify({ error: 'IP address is required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const geo = await lookupGeo(ipAddress, req)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: sessionId, error: rpcError } = await supabaseAdmin.rpc('get_or_create_visitor_session', {
      p_ip_address: ipAddress,
      p_user_id: body?.userId || null,
      p_country: geo.country || geo.countryCode,
      p_city: geo.city,
      p_device_type: body?.deviceType || null,
      p_browser_info: body?.browserInfo || null,
      p_user_agent: body?.userAgent || null,
    })

    if (rpcError) throw rpcError

    const { data: session, error: fetchError } = await supabaseAdmin
      .from('visitor_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (fetchError) throw fetchError

    if (geo.country && (isUnknownGeo(session.country) || isUnknownGeo(session.city))) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('visitor_sessions')
        .update({
          country: geo.country,
          city: geo.city || session.city,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .select('*')
        .single()

      if (!updateError && updated) {
        return new Response(JSON.stringify({ session: updated, countryCode: geo.countryCode }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }
    }

    return new Response(JSON.stringify({ session, countryCode: geo.countryCode }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('visitor-session error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to create visitor session' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
