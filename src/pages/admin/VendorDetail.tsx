import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { X, Check, Copy } from 'lucide-react'
import { getVendorById, updateVendorStatus, Vendor } from '../../lib/database'

export default function VendorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        setLoading(true)
        const v = await getVendorById(id)
        setVendor(v)
      } catch (err) {
        console.error('Error loading vendor:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  const handleCopy = async (text?: string) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Copy failed', err)
    }
  }

  const handleUpdateStatus = async (status: 'approved' | 'rejected') => {
    if (!vendor) return
    try {
      setProcessing(true)
      await updateVendorStatus(vendor.id, status)
      // After update, go back to vendors list
      navigate('/admin/vendors')
    } catch (err) {
      console.error('Error updating vendor status:', err)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!vendor) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-semibold">Vendor not found</h2>
        <p className="mt-2 text-sm text-gray-600">The vendor could not be loaded.</p>
        <div className="mt-4">
          <button onClick={() => navigate('/admin/vendors')} className="btn-primary">Back to vendors</button>
        </div>
      </div>
    )
  }

  const bank = (vendor as any).bank_details
  const mobiles = (vendor as any).mobile_money_accounts || []

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{vendor.business_name}</h1>
          <div className="text-sm text-gray-500">Applied: {new Date(vendor.created_at).toLocaleString()}</div>
        </div>
        <div className="space-x-3">
          <button onClick={() => navigate('/admin/vendors')} className="text-gray-600 hover:text-gray-900">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="card p-4">
          <h3 className="font-medium text-gray-900">Business Information</h3>
          <div className="mt-3 space-y-2 text-sm text-gray-700">
            <p><span className="font-medium">Name:</span> {vendor.business_name}</p>
            <p><span className="font-medium">Description:</span> {vendor.business_description}</p>
            <p><span className="font-medium">Address:</span> {vendor.business_address}</p>
            <p><span className="font-medium">Phone:</span> {vendor.business_phone}</p>
            <p><span className="font-medium">Email:</span> {vendor.business_email}</p>
          </div>
        </section>

        <section className="card p-4">
          <h3 className="font-medium text-gray-900">Owner Information</h3>
          <div className="mt-3 space-y-2 text-sm text-gray-700">
            <p><span className="font-medium">Name:</span> {vendor.profiles?.full_name}</p>
            <p><span className="font-medium">Email:</span> {vendor.profiles?.email}</p>
            <p><span className="font-medium">Phone:</span> {vendor.profiles?.phone}</p>
          </div>
        </section>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="card p-4">
          <h3 className="font-medium text-gray-900">Bank Details</h3>
          {!bank ? (
            <p className="mt-2 text-sm text-gray-500">No bank details provided.</p>
          ) : (
            <div className="mt-2 space-y-2 text-sm text-gray-700">
              <p><span className="font-medium">Bank:</span> {bank.bank_name}</p>
              <p className="flex items-center"><span className="font-medium">Account name:</span>&nbsp;{bank.bank_account_name}
                <button className="ml-3 text-gray-500" onClick={() => handleCopy(bank.bank_account_name)} title="Copy account name"><Copy className="h-4 w-4" /></button>
              </p>
              <p className="flex items-center"><span className="font-medium">Account number:</span>&nbsp;{bank.bank_account_number}
                <button className="ml-3 text-gray-500" onClick={() => handleCopy(bank.bank_account_number)} title="Copy account number"><Copy className="h-4 w-4" /></button>
              </p>
              <p><span className="font-medium">Branch:</span> {bank.bank_branch}</p>
              <p><span className="font-medium">SWIFT:</span> {bank.bank_swift}</p>
            </div>
          )}
        </section>

        <section className="card p-4">
          <h3 className="font-medium text-gray-900">Mobile Money Accounts</h3>
          {mobiles.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">No mobile money accounts provided.</p>
          ) : (
            <div className="mt-2 space-y-3 text-sm text-gray-700">
              {mobiles.map((m: any, idx: number) => (
                <div key={idx} className="space-y-1">
                  <div className="font-medium">{m.provider || 'Mobile Money'}</div>
                  {m.name && (
                    <div className="text-sm text-gray-700">Account name: <span className="font-medium">{m.name}</span>
                      <button className="ml-3 text-gray-500" onClick={() => handleCopy(m.name)} title="Copy account name"><Copy className="h-4 w-4" /></button>
                    </div>
                  )}
                  <div className="flex items-center text-xs text-gray-600"><span className="font-mono">{(m.country_code || '') + ' ' + (m.phone || '')}</span>
                    <button className="ml-3 text-gray-500" onClick={() => handleCopy((m.country_code || '') + (m.phone || ''))}><Copy className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4">
            <h4 className="font-medium text-gray-900">Preferred payout</h4>
            <div className="mt-2 text-sm text-gray-700">{(vendor as any).preferred_payout || 'Not set'}</div>
          </div>
        </section>
      </div>

      <div className="mt-6 flex items-center space-x-3">
        {vendor.status === 'pending' && (
          <>
            <button disabled={processing} onClick={() => handleUpdateStatus('approved')} className="btn-primary flex items-center">
              <Check className="h-4 w-4 mr-2" /> Approve
            </button>
            <button disabled={processing} onClick={() => handleUpdateStatus('rejected')} className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg">
              <X className="h-4 w-4 mr-2" /> Reject
            </button>
          </>
        )}
        <button onClick={() => navigate('/admin/vendors')} className="text-gray-600">Back to list</button>
      </div>
    </div>
  )
}
