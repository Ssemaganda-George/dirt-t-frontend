// =====================================================
// SCAN SERVICE BANNER (OCR via Groq vision)
// =====================================================
// Reads a service's banner/listing image (services.primary_image_url or
// services.images[0]) using Groq's vision-capable chat completions API and
// extracts any itinerary-relevant text baked into the image (day-by-day plans,
// inclusions/exclusions, meeting points, duration/pricing text, etc).
//
// The result is cached on public.services.banner_ocr_text /
// banner_ocr_updated_at so the trip-planner can fold banner-only details into
// its prompt without re-OCR'ing the same image on every planning request.
//
// Callable by: the owning vendor (checked via vendors.user_id) or an admin
// profile. Triggered automatically (best-effort) from src/lib/imageUpload.ts
// after a service's images are updated; can also be invoked manually for a
// "re-scan banner" action.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Confirmed working request shape from Groq's own cookbook examples as of
// this writing. Groq's vision model lineup changes over time — if this model
// id is retired, set GROQ_VISION_MODEL as a function secret to override it
// without a code change.
const DEFAULT_GROQ_VISION_MODEL = 'llama-3.2-11b-vision-preview'
const MAX_OCR_TEXT_LEN = 2000
const NO_TEXT_MARKER = 'NO_ITINERARY_TEXT_FOUND'

const EXTRACTION_PROMPT = `You are reading a tour/travel listing banner image for a booking marketplace.
Transcribe any itinerary-relevant text that is visibly printed on the image, such as:
- day-by-day plan or schedule text
- inclusions / exclusions
- meeting point or departure location
- duration or pricing text
Return it as short plain-text bullet points, using only what is actually visible in the image.
Do not invent or assume details that are not shown.
If the image is just a generic photo with no readable itinerary text, respond with exactly this JSON: {"text": "${NO_TEXT_MARKER}"}
Otherwise respond with this JSON: {"text": "<the transcribed bullet points>"}`

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
}

async function callGroqVision(imageUrl: string): Promise<string | null> {
  const apiKey = Deno.env.get('GROQ_API_KEY')
  if (!apiKey) throw new Error('GROQ_API_KEY is not set on the scan-service-banner function')
  const model = Deno.env.get('GROQ_VISION_MODEL') || DEFAULT_GROQ_VISION_MODEL

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: EXTRACTION_PROMPT },
          ],
        },
      ],
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error?.message || `Groq vision request failed (${res.status})`)
  }

  const content = data?.choices?.[0]?.message?.content
  if (!content || typeof content !== 'string') return null

  let text: string
  try {
    const parsed = JSON.parse(content)
    text = String(parsed?.text || '').trim()
  } catch {
    // Model didn't honor JSON mode — fall back to using the raw text.
    text = content.trim()
  }

  if (!text || text === NO_TEXT_MARKER) return null
  return text.slice(0, MAX_OCR_TEXT_LEN)
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) return json(401, { error: 'Authorization header required' })

    const supabase = adminClient()
    const { data: userData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !userData?.user) return json(401, { error: 'Invalid token' })
    const callerId = userData.user.id

    const body = await req.json()
    const serviceId = String(body?.service_id || '')
    if (!serviceId) return json(400, { error: 'service_id is required' })

    const { data: service, error: svcError } = await supabase
      .from('services')
      .select('id, vendor_id, primary_image_url, images')
      .eq('id', serviceId)
      .maybeSingle()
    if (svcError) throw svcError
    if (!service) return json(404, { error: 'Service not found' })

    const [{ data: vendor }, { data: profile }] = await Promise.all([
      service.vendor_id
        ? supabase.from('vendors').select('user_id').eq('id', service.vendor_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('profiles').select('role').eq('id', callerId).maybeSingle(),
    ])

    const isOwner = !!vendor?.user_id && vendor.user_id === callerId
    const isAdmin = profile?.role === 'admin'
    if (!isOwner && !isAdmin) return json(403, { error: 'Not authorized to scan this service' })

    const imageUrl = body?.image_url ? String(body.image_url) : (service.primary_image_url || service.images?.[0])
    if (!imageUrl) return json(400, { error: 'Service has no banner image to scan' })

    const bannerText = await callGroqVision(imageUrl)

    const { error: updateError } = await supabase
      .from('services')
      .update({ banner_ocr_text: bannerText, banner_ocr_updated_at: new Date().toISOString() })
      .eq('id', serviceId)
    if (updateError) throw updateError

    return json(200, { service_id: serviceId, banner_ocr_text: bannerText })
  } catch (error) {
    console.error('scan-service-banner error:', error)
    return json(500, { error: error instanceof Error ? error.message : 'Failed to scan banner image' })
  }
})
