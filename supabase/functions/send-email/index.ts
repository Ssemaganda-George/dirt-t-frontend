/**
 * Supabase Edge Function for sending emails via Resend
 * 
 * Deploy with: supabase functions deploy send-email
 * 
 * Set secrets:
 * supabase secrets set RESEND_API_KEY=re_jmJHZYKY...
 * supabase secrets set FROM_EMAIL=noreply@yourdomain.com
 * supabase secrets set FRONTEND_URL=https://yourdomain.com
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'https://esm.sh/resend@2.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
// Use Resend's default domain if custom domain not verified yet
// You can send emails immediately with onboarding@resend.dev
// Once your domain is verified, change to: noreply@bookings.dirt-trails.com
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev'
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://bookings.dirt-trails.com'

interface EmailRequest {
  type: 'welcome' | 'booking' | 'vendor-signup' | 'vendor-approval' | 'password-reset'
  email: string
  [key: string]: any
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  try {
    const payload: EmailRequest = await req.json()
    const { type, email, ...data } = payload

    if (!type || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type, email' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    let result

    switch (type) {
      case 'welcome':
        result = await resend.emails.send({
          from: `DirtTrails <${FROM_EMAIL}>`,
          to: email,
          subject: 'Welcome to DirtTrails!',
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                  .content { padding: 20px; background: #f9fafb; border-radius: 0 0 5px 5px; }
                  .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Welcome to DirtTrails!</h1>
                  </div>
                  <div class="content">
                    <p>Hi ${data.name || 'User'},</p>
                    <p>Thank you for joining DirtTrails - Uganda's premier tourism marketplace!</p>
                    <p>Start exploring amazing services from local vendors:</p>
                    <ul>
                      <li>🏨 Hotels & Accommodations</li>
                      <li>🚗 Transportation Services</li>
                      <li>🍽️ Restaurants & Dining</li>
                      <li>🎯 Activities & Tours</li>
                    </ul>
                    <a href="${FRONTEND_URL}" class="button">Explore Services</a>
                    <p>Happy travels!</p>
                    <p>The DirtTrails Team</p>
                  </div>
                </div>
              </body>
            </html>
          `,
        })
        break

      case 'booking':
        result = await resend.emails.send({
          from: `DirtTrails Bookings <${FROM_EMAIL}>`,
          to: email,
          subject: `Booking Confirmed: ${data.serviceName || 'Your Booking'}`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                  .content { padding: 20px; background: #f9fafb; border-radius: 0 0 5px 5px; }
                  .booking-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
                  .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
                  .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>✅ Booking Confirmed!</h1>
                  </div>
                  <div class="content">
                    <p>Hi ${data.guestName || 'Guest'},</p>
                    <p>Your booking has been confirmed. Here are the details:</p>
                    <div class="booking-details">
                      <div class="detail-row">
                        <strong>Service:</strong>
                        <span>${data.serviceName || 'Tourism Service'}</span>
                      </div>
                      <div class="detail-row">
                        <strong>Date:</strong>
                        <span>${data.bookingDate ? new Date(data.bookingDate).toLocaleDateString() : 'TBD'}</span>
                      </div>
                      <div class="detail-row">
                        <strong>Total Amount:</strong>
                        <span>${data.totalAmount || 0} ${data.currency || 'UGX'}</span>
                      </div>
                      <div class="detail-row">
                        <strong>Booking ID:</strong>
                        <span>${data.bookingId || 'N/A'}</span>
                      </div>
                    </div>
                    <p>You'll receive a reminder email before your booking date.</p>
                    <a href="${FRONTEND_URL}/bookings" class="button">View My Bookings</a>
                    <p>Thank you for choosing DirtTrails!</p>
                    <p>The DirtTrails Team</p>
                  </div>
                </div>
              </body>
            </html>
          `,
        })
        break

      case 'vendor-signup':
        result = await resend.emails.send({
          from: `DirtTrails Vendors <${FROM_EMAIL}>`,
          to: email,
          subject: 'Welcome to DirtTrails Vendor Program',
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                  .content { padding: 20px; background: #f9fafb; border-radius: 0 0 5px 5px; }
                  .info-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Welcome to DirtTrails Vendor Program!</h1>
                  </div>
                  <div class="content">
                    <p>Hi ${data.fullName || 'Vendor'},</p>
                    <p>Thank you for joining DirtTrails as a vendor!</p>
                    <div class="info-box">
                      <strong>⏳ Account Review</strong>
                      <p>Your vendor account is currently under review. Our team will review your application within 48 hours.</p>
                      <p>You'll receive an email notification once your account is approved.</p>
                    </div>
                    <p><strong>What happens next?</strong></p>
                    <ol>
                      <li>Our team reviews your business information</li>
                      <li>You'll receive an approval email with login credentials</li>
                      <li>Start listing your services and receiving bookings!</li>
                    </ol>
                    <p>If you have any questions, feel free to contact our support team.</p>
                    <p>Best regards,<br>The DirtTrails Team</p>
                  </div>
                </div>
              </body>
            </html>
          `,
        })
        break

      case 'vendor-approval':
        result = await resend.emails.send({
          from: `DirtTrails Vendors <${FROM_EMAIL}>`,
          to: email,
          subject: '🎉 Your DirtTrails Vendor Account is Approved!',
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                  .content { padding: 20px; background: #f9fafb; border-radius: 0 0 5px 5px; }
                  .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>🎉 Congratulations!</h1>
                  </div>
                  <div class="content">
                    <p>Hi ${data.fullName || 'Vendor'},</p>
                    <p><strong>Great news!</strong> Your vendor account has been approved!</p>
                    <p>You can now:</p>
                    <ul>
                      <li>✅ Access your vendor dashboard</li>
                      <li>✅ List your services</li>
                      <li>✅ Start receiving bookings</li>
                      <li>✅ Manage your business profile</li>
                    </ul>
                    <a href="${FRONTEND_URL}/vendor-login" class="button">Login to Dashboard</a>
                    <p>Welcome to the DirtTrails vendor community!</p>
                    <p>Best regards,<br>The DirtTrails Team</p>
                  </div>
                </div>
              </body>
            </html>
          `,
        })
        break

      case 'password-reset':
        result = await resend.emails.send({
          from: `DirtTrails <${FROM_EMAIL}>`,
          to: email,
          subject: 'Reset Your Password',
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                  .content { padding: 20px; background: #f9fafb; border-radius: 0 0 5px 5px; }
                  .button { display: inline-block; padding: 12px 24px; background: #ef4444; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                  .warning { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 15px 0; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Password Reset Request</h1>
                  </div>
                  <div class="content">
                    <p>Hi ${data.name || 'User'},</p>
                    <p>You requested to reset your password. Click the button below to reset it:</p>
                    <a href="${data.resetUrl || FRONTEND_URL + '/reset-password?token=' + data.token}" class="button">Reset Password</a>
                    <div class="warning">
                      <p><strong>⚠️ Security Notice:</strong></p>
                      <p>This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
                    </div>
                    <p>Best regards,<br>The DirtTrails Team</p>
                  </div>
                </div>
              </body>
            </html>
          `,
        })
        break

      default:
        return new Response(
          JSON.stringify({ error: `Unknown email type: ${type}` }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error: any) {
    console.error('Email sending error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send email' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})

