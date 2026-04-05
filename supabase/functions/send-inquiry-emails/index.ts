// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'inquiries@dirttrails.com'
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'safaris.dirttrails@gmail.com'
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://dirttrails.com'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface InquiryData {
  id: string
  inquiry_type: 'contact' | 'service' | 'safari' | 'partnership'
  name: string
  email: string
  phone?: string
  subject?: string
  message?: string
  category?: string
  service_id?: string
  vendor_id?: string
  preferred_date?: string
  number_of_guests?: number
  contact_method?: string
  service_specific_data?: Record<string, any>
  safari_data?: Record<string, any>
  priority?: string
  source?: string
  created_at: string
  // Joined data
  services?: {
    id: string
    title: string
  }
  vendors?: {
    id: string
    business_name: string
    business_email?: string
  }
}

function jsonError(code: string, message: string, status: number, details?: string) {
  return new Response(
    JSON.stringify({ success: false, code, error: message, details }),
    { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  )
}

function fmtDate(dateStr?: string): string {
  if (!dateStr) return 'Not specified'
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    })
  } catch { return dateStr }
}

function getInquiryTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    contact: 'Contact Form',
    service: 'Service Inquiry',
    safari: 'Safari Request',
    partnership: 'Partnership Request'
  }
  return labels[type] || type
}

function getCategoryLabel(category?: string): string {
  if (!category) return 'General'
  const labels: Record<string, string> = {
    general: 'General Inquiry',
    booking: 'Booking Support',
    technical: 'Technical Support',
    partnership: 'Partnership',
    complaint: 'Complaint',
    other: 'Other'
  }
  return labels[category] || category
}

// ─── ADMIN NOTIFICATION EMAIL ───────────────────────────────────────────────

