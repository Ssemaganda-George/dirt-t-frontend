import { useEffect, useState, type FormEvent } from 'react'
import { Copy, Plus, Trash2, X } from 'lucide-react'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { chargeDisplayAmount, sumLineItems, withLineAmounts, type ChargeType } from '../../lib/quotePayLink'
import {
  cancelQuotePayLink,
  createQuotePayLink,
  enableQuoteBalanceLink,
  listQuotes,
  publicPayUrl,
  type QuoteDisplayCurrency,
  type QuoteRow,
} from '../../repositories/QuoteRepository'
import { getServices } from '../../repositories/ServiceRepository'
import { getAllVendors } from '../../repositories/VendorRepository'
import type { Vendor } from '../../types'

type LineDraft = { description: string; qty: string; unit_price: string }
type Mode = 'listing' | 'custom'
type Listing = { id: string; title: string; category_id: string; price: number; currency: string }

const inputCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-[#61B82C] focus:border-[#61B82C]'
const primaryBtn =
  'inline-flex items-center justify-center rounded-lg bg-[#61B82C] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a8f23] disabled:opacity-50'
const ghostBtn =
  'inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50'
const blankLine = (): LineDraft => ({ description: '', qty: '1', unit_price: '' })
const nil = (v: string) => (v.trim() === '' ? null : v.trim())
const errText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback)
function parsePositiveInt(raw: string): number | null {
  const n = Number(raw)
  return /^\d+$/.test(raw.trim()) && n > 0 ? n : null
}

