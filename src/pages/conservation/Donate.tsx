import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, DollarSign, Mail, User } from 'lucide-react';
import { usePreferences } from '../../contexts/PreferencesContext'
import { convertCurrency } from '../../lib/utils'
import { supabase } from '../../lib/supabaseClient'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const DonatePage = () => {
  const navigate = useNavigate();
  const [project, setProject] = useState('');
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const errors: { [key: string]: string } = {};
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mobile' | 'card' | ''>('');
  const [mobileProvider, setMobileProvider] = useState<'mtn' | 'airtel' | ''>('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // (Add Tree UI removed) no local tree state required here

  const projects = [
    { value: 'wildlife-protection', label: 'Wildlife Protection Fund' },
    { value: 'reforestation', label: 'Reforestation Initiatives' },
    { value: 'community-conservation', label: 'Community Conservation Programs' },
    { value: 'anti-poaching', label: 'Anti-Poaching Efforts' },
  ];

  const { selectedCurrency } = usePreferences()

  

  

  

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold mb-4">Offset Your Carbon Footprint</h1>
          <p className="text-muted-foreground">
            Donate to conservation projects that directly reduce carbon emissions and protect wildlife.
          </p>
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
              {errors.project && <p className="text-red-600 text-sm">{errors.project}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="amount">Donation Amount ({selectedCurrency})</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input id="amount" type="number" value={amount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)} placeholder="Enter amount" min={1} className="w-full border rounded px-3 py-2 pl-10" />
              </div>
              {errors.amount && <p className="text-red-600 text-sm">{errors.amount}</p>}
            </div>

            <div className="flex items-center gap-2">
              <input id="anonymous" type="checkbox" checked={isAnonymous} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsAnonymous(e.target.checked)} />
              <label htmlFor="anonymous" className="text-sm">Donate Anonymously (no name or email required)</label>
            </div>

            {!isAnonymous && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="name">Donor's Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input id="name" type="text" value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="Enter your full name" className="w-full border rounded px-3 py-2 pl-10" />
                  </div>
                  {errors.name && <p className="text-red-600 text-sm">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="email">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input id="email" type="email" value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} placeholder="Enter your email" className="w-full border rounded px-3 py-2 pl-10" />
                  </div>
                  {errors.email && <p className="text-red-600 text-sm">{errors.email}</p>}
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
              <div className="space-y-3">
                <div className="border p-3 rounded">
                  <label className="flex items-center gap-3">
                    <input type="radio" name="pm" checked={paymentMethod==='mobile'} onChange={() => setPaymentMethod('mobile')} />
                    <div>
                      <div className="font-medium">Mobile Money</div>
                      <div className="text-sm text-gray-600">Select provider to continue</div>
                    </div>
                    <div className="ml-auto text-sm text-gray-500">→</div>
                  </label>
                </div>

                {paymentMethod === 'mobile' && (
                  <div className="pl-3">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Provider</label>
                      <div className="flex gap-2">
                        <button className={`px-3 py-1 rounded ${mobileProvider==='mtn' ? 'bg-green-600 text-white' : 'border'}`} onClick={() => setMobileProvider('mtn')}>MTN</button>
                        <button className={`px-3 py-1 rounded ${mobileProvider==='airtel' ? 'bg-green-600 text-white' : 'border'}`} onClick={() => setMobileProvider('airtel')}>Airtel</button>
                      </div>
                      <label className="text-sm font-medium">Phone number</label>
                      <input value={phoneNumber} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhoneNumber(e.target.value)} placeholder="0712345678 or +256712345678" className="border rounded px-3 py-2" />
                    </div>
                  </div>
                )}

                <div className="border p-3 rounded">
                  <label className="flex items-center gap-3">
                    <input type="radio" name="pm" checked={paymentMethod==='card'} onChange={() => setPaymentMethod('card')} />
                    <div>
                      <div className="font-medium">Credit/Debit Card (coming soon)</div>
                      <div className="text-sm text-gray-600">VISA · AMEX · DISC</div>
                    </div>
                  </label>
                </div>

                <div className="flex gap-2 mt-3">
                  <button onClick={async () => {
                    if (paymentMethod === 'mobile') {
                      if (!mobileProvider || !phoneNumber) { alert('Choose provider and enter phone number'); return; }
                      if (!amount || Number(amount) <= 0) { alert('Enter a valid amount'); return }
                      const rawPhone = phoneNumber.trim().replace(/^\+256/, '')
                      const phone = rawPhone.startsWith('+') ? rawPhone : `+256${rawPhone.replace(/^0/, '')}`
                      if (!phone || phone.length < 10) { alert('Please enter a valid mobile money phone number (e.g. 0712345678 or +256712345678).'); return }

                      const orderId = `donate-${Date.now()}`
                      try {
                        const { data: session } = await supabase.auth.getSession()
                        // amount is provided by user in their selected currency; convert to UGX for MarzPay which uses UGX
                        const userCurrency = selectedCurrency || 'UGX'
                        const numericAmount = Number(amount || 0)
                        const amountInUGX = Math.round(convertCurrency(numericAmount, userCurrency, 'UGX'))

                        const collectRes = await fetch(`${supabaseUrl}/functions/v1/marzpay-collect`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${supabaseAnonKey}`,
                          },
                          body: JSON.stringify({
                            amount: amountInUGX,
                            phone_number: phone,
                            order_id: orderId,
                            description: `Donation to ${project || 'conservation'}`,
                            user_id: session?.session?.user?.id || undefined,
                          }),
                        })

                        const result = await collectRes.json().catch(() => ({}))
                        if (!collectRes.ok) {
                          const msg = result?.error || `Payment initiation failed (${collectRes.status})`
                          throw new Error(msg)
                        }
                        if (!result?.success || !result?.data?.reference) {
                          throw new Error(result?.error || 'Payment initiation failed')
                        }

                        const ref = result.data.reference
                        // Navigate to the payment page and include the reference so the payment page can start polling/subscription
                        navigate(`/checkout/${orderId}/payment?reference=${encodeURIComponent(ref)}`)
                      } catch (err) {
                        console.error('Donation payment initiation error:', err)
                        alert((err as Error).message || 'Payment initiation failed. Please try again.')
                      }
                    } else if (paymentMethod === 'card') {
                      alert('Card payments coming soon');
                    } else {
                      alert('Select a payment method');
                    }
                  }} className="bg-green-600 text-white rounded px-4 py-2">Proceed</button>
                  <button onClick={() => setShowPayment(false)} className="border rounded px-4 py-2">Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      

    </div>
  );
};

export default DonatePage;
