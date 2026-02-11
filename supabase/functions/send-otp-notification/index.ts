// deno-lint-ignore-file
// @ts-nocheck
// Supabase Edge Function: send-otp-notification
// Deploy this to your Supabase project:
//   supabase functions deploy send-otp-notification
//
// This function sends OTP notifications via email and SMS.
// It uses Resend API for email delivery and Twilio for SMS.
// Environment variables needed:
//   RESEND_API_KEY - Your Resend API key
//   FROM_EMAIL - The sender email (e.g., otp@dirttrails.com)
//   TWILIO_ACCOUNT_SID - Your Twilio Account SID
//   TWILIO_AUTH_TOKEN - Your Twilio Auth Token
//   TWILIO_PHONE_NUMBER - Your Twilio phone number

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'otp@dirttrails.com'
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')

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
    const { to, subject, message, type } = await req.json()

    if (!to || !message || !type) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, message, type' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      })
    }

    if (type === 'email') {
      if (!subject) {
        return new Response(JSON.stringify({ error: 'Subject is required for email notifications' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
          },
        })
      }

      if (!RESEND_API_KEY) {
        return new Response(JSON.stringify({ error: 'Email service not configured' }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
          },
        })
      }

      // Send email using Resend
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [to],
          subject: subject,
          text: message,
        }),
      })

      if (!emailResponse.ok) {
        const errorData = await emailResponse.text()
        console.error('Email sending failed:', errorData)
        return new Response(JSON.stringify({ error: 'Failed to send email', details: errorData }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
          },
        })
      }

      const emailResult = await emailResponse.json()
      return new Response(JSON.stringify({ success: true, type: 'email', id: emailResult.id }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      })

    } else if (type === 'sms') {
      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
        return new Response(JSON.stringify({ error: 'SMS service not configured' }), {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
          },
        })
      }

      // Send SMS using Twilio
      const smsResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: TWILIO_PHONE_NUMBER,
          To: to,
          Body: message,
        }),
      })

      if (!smsResponse.ok) {
        const errorData = await smsResponse.text()
        console.error('SMS sending failed:', errorData)
        return new Response(JSON.stringify({ error: 'Failed to send SMS', details: errorData }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
          },
        })
      }

      const smsResult = await smsResponse.json()
      return new Response(JSON.stringify({ success: true, type: 'sms', id: smsResult.sid }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      })

    } else {
      return new Response(JSON.stringify({ error: 'Invalid notification type. Must be "email" or "sms"' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      })
    }

  } catch (error) {
    console.error('Exception in send-otp-notification:', error)
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }
})