export default function Quotes() {
  const [quotes, setQuotes] = useState<QuoteRow[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [payUrl, setPayUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [mode, setMode] = useState<Mode>('listing')
  const [listingAgreed, setListingAgreed] = useState('')
  const [customLines, setCustomLines] = useState<LineDraft[]>([blankLine()])
  const [chargeType, setChargeType] = useState<ChargeType>('full')
  const [customCharge, setCustomCharge] = useState('')
  const [displayCurrency, setDisplayCurrency] = useState<QuoteDisplayCurrency>('USD')
  const [agreedTotalUgx, setAgreedTotalUgx] = useState('')
  const [collectAmountUgx, setCollectAmountUgx] = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [serviceDate, setServiceDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [notes, setNotes] = useState('')

  const listing = listings.find((s) => s.id === serviceId)
  const lineItems =
    mode === 'listing'
      ? listing && Number(listingAgreed) > 0
        ? withLineAmounts([{ description: listing.title, qty: 1, unit_price: Number(listingAgreed) }])
        : []
      : withLineAmounts(
          customLines
            .map((row) => ({ description: row.description.trim(), qty: Number(row.qty), unit_price: Number(row.unit_price) }))
            .filter((row) => row.description && row.qty > 0 && Number.isFinite(row.unit_price)),
        )
  const agreedTotal = sumLineItems(lineItems)
  let chargePreview: number | null = null
  try {
    chargePreview = chargeDisplayAmount(agreedTotal, chargeType, chargeType === 'custom' ? Number(customCharge) : undefined)
  } catch {
    chargePreview = null
  }

  const refresh = async () => setQuotes(await listQuotes())
  const resetForm = () => {
    setGuestName(''); setGuestEmail(''); setGuestPhone('')
    setVendorId(''); setServiceId(''); setMode('listing'); setListingAgreed('')
    setCustomLines([blankLine()]); setChargeType('full'); setCustomCharge('')
    setDisplayCurrency('USD'); setAgreedTotalUgx(''); setCollectAmountUgx('')
    setInvoiceNo(''); setServiceDate(''); setEndDate(''); setValidUntil(''); setNotes('')
  }
  const copyPay = async (url: string) => {
    setPayUrl(url)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard may be blocked */ }
  }
  const showToken = (token: string) => copyPay(publicPayUrl(token))
  const patchLine = (i: number, key: keyof LineDraft, value: string) =>
    setCustomLines((rows) => rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)))

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [rows, vendorRows] = await Promise.all([listQuotes(), getAllVendors()])
        if (!cancelled) { setQuotes(rows); setVendors(vendorRows) }
      } catch (err) {
        if (!cancelled) setError(errText(err, 'Failed to load quotes'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!vendorId) { setListings([]); setServiceId(''); return }
    setListings([])
    setServiceId('')
    let cancelled = false
    getServices(vendorId)
      .then((rows) => {
        if (!cancelled) {
          setError(null)
          setListings((rows as Listing[]).filter((s) => s.category_id !== 'cat_restaurants'))
        }
      })
      .catch((err) => { if (!cancelled) setError(errText(err, 'Failed to load listings')) })
    return () => { cancelled = true }
  }, [vendorId])

  useEffect(() => {
    if (chargeType !== 'full' || displayCurrency !== 'UGX') return
    const fromUgx = parsePositiveInt(agreedTotalUgx)
    if (fromUgx) setCollectAmountUgx(String(fromUgx))
    else if (agreedTotal > 0) setCollectAmountUgx(String(Math.round(agreedTotal)))
  }, [chargeType, displayCurrency, agreedTotalUgx, agreedTotal])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    const name = guestName.trim()
    const email = guestEmail.trim()
    const phone = guestPhone.trim()
    if (!name || !email || !phone) { setError('Guest name, email, and phone are required'); return }
    if (!vendorId || !serviceId) { setError('Vendor and listing are required'); return }
    if (lineItems.length === 0 || agreedTotal <= 0) { setError('Add at least one line with a positive agreed total'); return }
    const agreedUgx = parsePositiveInt(agreedTotalUgx)
    const collectUgx = parsePositiveInt(collectAmountUgx)
    if (agreedUgx == null || collectUgx == null) { setError('Agreed total UGX and collect amount UGX must be positive integers'); return }
    if (collectUgx > agreedUgx) { setError('Collect amount cannot exceed agreed total UGX'); return }
    if (chargeType === 'custom' && chargePreview == null) {
      setError('Custom charge must be greater than 0 and not more than the agreed total')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const created = await createQuotePayLink({
        vendorId, serviceId, guestName: name, guestEmail: email, guestPhone: phone,
        lineItems, agreedTotal, displayCurrency, chargeType,
        collectAmountUgx: collectUgx, agreedTotalUgx: agreedUgx,
        invoiceNo: nil(invoiceNo), notes: nil(notes),
        serviceDate: nil(serviceDate), endDate: nil(endDate), validUntil: nil(validUntil),
      })
      await showToken(created.token)
      setShowForm(false)
      resetForm()
      await refresh()
    } catch (err) {
      setError(errText(err, 'Failed to create quote pay link'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEnableBalance(quote: QuoteRow) {
    setBusyId(quote.id)
    setError(null)
    try {
      const result = await enableQuoteBalanceLink(quote.id)
      await showToken(result.token)
      await refresh()
    } catch (err) {
      setError(errText(err, 'Failed to enable balance link'))
    } finally {
      setBusyId(null)
    }
  }

  async function handleCancel(quote: QuoteRow) {
    if (!window.confirm(`Cancel ${quote.invoice_no}?`)) return
    setBusyId(quote.id)
    setError(null)
    try {
      await cancelQuotePayLink(quote.id)
      await refresh()
    } catch (err) {
      setError(errText(err, 'Failed to cancel quote'))
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <div className="flex justify-center items-center h-48"><LoadingSpinner /></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Quotes</h1>
          <p className="text-sm text-gray-500 mt-1">Create WhatsApp pay links at the agreed price. Catalog price is a hint only.</p>
        </div>
        <button type="button" className={primaryBtn} onClick={() => { resetForm(); setShowForm(true) }}>New pay link</button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {payUrl && (
        <div className="rounded-xl border border-[#61B82C]/30 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Copy pay link</p>
          <div className="mt-2 flex flex-col sm:flex-row gap-2">
            <input readOnly value={payUrl} className={inputCls} />
            <button type="button" className={primaryBtn} onClick={() => copyPay(payUrl)}>
              <Copy className="h-4 w-4 mr-1" /> {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Invoice', 'Guest', 'Vendor', 'Listing', 'Agreed vs paid UGX', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quotes.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No quotes yet</td></tr>
              ) : quotes.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{row.invoice_no}</td>
                  <td className="px-4 py-3 text-gray-700">{row.guest_name}</td>
                  <td className="px-4 py-3 text-gray-700">{row.vendors?.business_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{row.services?.title ?? '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.agreed_total_ugx.toLocaleString()} / {row.amount_paid_ugx.toLocaleString()}</td>
                  <td className="px-4 py-3"><span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">{row.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" className={ghostBtn} onClick={() => showToken(row.token)}>Copy link</button>
                      {row.status === 'deposit_paid' && (
                        <button type="button" className={ghostBtn} disabled={busyId === row.id} onClick={() => handleEnableBalance(row)}>Enable balance</button>
                      )}
                      {row.status === 'sent' && row.amount_paid_ugx === 0 && (
                        <button type="button" className={ghostBtn} disabled={busyId === row.id} onClick={() => handleCancel(row)}>Cancel</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto py-6 bg-black/40">
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 w-full max-w-2xl relative mx-4 max-h-[90vh] overflow-y-auto">
            <button type="button" className="absolute top-3 right-3 text-gray-500" onClick={() => setShowForm(false)} aria-label="Close">
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-base font-semibold text-gray-900 mb-4">New pay link</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input required value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Guest name *" className={inputCls} />
                <input required type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="Guest email *" className={inputCls} />
                <input required value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="Guest phone *" className={inputCls} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select required value={vendorId} onChange={(e) => { setVendorId(e.target.value); setServiceId('') }} className={inputCls}>
                  <option value="">Vendor *</option>
                  {vendors.map((v) => <option key={v.id} value={v.id}>{v.business_name}</option>)}
                </select>
                <select required value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={inputCls} disabled={!vendorId}>
                  <option value="">{vendorId ? 'Listing *' : 'Select a vendor first'}</option>
                  {listings.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
              {listing && (
                <p className="text-xs text-gray-500">Catalog hint: {listing.price} {listing.currency} — not used as the collect amount.</p>
              )}
              <div className="flex gap-2">
                {(['listing', 'custom'] as Mode[]).map((m) => (
                  <button key={m} type="button" onClick={() => setMode(m)} className={`px-3 py-1.5 rounded-lg text-sm ${mode === m ? 'bg-[#61B82C] text-white' : 'bg-gray-100 text-gray-700'}`}>
                    {m === 'listing' ? 'This listing' : 'Custom invoice'}
                  </button>
                ))}
              </div>
              {mode === 'listing' ? (
                <input type="number" min="0" step="0.01" value={listingAgreed} onChange={(e) => setListingAgreed(e.target.value)} placeholder="Agreed total (display currency) *" className={inputCls} />
              ) : (
                <div className="space-y-2">
                  {customLines.map((row, i) => (
                    <div key={i} className="grid grid-cols-[1fr_4rem_6rem_auto] gap-2">
                      <input value={row.description} onChange={(e) => patchLine(i, 'description', e.target.value)} placeholder="Description" className={inputCls} />
                      <input type="number" min="1" value={row.qty} onChange={(e) => patchLine(i, 'qty', e.target.value)} className={inputCls} />
                      <input type="number" min="0" step="0.01" value={row.unit_price} onChange={(e) => patchLine(i, 'unit_price', e.target.value)} placeholder="Unit" className={inputCls} />
                      <button type="button" className="text-gray-400 hover:text-red-600" onClick={() => setCustomLines((rows) => rows.filter((_, idx) => idx !== i))} aria-label="Remove line">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button type="button" className={`${ghostBtn} gap-1`} onClick={() => setCustomLines((rows) => [...rows, blankLine()])}>
                    <Plus className="h-3.5 w-3.5" /> Add line
                  </button>
                </div>
              )}
              <p className="text-sm text-gray-600">Agreed total: {agreedTotal} {displayCurrency}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select value={chargeType} onChange={(e) => setChargeType(e.target.value as ChargeType)} className={inputCls}>
                  <option value="full">Full</option>
                  <option value="deposit">50% deposit</option>
                  <option value="custom">Custom</option>
                </select>
                <select value={displayCurrency} onChange={(e) => setDisplayCurrency(e.target.value as QuoteDisplayCurrency)} className={inputCls}>
                  <option value="USD">USD</option>
                  <option value="UGX">UGX</option>
                  <option value="RWF">RWF</option>
                </select>
                {chargeType === 'custom' && (
                  <input type="number" min="0" step="0.01" value={customCharge} onChange={(e) => setCustomCharge(e.target.value)} placeholder="Custom charge (display)" className={inputCls} />
                )}
              </div>
              <p className="text-xs text-gray-500">
                Charge preview: {chargePreview == null ? '—' : `${chargePreview} ${displayCurrency}`} (UGX collect is typed below; no auto FX)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input required type="number" min="1" step="1" value={agreedTotalUgx} onChange={(e) => setAgreedTotalUgx(e.target.value)} placeholder="Agreed total UGX *" className={inputCls} />
                <input required type="number" min="1" step="1" value={collectAmountUgx} onChange={(e) => setCollectAmountUgx(e.target.value)} placeholder="Collect amount UGX *" className={inputCls} />
              </div>
              <input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="DT-INV-2026-003" className={inputCls} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="text-xs text-gray-500">Service date<input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} className={`${inputCls} mt-1`} /></label>
                <label className="text-xs text-gray-500">End date<input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`${inputCls} mt-1`} /></label>
                <label className="text-xs text-gray-500">Valid until<input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={`${inputCls} mt-1`} /></label>
              </div>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" rows={2} className={inputCls} />
              <button type="submit" className={`${primaryBtn} w-full`} disabled={submitting}>{submitting ? 'Creating…' : 'Create pay link'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
