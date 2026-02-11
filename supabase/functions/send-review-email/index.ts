// deno-lint-ignore-file
// @ts-nocheck
// Supabase Edge Function: send-review-email
// Deploy this to your Supabase project:
//   supabase functions deploy send-review-email
//
// This function sends a review request email when a booking is completed.
// It uses the Resend API (https://resend.com) for email delivery.
// 
// Environment variables needed:
//   RESEND_API_KEY - Your Resend API key
//   FROM_EMAIL - The sender email (e.g., reviews@dirttrails.com)
//
// To set up:
// 1. Sign up at https://resend.com
// 2. Get your API key
// 3. Set secrets: supabase secrets set RESEND_API_KEY=your_key FROM_EMAIL=reviews@yourdomain.com

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'reviews@dirttrails.com'

serve(async (req: Request) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { to, guestName, serviceName, vendorName, reviewUrl, bookingId } = await req.json()

    if (!to || !reviewUrl) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>How was your experience?</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">How was your experience?</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">We'd love to hear your feedback</p>
    </div>
    
    <!-- Content -->
    <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 15px;">
        Hi ${guestName || 'there'},
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Thank you for choosing <strong>${serviceName}</strong> with <strong>${vendorName}</strong>! 
        We hope you had a wonderful experience.
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
        Your feedback helps other travelers make informed decisions and helps our partners improve their services.
      </p>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${reviewUrl}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 14px rgba(5,150,105,0.4);">
          ⭐ Rate & Review
        </a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 20px 0 0;">
        This link is unique to your booking and expires in 30 days.
      </p>
      
      <!-- Divider -->
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${reviewUrl}" style="color: #059669; word-break: break-all;">${reviewUrl}</a>
      </p>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
      <p style="margin: 0;">Sent by Dirt Trails · Your Adventure Starts Here</p>
      <p style="margin: 5px 0 0;">This is an automated message for booking #${bookingId?.slice(0, 8) || ''}</p>
    </div>
  </div>
</body>
</html>
    `

    // Send via Resend API
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `Dirt Trails Reviews <${FROM_EMAIL}>`,
        to: [to],
        subject: `How was your experience with ${serviceName}? ⭐`,
        html: emailHtml,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Resend API error:', data)
      return new Response(JSON.stringify({ error: 'Failed to send email', details: data }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, emailId: data.id }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    console.error('Error in send-review-email function:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
