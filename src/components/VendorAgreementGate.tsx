import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { acceptVendorOperatorAgreement } from '../services/AuthService'
import {
  VENDOR_OPERATOR_AGREEMENT_SHA256,
  VENDOR_OPERATOR_AGREEMENT_TEXT,
  VENDOR_OPERATOR_AGREEMENT_VERSION,
  sha256Hex,
} from '../lib/vendorOperatorAgreement'

type Props = {
  vendorId: string | undefined
}

export default function VendorAgreementGate({ vendorId }: Props) {
  const [needed, setNeeded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [checked, setChecked] = useState(false)

  const refresh = useCallback(async () => {
    if (!vendorId) {
      setNeeded(false)
      return
    }
    const { data, error: loadError } = await supabase
      .from('vendor_agreement_acceptances')
      .select('id')
      .eq('vendor_id', vendorId)
      .eq('agreement_version', VENDOR_OPERATOR_AGREEMENT_VERSION)
      .maybeSingle()
    if (loadError) {
      setError(loadError.message)
      setNeeded(true)
      return
    }
    setNeeded(!data)
  }, [vendorId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const accept = async () => {
    setBusy(true)
    setError('')
    try {
      const hash = await sha256Hex(VENDOR_OPERATOR_AGREEMENT_TEXT)
      if (hash !== VENDOR_OPERATOR_AGREEMENT_SHA256) {
        setError('Agreement text hash mismatch. Refresh and try again.')
        setBusy(false)
        return
      }
      let ipAddress: string | null = null
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json')
        if (ipRes.ok) {
          const body = (await ipRes.json()) as { ip?: string }
          ipAddress = body.ip || null
        }
      } catch {
        /* optional */
      }
      const { data, error: rpcError } = await acceptVendorOperatorAgreement({
        agreementVersion: VENDOR_OPERATOR_AGREEMENT_VERSION,
        contentSha256: hash,
        ipAddress,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      })
      if (rpcError) throw rpcError
      if (!data?.success) throw new Error(data?.error || 'Could not record agreement')
      setNeeded(false)
    } catch (e: any) {
      setError(e?.message || 'Could not record agreement')
    }
    setBusy(false)
  }

  if (!needed) return null

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="vendor-agreement-title">
        <h2 id="vendor-agreement-title" className="text-lg font-semibold text-gray-900">
          Vendor operator agreement
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Version {VENDOR_OPERATOR_AGREEMENT_VERSION}. Accepting stores a tamper-evident record (SHA-256) bound to your account. Admin approval requires this acceptance.
        </p>
        <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-800">
          {VENDOR_OPERATOR_AGREEMENT_TEXT.trim()}
        </pre>
        <label className="mt-4 flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <span>I have read and accept this operator agreement for DirtTrails listings and paid bookings.</span>
        </label>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        <button
          type="button"
          disabled={!checked || busy}
          onClick={() => void accept()}
          className="mt-4 w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Recording…' : 'Accept and continue'}
        </button>
      </div>
    </div>
  )
}
