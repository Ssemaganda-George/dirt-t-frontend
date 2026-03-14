// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL')
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://bookings.dirt-trails.com'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  const requestOrigin = req.headers.get('origin') || '*'
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': requestOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  try {
    if (!RESEND_API_KEY || !FROM_EMAIL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing environment variables')
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 503,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    let body: { userId: string; email: string; fullName: string; role: 'tourist' | 'vendor'; businessName?: string }
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const { userId, email, fullName, role, businessName } = body
    if (!userId || !email || !fullName || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields: userId, email, fullName, role' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch all admin emails
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('role', 'admin')

    const adminEmails = adminProfiles?.map((a: any) => a.email).filter(Boolean) || []

    if (adminEmails.length === 0) {
      console.warn('No admin emails found — notification not sent')
      return new Response(JSON.stringify({ success: true, message: 'No admins to notify' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const isVendor = role === 'vendor'
    const accountType = isVendor ? 'Business / Vendor' : 'Tourist'
    const approvalPath = isVendor ? '/admin/vendors' : '/admin/tourists'
    const approvalUrl = `${FRONTEND_URL}${approvalPath}`

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1a56db; color: white; padding: 24px 20px; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 22px; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; background: ${isVendor ? '#fef3c7' : '#d1fae5'}; color: ${isVendor ? '#92400e' : '#065f46'}; margin-top: 8px; }
          .content { background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; }
          .field { margin-bottom: 12px; }
          .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
          .value { font-size: 15px; font-weight: 600; color: #111827; margin-top: 2px; }
          .cta { display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #1a56db; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; }
          .footer { text-align: center; padding: 16px; color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Account Pending Approval</h1>
            <span class="badge">${accountType}</span>
          </div>
          <div class="content">
            <p>A new <strong>${accountType}</strong> account has been registered on DirtTrails and is awaiting your review.</p>
            <div class="field">
              <div class="label">Full Name</div>
              <div class="value">${fullName}</div>
            </div>
            <div class="field">
              <div class="label">Email Address</div>
              <div class="value">${email}</div>
            </div>
            ${isVendor && businessName ? `
            <div class="field">
              <div class="label">Business Name</div>
              <div class="value">${businessName}</div>
            </div>` : ''}
            <div class="field">
              <div class="label">Account Type</div>
              <div class="value">${accountType}</div>
            </div>
            <div class="field">
              <div class="label">Status</div>
              <div class="value" style="color: #d97706;">Pending Approval</div>
            </div>
            <p>Please log in to the admin dashboard to review and ${isVendor ? 'approve or reject' : 'activate'} this account.</p>
            <a href="${approvalUrl}" class="cta">Review Account &rarr;</a>
          </div>
          <div class="footer">
            <p>This is an automated notification from the DirtTrails platform. Do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const results: string[] = []
    for (const adminEmail of adminEmails) {
      try {
        const fromEmail = FROM_EMAIL.includes('<') ? FROM_EMAIL : `DirtTrails <${FROM_EMAIL}>`
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [adminEmail],
            subject: `New ${accountType} Account Pending Approval — ${fullName}`,
            html: emailHtml,
          }),
        })
        if (res.ok) {
          results.push(adminEmail)
          console.log(`✅ Admin notification sent to ${adminEmail}`)
        } else {
          const err = await res.text()
          console.error(`Failed to send to ${adminEmail}:`, err)
        }
      } catch (e) {
        console.error(`Error sending to ${adminEmail}:`, e)
      }
    }

    return new Response(
      JSON.stringify({ success: true, notified: results }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('notify-admin-new-account error:', err)
    return new Response(
      JSON.stringify({ error: err?.message || 'Internal server error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
