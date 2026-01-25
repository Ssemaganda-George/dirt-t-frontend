export interface VendorSignupEmailPayload {
  userId: string
  email: string
  fullName: string
}

export interface BookingEmailPayload {
  email: string
  serviceName: string
  bookingDate: string
  totalAmount: number
  currency?: string
  bookingId: string
  guestName?: string
  serviceType?: string
}

export interface WelcomeEmailPayload {
  email: string
  name: string
}

export interface VendorApprovalEmailPayload {
  email: string
  fullName: string
}

export interface PasswordResetEmailPayload {
  email: string
  name: string
  resetUrl: string
  token?: string
}

/**
 * Get the email endpoint URL from environment or use default
 */
function getEmailEndpoint(): string {
  return (
    (import.meta.env && import.meta.env.VITE_EMAIL_ENDPOINT) ||
    (import.meta.env && import.meta.env.VITE_VENDOR_EMAIL_ENDPOINT) ||
    '/api/send-email'
  )
}

/**
 * Generic function to send emails via the Supabase Edge Function
 */
async function sendEmail(type: string, payload: Record<string, any>) {
  const url = getEmailEndpoint()

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type,
      ...payload,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Email request failed: ${res.status} ${text}`)
  }

  return res.json()
}

/**
 * Send vendor signup email
 */
export async function sendVendorSignupEmail(payload: VendorSignupEmailPayload) {
  return sendEmail('vendor-signup', {
    email: payload.email,
    fullName: payload.fullName,
  })
}

/**
 * Send vendor approval email
 */
export async function sendVendorApprovalEmail(payload: VendorApprovalEmailPayload) {
  return sendEmail('vendor-approval', {
    email: payload.email,
    fullName: payload.fullName,
  })
}

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(payload: WelcomeEmailPayload) {
  return sendEmail('welcome', {
    email: payload.email,
    name: payload.name,
  })
}

/**
 * Send booking confirmation email
 */
export async function sendBookingConfirmationEmail(payload: BookingEmailPayload) {
  return sendEmail('booking', payload)
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(payload: PasswordResetEmailPayload) {
  return sendEmail('password-reset', payload)
}
