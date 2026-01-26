import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL')
const FRONTEND_URL = Deno.env.get('FRONTEND_URL')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface BookingData {
  id: string
  service_id: string
  tourist_id?: string
  vendor_id: string
  booking_date: string
  service_date?: string
  booking_time?: string
  guests: number
  total_amount: number
  currency: string
  status: string
  payment_status: string
  special_requests?: string
  guest_name?: string
  guest_email?: string
  guest_phone?: string
  is_guest_booking?: boolean
  pickup_location?: string
  dropoff_location?: string
  return_trip?: boolean
  start_time?: string
  end_time?: string
  end_date?: string
}

serve(async (req) => {
  // Handle CORS
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
    // Validate environment variables
    if (!RESEND_API_KEY || !FROM_EMAIL || !FRONTEND_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing environment variables:', {
        RESEND_API_KEY: !!RESEND_API_KEY,
        FROM_EMAIL: !!FROM_EMAIL,
        FRONTEND_URL: !!FRONTEND_URL,
        SUPABASE_URL: !!SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY,
      })
      throw new Error('Missing required environment variables')
    }

    // Get authorization header (optional - function can work without user auth)
    const authHeader = req.headers.get('authorization')
    console.log('Request received, auth header present:', !!authHeader)

    // Parse request body
    let requestBody
    try {
      requestBody = await req.json()
    } catch (e) {
      console.error('Failed to parse request body:', e)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    const { booking_id } = requestBody

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: 'booking_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch booking details with related data
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        services:service_id (
          id,
          title,
          description,
          price,
          currency,
          service_categories (
            name
          )
        )
      `)
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      throw new Error(`Failed to fetch booking: ${bookingError?.message}`)
    }

    const bookingData = booking as BookingData & {
      services?: {
        id: string
        title: string
        description?: string
        price: number
        currency: string
        service_categories?: { name: string }
      }
    }

    // Fetch tourist profile (if not guest booking)
    let touristEmail = bookingData.guest_email
    let touristName = bookingData.guest_name || 'Guest'
    
    if (bookingData.tourist_id && !bookingData.is_guest_booking) {
      const { data: touristProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', bookingData.tourist_id)
        .single()
      
      if (touristProfile) {
        touristEmail = touristProfile.email
        touristName = touristProfile.full_name || touristName
      }
    }

    // Fetch vendor business details first (vendor_id references vendors table)
    const { data: vendorBusiness, error: vendorBusinessError } = await supabase
      .from('vendors')
      .select('business_name, business_email, user_id')
      .eq('id', bookingData.vendor_id)
      .single()

    if (vendorBusinessError || !vendorBusiness) {
      throw new Error(`Failed to fetch vendor business: ${vendorBusinessError?.message}`)
    }

    // Fetch vendor profile using user_id from vendor record (if user_id exists)
    let vendorProfile: { email: string; full_name: string } | null = null
    if (vendorBusiness.user_id) {
      const { data: profile, error: vendorError } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', vendorBusiness.user_id)
        .single()

      if (vendorError) {
        console.warn(`Failed to fetch vendor profile: ${vendorError?.message}, using vendor business email`)
      } else {
        vendorProfile = profile
      }
    }

    const vendorEmail = vendorBusiness.business_email || vendorProfile?.email || 'vendor@example.com'
    const vendorName = vendorBusiness.business_name || vendorProfile?.full_name || 'Vendor'

    // Fetch all admin emails
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('role', 'admin')

    const adminEmails = adminProfiles?.map(admin => admin.email) || []

    if (adminEmails.length === 0) {
      console.warn('No admin emails found')
    }

    // Format booking details for email
    const serviceName = bookingData.services?.title || 'Service'
    const serviceCategory = bookingData.services?.service_categories?.name || 'General'
    const bookingDate = new Date(bookingData.booking_date).toLocaleDateString()
    const serviceDate = bookingData.service_date 
      ? new Date(bookingData.service_date).toLocaleDateString() 
      : bookingDate
    const amount = `${bookingData.currency} ${bookingData.total_amount.toLocaleString()}`

    // Prepare email content
    const bookingDetails = `
      <h3>Booking Details:</h3>
      <ul>
        <li><strong>Booking ID:</strong> ${bookingData.id}</li>
        <li><strong>Service:</strong> ${serviceName} (${serviceCategory})</li>
        <li><strong>Booking Date:</strong> ${bookingDate}</li>
        ${bookingData.service_date ? `<li><strong>Service Date:</strong> ${serviceDate}</li>` : ''}
        ${bookingData.booking_time ? `<li><strong>Time:</strong> ${bookingData.booking_time}</li>` : ''}
        ${bookingData.start_time && bookingData.end_time 
          ? `<li><strong>Time:</strong> ${bookingData.start_time} - ${bookingData.end_time}</li>` 
          : ''}
        <li><strong>Number of Guests:</strong> ${bookingData.guests}</li>
        <li><strong>Total Amount:</strong> ${amount}</li>
        <li><strong>Status:</strong> ${bookingData.status}</li>
        <li><strong>Payment Status:</strong> ${bookingData.payment_status}</li>
        ${bookingData.pickup_location ? `<li><strong>Pickup Location:</strong> ${bookingData.pickup_location}</li>` : ''}
        ${bookingData.dropoff_location ? `<li><strong>Dropoff Location:</strong> ${bookingData.dropoff_location}</li>` : ''}
        ${bookingData.return_trip ? `<li><strong>Return Trip:</strong> Yes</li>` : ''}
        ${bookingData.special_requests ? `<li><strong>Special Requests:</strong> ${bookingData.special_requests}</li>` : ''}
      </ul>
    `

    // Send email to tourist
    if (touristEmail) {
      console.log(`Sending booking confirmation email to tourist: ${touristEmail}`)
      const touristEmailBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Booking Confirmation</h1>
            </div>
            <div class="content">
              <p>Dear ${touristName},</p>
              <p>Thank you for your booking! We're excited to confirm your reservation.</p>
              ${bookingDetails}
              <p>You can view your booking details at: <a href="${FRONTEND_URL}/bookings">${FRONTEND_URL}/bookings</a></p>
              <p>If you have any questions, please don't hesitate to contact us.</p>
              <p>Best regards,<br>The DirtTrails Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `

      await sendEmail({
        to: touristEmail,
        subject: `Booking Confirmation - ${serviceName}`,
        html: touristEmailBody,
      })
      console.log(`✅ Tourist email sent to ${touristEmail}`)
    } else {
      console.warn('No tourist email found, skipping tourist email')
    }

    // Send email to vendor
    console.log(`Sending booking notification email to vendor: ${vendorEmail}`)
    const vendorEmailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 10px 20px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Booking Received</h1>
          </div>
          <div class="content">
            <p>Dear ${vendorName},</p>
            <p>You have received a new booking for your service!</p>
            ${bookingDetails}
            <p><strong>Customer Details:</strong></p>
            <ul>
              <li><strong>Name:</strong> ${touristName}</li>
              <li><strong>Email:</strong> ${touristEmail || 'N/A'}</li>
              ${bookingData.guest_phone ? `<li><strong>Phone:</strong> ${bookingData.guest_phone}</li>` : ''}
            </ul>
            <p>You can manage this booking at: <a href="${FRONTEND_URL}/vendor/bookings">${FRONTEND_URL}/vendor/bookings</a></p>
            <p>Best regards,<br>The DirtTrails Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `

    await sendEmail({
      to: vendorEmail,
      subject: `New Booking - ${serviceName}`,
      html: vendorEmailBody,
    })
    console.log(`✅ Vendor email sent to ${vendorEmail}`)

    // Send email to all admins
    console.log(`Sending booking notification emails to ${adminEmails.length} admin(s)`)
    for (const adminEmail of adminEmails) {
      console.log(`Sending admin email to: ${adminEmail}`)
      const adminEmailBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Booking Notification</h1>
            </div>
            <div class="content">
              <p>Dear Admin,</p>
              <p>A new booking has been created on the platform.</p>
              ${bookingDetails}
              <p><strong>Customer Details:</strong></p>
              <ul>
                <li><strong>Name:</strong> ${touristName}</li>
                <li><strong>Email:</strong> ${touristEmail || 'N/A'}</li>
              </ul>
              <p><strong>Vendor Details:</strong></p>
              <ul>
                <li><strong>Business Name:</strong> ${vendorName}</li>
                <li><strong>Email:</strong> ${vendorEmail}</li>
              </ul>
              <p>You can view this booking at: <a href="${FRONTEND_URL}/admin/bookings">${FRONTEND_URL}/admin/bookings</a></p>
              <p>Best regards,<br>The DirtTrails System</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `

      await sendEmail({
        to: adminEmail,
        subject: `New Booking Alert - ${serviceName}`,
        html: adminEmailBody,
      })
      console.log(`✅ Admin email sent to ${adminEmail}`)
    }

    console.log('✅ All booking emails sent successfully')
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Emails sent successfully',
        sent_to: {
          tourist: touristEmail,
          vendor: vendorEmail,
          admins: adminEmails
        }
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    )

  } catch (error: any) {
    console.error('❌ Error sending booking emails:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Failed to send booking emails',
        details: error?.toString() || String(error),
        stack: error?.stack
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    )
  }
})

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  // Format FROM_EMAIL as "DirtTrails <email>" if it's just an email
  const fromEmail = FROM_EMAIL.includes('<') ? FROM_EMAIL : `DirtTrails <${FROM_EMAIL}>`
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject,
      html,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Resend API error for ${to}:`, errorText)
    throw new Error(`Resend API error: ${response.status} ${errorText}`)
  }

  const result = await response.json()
  console.log(`Email sent successfully to ${to}:`, result.id)
  return result
}

