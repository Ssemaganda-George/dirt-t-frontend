export interface VendorSignupEmailPayload {
  userId: string
  email: string
  fullName: string
}

/**
 * Trigger a server-side email for vendor signup onboarding.
 *
 * This calls a POST /api/send-vendor-email endpoint (you must implement on the server).
 * We keep the client simple and unauthenticated here; secure the endpoint server-side.
 */
export async function sendVendorSignupEmail(payload: VendorSignupEmailPayload) {
  const url = (import.meta.env && (import.meta.env.VITE_VENDOR_EMAIL_ENDPOINT as string)) || '/api/send-vendor-email'

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Vendor email request failed: ${res.status} ${text}`)
  }

  return res.json()
}
