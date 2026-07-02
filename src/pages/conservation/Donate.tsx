import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, DollarSign, Mail, User } from 'lucide-react';
import { usePreferences } from '../../contexts/PreferencesContext'
import { convertCurrency } from '../../lib/utils'
import { supabase } from '../../lib/supabaseClient'
import { getOptionalUserId } from '../../services/AuthService'
import MarzpayPaymentFields from '../../components/payment/MarzpayPaymentFields'
import {
  getMarzpayMobileValidationErrors,
  initiateMarzpayCollect,
  isMobileUiMethod,
  redirectMarzpayIfNeeded,
  toMarzpayMethod,
  type MarzpayPaymentFieldsValue,
} from '../../lib/marzpayApi'

const DonatePage = () => {
  const navigate = useNavigate();
  const [project, setProject] = useState('');
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentFields, setPaymentFields] = useState<MarzpayPaymentFieldsValue>({ method: 'mobile', phone: '', provider: '' });
  const [fieldErrors, setFieldErrors] = useState<{ phone?: string; mobileProvider?: string }>({});
  const [processing, setProcessing] = useState(false);

  const projects = [
    { value: 'wildlife-protection', label: 'Wildlife Protection Fund' },
    { value: 'reforestation', label: 'Reforestation Initiatives' },
    { value: 'community-conservation', label: 'Community Conservation Programs' },
    { value: 'anti-poaching', label: 'Anti-Poaching Efforts' },
    { value: 'other', label: 'Others' },
  ];

  const { selectedCurrency } = usePreferences()

  const registerDonationRpc = async (ref: string, amountInUGX: number, method: string) => {
    try {
      const touristId = await getOptionalUserId()
      await supabase.rpc('create_transaction_with_meta_atomic', {
        p_booking_id: null,
        p_vendor_id: null,
        p_tourist_id: touristId ?? null,
        p_amount: amountInUGX,
        p_currency: 'UGX',
        p_transaction_type: 'donation',
        p_status: 'pending',
        p_payment_method: method,
        p_reference: ref,
        p_payout_meta: null,
      });
    } catch (rpcErr) {
      console.warn('Failed to register donation transaction:', rpcErr);
    }
  }

  const handleProceed = async () => {
    if (!paymentFields.method) {
      alert('Select a payment method');
      return
    }
    if (!amount || Number(amount) <= 0) {
      alert('Enter a valid amount');
      return
    }
    if (isMobileUiMethod(paymentFields.method)) {
      const errs = getMarzpayMobileValidationErrors(paymentFields)
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs)
        return
      }
    }

    const orderId = `donate-${Date.now()}`
    setProcessing(true)
    try {
      const userId = await getOptionalUserId()
      const userCurrency = selectedCurrency || 'UGX'
      const amountInUGX = Math.round(convertCurrency(Number(amount || 0), userCurrency, 'UGX'))
      const isCard = paymentFields.method === 'card'

      const result = await initiateMarzpayCollect({
        amount: amountInUGX,
        method: toMarzpayMethod(paymentFields.method),
        ...(isCard ? {} : { phone_number: paymentFields.phone }),
        order_id: orderId,
        description: `Donation to ${project || 'conservation'}`,
        user_id: userId ?? undefined,
      })

      await registerDonationRpc(result.reference, amountInUGX, isCard ? 'card' : 'mobile')

      if (redirectMarzpayIfNeeded(result)) return

      navigate(`/checkout/${orderId}/payment?reference=${encodeURIComponent(result.reference)}`)
    } catch (err) {
      console.error('Donation payment initiation error:', err)
      alert((err as Error).message || 'Payment initiation failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-10">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center w-10 h-10 border border-gray-200 rounded-lg text-emerald-600 hover:bg-gray-100"
          >
            ←
          </button>
          <div className="mt-4">
            <h1 className="text-4xl font-bold mb-4">Offset Your Carbon Footprint</h1>
            <p className="text-muted-foreground">
              Donate to conservation projects that directly reduce carbon emissions and protect wildlife.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="bg-green-50 rounded-t-lg p-4 mb-4">
            <div className="flex items-center">
              <Heart className="mr-2 h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold">Make a Donation</h3>
            </div>
            <p className="text-sm text-gray-600 mt-2">Fill in the details below to request bank transfer information for your donation. You can choose to donate anonymously.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="project">Conservation Project</label>
              <select id="project" value={project} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setProject(e.target.value)} className="w-full border rounded px-3 py-2">
                <option value="">Select a project</option>
                {projects.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="amount">Donation Amount ({selectedCurrency})</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input id="amount" type="number" value={amount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)} placeholder="Enter amount" min={1} className="w-full border rounded px-3 py-2 pl-10" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input id="anonymous" type="checkbox" checked={isAnonymous} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsAnonymous(e.target.checked)} />
              <label htmlFor="anonymous" className="text-sm">Donate Anonymously (no name or email required)</label>
            </div>

            {!isAnonymous && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="name">Donor&apos;s Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input id="name" type="text" value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="Enter your full name" className="w-full border rounded px-3 py-2 pl-10" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="email">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input id="email" type="email" value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} placeholder="Enter your email" className="w-full border rounded px-3 py-2 pl-10" />
                  </div>
                </div>
              </>
            )}

            <div>
              <button onClick={() => { if (!project || !amount) { alert('Please select project and amount before paying.'); return;} setShowPayment(true); }} className="w-full bg-green-600 text-white rounded py-2 px-3">Donate Now</button>
            </div>
          </div>

          {showPayment && (
            <div className="mt-6 bg-white border rounded p-4">
              <h3 className="text-lg font-semibold mb-3">Select Payment Method</h3>
              <MarzpayPaymentFields
                name="donatePaymentMethod"
                value={paymentFields}
                onChange={(value) => {
                  setPaymentFields(value)
                  setFieldErrors({})
                }}
                errors={fieldErrors}
                onClearError={(field) => setFieldErrors(p => { const n = { ...p }; delete n[field]; return n })}
              />
              <div className="flex gap-2 mt-4">
                <button onClick={handleProceed} disabled={processing} className="bg-green-600 text-white rounded px-4 py-2 disabled:opacity-60">
                  {processing ? 'Processing…' : 'Proceed'}
                </button>
                <button onClick={() => setShowPayment(false)} className="border rounded px-4 py-2">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DonatePage;
