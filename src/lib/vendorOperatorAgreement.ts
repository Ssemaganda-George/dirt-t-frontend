/** Canonical vendor operator agreement (must match docs/compliance/VENDOR-OPERATOR-AGREEMENT-2026-09-24.md body used for hashing). */
export const VENDOR_OPERATOR_AGREEMENT_VERSION = '2026-09-24'

/** SHA-256 (hex) of VENDOR_OPERATOR_AGREEMENT_TEXT UTF-8 bytes. */
export const VENDOR_OPERATOR_AGREEMENT_SHA256 =
  '8b9bcf1d07b68811b8f40ebd385ff90c49c513854a87ea35d2d8d3c49b051d49'

/** Exact bytes hashed (UTF-8). Keep in sync with docs/compliance/VENDOR-OPERATOR-AGREEMENT-2026-09-24.md. */
export const VENDOR_OPERATOR_AGREEMENT_TEXT = [
  'DirtTrails Vendor Operator Agreement',
  'Version: 2026-09-24',
  '',
  'By accepting, the vendor confirms they are authorized to list tourism services on DirtTrails Safaris, will provide accurate listings and fulfill confirmed bookings, will not misuse traveler data, will comply with applicable Ugandan law and DirtTrails Terms of Service, and authorize DirtTrails to process MarzPay payouts to the registered wallet for completed paid bookings (restaurants remain reservation-only).',
  '',
  'Acceptance creates a tamper-evident record binding the authenticated vendor user to this exact version text.',
  '',
].join('\n')

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