function buildAdminEmailHtml(inquiry: InquiryData): string {
  const typeColor = {
    contact: '#3B82F6', // blue
    service: '#8B5CF6', // purple
    safari: '#10B981', // green
    partnership: '#F59E0B' // orange
  }[inquiry.inquiry_type] || '#6B7280'

  let serviceSection = ''
  if (inquiry.services) {
    serviceSection = `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #E5E7EB;">
        <p style="margin:0 0 4px;color:#6B7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Service</p>
        <p style="margin:0;color:#1F2937;font-size:14px;font-weight:600;">${inquiry.services.title}</p>
        ${inquiry.vendors ? `<p style="margin:4px 0 0;color:#6B7280;font-size:13px;">Provider: ${inquiry.vendors.business_name}</p>` : ''}
      </td>
    </tr>`
  }

  let safariSection = ''
  if (inquiry.inquiry_type === 'safari' && inquiry.safari_data) {
    const sd = inquiry.safari_data
    safariSection = `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #E5E7EB;background:#F0FDF4;padding:16px;border-radius:8px;">
        <p style="margin:0 0 12px;color:#166534;font-size:13px;font-weight:600;">Safari Details</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${sd.countries ? `<tr><td style="padding:4px 0;color:#6B7280;font-size:12px;">Countries:</td><td style="padding:4px 0;color:#1F2937;font-size:12px;">${sd.countries.join(', ')}</td></tr>` : ''}
          ${sd.activities ? `<tr><td style="padding:4px 0;color:#6B7280;font-size:12px;">Activities:</td><td style="padding:4px 0;color:#1F2937;font-size:12px;">${sd.activities.join(', ')}</td></tr>` : ''}
          ${sd.travelWith ? `<tr><td style="padding:4px 0;color:#6B7280;font-size:12px;">Traveling:</td><td style="padding:4px 0;color:#1F2937;font-size:12px;">${sd.travelWith}</td></tr>` : ''}
          ${sd.days ? `<tr><td style="padding:4px 0;color:#6B7280;font-size:12px;">Duration:</td><td style="padding:4px 0;color:#1F2937;font-size:12px;">${sd.days} days</td></tr>` : ''}
          ${sd.budget ? `<tr><td style="padding:4px 0;color:#6B7280;font-size:12px;">Budget:</td><td style="padding:4px 0;color:#1F2937;font-size:12px;">$${sd.budget} per person</td></tr>` : ''}
          ${sd.startDate ? `<tr><td style="padding:4px 0;color:#6B7280;font-size:12px;">Start Date:</td><td style="padding:4px 0;color:#1F2937;font-size:12px;">${fmtDate(sd.startDate)}</td></tr>` : ''}
          ${sd.adults || sd.children ? `<tr><td style="padding:4px 0;color:#6B7280;font-size:12px;">Travelers:</td><td style="padding:4px 0;color:#1F2937;font-size:12px;">${sd.adults || 0} adults, ${sd.children || 0} children</td></tr>` : ''}
          ${sd.rooms ? `<tr><td style="padding:4px 0;color:#6B7280;font-size:12px;">Rooms:</td><td style="padding:4px 0;color:#1F2937;font-size:12px;">${sd.rooms}</td></tr>` : ''}
        </table>
      </td>
    </tr>`
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>New ${getInquiryTypeLabel(inquiry.inquiry_type)} — DirtTrails</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F3F4F6;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- HEADER -->
  <tr><td style="background:${typeColor};padding:24px 32px;border-radius:12px 12px 0 0;">
    <p style="margin:0 0 4px;color:rgba(255,255,255,0.8);font-size:11px;text-transform:uppercase;letter-spacing:2px;">DIRT TRAILS</p>
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:600;">New ${getInquiryTypeLabel(inquiry.inquiry_type)}</h1>
  </td></tr>

  <!-- BODY -->
  <tr><td style="padding:32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <!-- Contact Info -->
      <tr>
        <td style="padding:0 0 16px;border-bottom:1px solid #E5E7EB;">
          <p style="margin:0 0 4px;color:#6B7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;">From</p>
          <p style="margin:0;color:#1F2937;font-size:16px;font-weight:600;">${inquiry.name}</p>
          <p style="margin:4px 0 0;color:#3B82F6;font-size:14px;">${inquiry.email}</p>
          ${inquiry.phone ? `<p style="margin:4px 0 0;color:#6B7280;font-size:13px;">📞 ${inquiry.phone}</p>` : ''}
        </td>
      </tr>

      <!-- Category/Type -->
      ${inquiry.category ? `
      <tr>
        <td style="padding:16px 0;border-bottom:1px solid #E5E7EB;">
          <p style="margin:0 0 4px;color:#6B7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Category</p>
          <span style="display:inline-block;padding:4px 12px;background:#F3F4F6;border-radius:16px;font-size:12px;color:#4B5563;">${getCategoryLabel(inquiry.category)}</span>
        </td>
      </tr>` : ''}

      ${serviceSection}
      ${safariSection}

      <!-- Dates/Guests -->
      ${inquiry.preferred_date || inquiry.number_of_guests ? `
      <tr>
        <td style="padding:16px 0;border-bottom:1px solid #E5E7EB;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              ${inquiry.preferred_date ? `
              <td style="width:50%;">
                <p style="margin:0 0 4px;color:#6B7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Preferred Date</p>
                <p style="margin:0;color:#1F2937;font-size:14px;">${fmtDate(inquiry.preferred_date)}</p>
              </td>` : ''}
              ${inquiry.number_of_guests ? `
              <td>
                <p style="margin:0 0 4px;color:#6B7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Guests</p>
                <p style="margin:0;color:#1F2937;font-size:14px;">${inquiry.number_of_guests}</p>
              </td>` : ''}
            </tr>
          </table>
        </td>
      </tr>` : ''}

      <!-- Subject -->
      ${inquiry.subject ? `
      <tr>
        <td style="padding:16px 0;border-bottom:1px solid #E5E7EB;">
          <p style="margin:0 0 4px;color:#6B7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Subject</p>
          <p style="margin:0;color:#1F2937;font-size:15px;font-weight:600;">${inquiry.subject}</p>
        </td>
      </tr>` : ''}

      <!-- Message -->
      <tr>
        <td style="padding:16px 0;">
          <p style="margin:0 0 8px;color:#6B7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Message</p>
          <div style="background:#F9FAFB;padding:16px;border-radius:8px;border-left:3px solid ${typeColor};">
            <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;white-space:pre-wrap;">${inquiry.message || 'No message provided'}</p>
          </div>
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <div style="margin-top:24px;text-align:center;">
      <a href="${FRONTEND_URL}/admin/inquiries" style="display:inline-block;padding:12px 32px;background:#1F2937;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">View in Admin Panel</a>
    </div>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="padding:24px 32px;background:#F9FAFB;text-align:center;border-radius:0 0 12px 12px;">
    <p style="margin:0;color:#6B7280;font-size:12px;">Received ${fmtDate(inquiry.created_at)}</p>
    <p style="margin:8px 0 0;color:#9CA3AF;font-size:11px;">This is an automated notification from Dirt Trails</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

// ─── VENDOR NOTIFICATION EMAIL ───────────────────────────────────────────────

function buildVendorEmailHtml(inquiry: InquiryData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>New Service Inquiry — DirtTrails</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F3F4F6;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- HEADER -->
  <tr><td style="background:#8B5CF6;padding:24px 32px;border-radius:12px 12px 0 0;">
    <p style="margin:0 0 4px;color:rgba(255,255,255,0.8);font-size:11px;text-transform:uppercase;letter-spacing:2px;">DIRT TRAILS</p>
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:600;">New Service Inquiry</h1>
  </td></tr>

  <!-- BODY -->
  <tr><td style="padding:32px;">
    <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">
      You have received a new inquiry for <strong>${inquiry.services?.title || 'your service'}</strong>.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border-radius:8px;padding:20px;">
      <tr>
        <td>
          <p style="margin:0 0 4px;color:#6B7280;font-size:11px;text-transform:uppercase;">Customer</p>
          <p style="margin:0 0 12px;color:#1F2937;font-size:15px;font-weight:600;">${inquiry.name}</p>

          <p style="margin:0 0 4px;color:#6B7280;font-size:11px;text-transform:uppercase;">Email</p>
          <p style="margin:0 0 12px;color:#3B82F6;font-size:14px;"><a href="mailto:${inquiry.email}" style="color:#3B82F6;">${inquiry.email}</a></p>

          ${inquiry.phone ? `
          <p style="margin:0 0 4px;color:#6B7280;font-size:11px;text-transform:uppercase;">Phone</p>
          <p style="margin:0 0 12px;color:#1F2937;font-size:14px;">${inquiry.phone}</p>
          ` : ''}

          ${inquiry.preferred_date ? `
          <p style="margin:0 0 4px;color:#6B7280;font-size:11px;text-transform:uppercase;">Preferred Date</p>
          <p style="margin:0 0 12px;color:#1F2937;font-size:14px;">${fmtDate(inquiry.preferred_date)}</p>
          ` : ''}

          ${inquiry.number_of_guests ? `
          <p style="margin:0 0 4px;color:#6B7280;font-size:11px;text-transform:uppercase;">Number of Guests</p>
          <p style="margin:0 0 12px;color:#1F2937;font-size:14px;">${inquiry.number_of_guests}</p>
          ` : ''}

          ${inquiry.contact_method ? `
          <p style="margin:0 0 4px;color:#6B7280;font-size:11px;text-transform:uppercase;">Preferred Contact Method</p>
          <p style="margin:0 0 12px;color:#1F2937;font-size:14px;text-transform:capitalize;">${inquiry.contact_method}</p>
          ` : ''}
        </td>
      </tr>
    </table>

    ${inquiry.message ? `
    <div style="margin-top:20px;">
      <p style="margin:0 0 8px;color:#6B7280;font-size:11px;text-transform:uppercase;">Message</p>
      <div style="background:#F9FAFB;padding:16px;border-radius:8px;border-left:3px solid #8B5CF6;">
        <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;white-space:pre-wrap;">${inquiry.message}</p>
      </div>
    </div>
    ` : ''}

    <div style="margin-top:24px;text-align:center;">
      <a href="${FRONTEND_URL}/vendor/inquiries" style="display:inline-block;padding:12px 32px;background:#8B5CF6;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">View Inquiry</a>
      <a href="mailto:${inquiry.email}?subject=Re: Inquiry about ${encodeURIComponent(inquiry.services?.title || 'your service')}" style="display:inline-block;margin-left:12px;padding:12px 32px;background:#1F2937;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Reply to Customer</a>
    </div>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="padding:24px 32px;background:#F9FAFB;text-align:center;border-radius:0 0 12px 12px;">
    <p style="margin:0;color:#6B7280;font-size:12px;">Please respond to this inquiry within 24 hours for the best customer experience.</p>
    <p style="margin:8px 0 0;color:#9CA3AF;font-size:11px;">This is an automated notification from Dirt Trails</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

// ─── USER CONFIRMATION EMAIL ───────────────────────────────────────────────

function buildUserConfirmationHtml(inquiry: InquiryData): string {
  const typeTitles: Record<string, string> = {
    contact: 'Contact Request',
    service: 'Service Inquiry',
    safari: 'Safari Request',
    partnership: 'Partnership Request'
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>We've Received Your ${typeTitles[inquiry.inquiry_type]} — DirtTrails</title>
</head>
<body style="margin:0;padding:0;background:#F0EBE1;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F0EBE1;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#fff;box-shadow:0 8px 48px rgba(27,58,45,.14);">

  <!-- HEADER -->
  <tr><td style="background:#1B3A2D;padding:36px 44px;text-align:center;">
    <p style="margin:0 0 10px;color:#C9873A;font-size:9px;letter-spacing:5px;text-transform:uppercase;font-family:Arial,sans-serif;border-top:1px solid rgba(201,135,58,.4);border-bottom:1px solid rgba(201,135,58,.4);padding:6px 32px;display:inline-block;">EAST AFRICA'S ADVENTURE PLATFORM</p>
    <h1 style="margin:10px 0 4px;color:#FAF6EE;font-size:30px;letter-spacing:10px;font-weight:700;font-family:Georgia,serif;text-transform:uppercase;">DIRT TRAILS</h1>
  </td></tr>

  <!-- STATUS -->
  <tr><td style="background:#10B981;padding:13px 44px;text-align:center;">
    <p style="margin:0;color:#fff;font-size:11px;letter-spacing:4px;text-transform:uppercase;font-weight:700;font-family:Arial,sans-serif;">✓  WE'VE RECEIVED YOUR ${typeTitles[inquiry.inquiry_type].toUpperCase()}</p>
  </td></tr>

  <!-- BODY -->
  <tr><td style="padding:40px 44px;">
    <h2 style="margin:0 0 16px;color:#1B3A2D;font-size:21px;font-family:Georgia,serif;font-weight:normal;">Thank you, ${inquiry.name}!</h2>
    
    <p style="margin:0 0 20px;color:#4B5563;font-size:15px;line-height:1.6;">
      We've received your ${inquiry.inquiry_type === 'safari' ? 'safari request' : inquiry.inquiry_type === 'service' ? 'service inquiry' : 'message'} and our team is reviewing it. 
      ${inquiry.inquiry_type === 'safari' 
        ? 'One of our safari experts will contact you within 24 hours with personalized recommendations.'
        : 'We aim to respond to all inquiries within 24 hours.'}
    </p>

    ${inquiry.services ? `
    <div style="background:#F9FAFB;padding:16px;border-radius:8px;margin-bottom:20px;">
      <p style="margin:0 0 4px;color:#6B7280;font-size:11px;text-transform:uppercase;">Service</p>
      <p style="margin:0;color:#1F2937;font-size:15px;font-weight:600;">${inquiry.services.title}</p>
    </div>
    ` : ''}

    <p style="margin:0 0 20px;color:#4B5563;font-size:14px;line-height:1.6;">
      <strong>What happens next?</strong><br>
      Our team will review your request and get back to you via ${inquiry.contact_method || 'email'} at the contact details you provided.
    </p>

    <div style="text-align:center;margin-top:32px;">
      <a href="${FRONTEND_URL}" style="display:inline-block;padding:14px 32px;background:#1B3A2D;color:#FAF6EE;text-decoration:none;border-radius:4px;font-size:13px;font-weight:600;letter-spacing:1px;">EXPLORE MORE ADVENTURES</a>
    </div>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="padding:24px 44px;background:#F9FAFB;text-align:center;">
    <p style="margin:0;color:#6B7280;font-size:12px;">Have questions? Contact us at <a href="mailto:safaris.dirttrails@gmail.com" style="color:#1B3A2D;">safaris.dirttrails@gmail.com</a></p>
    <p style="margin:12px 0 0;color:#9CA3AF;font-size:11px;">© ${new Date().getFullYear()} Dirt Trails. All rights reserved.</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

// ─── SEND EMAIL ───────────────────────────────────────────────────────────────

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Resend API error:', errorData)
      return { success: false, error: errorData }
    }

    return { success: true }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error: String(error) }
  }
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonError('METHOD_NOT_ALLOWED', 'Only POST requests are allowed', 405)
  }

  try {
    const { inquiry_id, send_admin = true, send_vendor = true, send_user = true } = await req.json()

    if (!inquiry_id) {
      return jsonError('MISSING_INQUIRY_ID', 'inquiry_id is required', 400)
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Fetch inquiry from unified view
    const { data: inquiry, error: fetchError } = await supabase
      .from('all_inquiries')
      .select('*')
      .eq('id', inquiry_id)
      .single()

    if (fetchError || !inquiry) {
      return jsonError('INQUIRY_NOT_FOUND', 'Inquiry not found', 404, fetchError?.message)
    }
    
    // For safari inquiries, reconstruct safari_data from individual columns
    if (inquiry.inquiry_type === 'safari') {
      // Fetch full safari inquiry data
      const { data: safariData } = await supabase
        .from('safari_inquiries')
        .select('*')
        .eq('id', inquiry_id)
        .single()
      
      if (safariData) {
        inquiry.safari_data = {
          countries: safariData.countries || [],
          activities: safariData.activities || [],
          travelWith: safariData.travel_with,
          days: safariData.days,
          budget: safariData.budget,
          startDate: safariData.start_date,
          adults: safariData.adults,
          children: safariData.children,
          rooms: safariData.rooms,
          country: safariData.country
        }
      }
    }
    
    // For service inquiries, fetch service and vendor details
    if (inquiry.inquiry_type === 'service' && inquiry.service_id) {
      inquiry.services = { id: inquiry.service_id, title: inquiry.service_title }
      if (inquiry.vendor_id) {
        inquiry.vendors = { 
          id: inquiry.vendor_id, 
          business_name: inquiry.vendor_name,
          business_email: inquiry.vendor_email
        }
      }
    }
    
    // Map table name from inquiry type
    const tableMap: Record<string, string> = {
      contact: 'contact_inquiries',
      service: 'service_inquiries',
      safari: 'safari_inquiries',
      partnership: 'partnership_inquiries'
    }
    const tableName = tableMap[inquiry.inquiry_type]

    const results: { admin?: boolean; vendor?: boolean; user?: boolean } = {}
    
    // Send admin notification
    if (send_admin) {
      const adminSubject = `New ${getInquiryTypeLabel(inquiry.inquiry_type)}: ${inquiry.subject || inquiry.name}`
      const adminResult = await sendEmail({
        to: ADMIN_EMAIL,
        subject: adminSubject,
        html: buildAdminEmailHtml(inquiry)
      })
      results.admin = adminResult.success

      if (adminResult.success && tableName) {
        await supabase
          .from(tableName)
          .update({ admin_email_sent: true })
          .eq('id', inquiry_id)
      }
    }

    // Send vendor notification (only for service inquiries with vendor)
    if (send_vendor && inquiry.inquiry_type === 'service' && inquiry.vendors?.business_email) {
      const vendorSubject = `New Service Inquiry: ${inquiry.services?.title || 'Your Service'}`
      const vendorResult = await sendEmail({
        to: inquiry.vendors.business_email,
        subject: vendorSubject,
        html: buildVendorEmailHtml(inquiry)
      })
      results.vendor = vendorResult.success

      if (vendorResult.success && tableName) {
        await supabase
          .from(tableName)
          .update({ vendor_email_sent: true })
          .eq('id', inquiry_id)
      }
    }

    // Send user confirmation
    if (send_user && inquiry.email) {
      const userSubject = `We've received your ${inquiry.inquiry_type === 'safari' ? 'safari request' : 'inquiry'} - Dirt Trails`
      const userResult = await sendEmail({
        to: inquiry.email,
        subject: userSubject,
        html: buildUserConfirmationHtml(inquiry)
      })
      results.user = userResult.success

      if (userResult.success && tableName) {
        await supabase
          .from(tableName)
          .update({ user_confirmation_sent: true })
          .eq('id', inquiry_id)
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )

  } catch (error) {
    console.error('Error in send-inquiry-emails:', error)
    return jsonError('INTERNAL_ERROR', 'An error occurred processing the request', 500, String(error))
  }
})
