import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { usePreferences } from '../contexts/PreferencesContext'

export default function CheckoutPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<any | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [allTicketTypes, setAllTicketTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [buyer, setBuyer] = useState({ name: '', surname: '', email: '', phone: '', countryCode: '+256', emailCopy: false })
  const [showAllTickets, setShowAllTickets] = useState(false)
  const { profile } = useAuth()
  const { selectedCurrency } = usePreferences()

  // Currency conversion rates (simplified)
  const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string): number => {
    const rates: { [key: string]: { [key: string]: number } } = {
      'UGX': { 'USD': 0.00027, 'EUR': 0.00025, 'GBP': 0.00021, 'ZAR': 0.005, 'KES': 0.027, 'TZS': 0.62, 'BRL': 0.0013, 'MXN': 0.0054, 'EGP': 0.0084, 'MAD': 0.0025, 'TRY': 0.0089, 'THB': 0.0095, 'KRW': 0.35, 'RUB': 0.025 },
      'USD': { 'UGX': 3700, 'EUR': 0.92, 'GBP': 0.79, 'ZAR': 18.5, 'KES': 100, 'TZS': 2300, 'BRL': 4.8, 'MXN': 20, 'EGP': 31, 'MAD': 9.2, 'TRY': 33, 'THB': 35, 'KRW': 1300, 'RUB': 92 },
      'EUR': { 'UGX': 4000, 'USD': 1.09, 'GBP': 0.86, 'ZAR': 20.1, 'KES': 109, 'TZS': 2500, 'BRL': 5.2, 'MXN': 21.8, 'EGP': 33.8, 'MAD': 10, 'TRY': 36, 'THB': 38, 'KRW': 1410, 'RUB': 100 },
      'GBP': { 'UGX': 4700, 'USD': 1.27, 'EUR': 1.16, 'ZAR': 23.4, 'KES': 127, 'TZS': 2900, 'BRL': 6.1, 'MXN': 25.5, 'EGP': 39.5, 'MAD': 11.7, 'TRY': 42, 'THB': 44.5, 'KRW': 1650, 'RUB': 117 },
      'ZAR': { 'UGX': 200, 'USD': 0.054, 'EUR': 0.050, 'GBP': 0.043, 'KES': 5.4, 'TZS': 124, 'BRL': 0.26, 'MXN': 1.08, 'EGP': 1.68, 'MAD': 0.50, 'TRY': 1.79, 'THB': 1.89, 'KRW': 70, 'RUB': 5.0 },
      'KES': { 'UGX': 37, 'USD': 0.01, 'EUR': 0.0092, 'GBP': 0.0079, 'ZAR': 0.185, 'TZS': 23, 'BRL': 0.048, 'MXN': 0.20, 'EGP': 0.31, 'MAD': 0.092, 'TRY': 0.33, 'THB': 0.35, 'KRW': 13, 'RUB': 0.92 },
      'TZS': { 'UGX': 1.61, 'USD': 0.00043, 'EUR': 0.0004, 'GBP': 0.00034, 'ZAR': 0.008, 'KES': 0.043, 'BRL': 0.0021, 'MXN': 0.0087, 'EGP': 0.0135, 'MAD': 0.004, 'TRY': 0.0143, 'THB': 0.0152, 'KRW': 0.565, 'RUB': 0.04 },
      'BRL': { 'UGX': 770, 'USD': 0.208, 'EUR': 0.192, 'GBP': 0.164, 'ZAR': 3.85, 'KES': 20.8, 'TZS': 476, 'MXN': 4.17, 'EGP': 6.46, 'MAD': 1.92, 'TRY': 6.88, 'THB': 7.29, 'KRW': 271, 'RUB': 19.2 },
      'MXN': { 'UGX': 185, 'USD': 0.05, 'EUR': 0.046, 'GBP': 0.039, 'ZAR': 0.926, 'KES': 5.0, 'TZS': 115, 'BRL': 0.24, 'EGP': 1.55, 'MAD': 0.46, 'TRY': 1.65, 'THB': 1.75, 'KRW': 65, 'RUB': 4.6 },
      'EGP': { 'UGX': 119, 'USD': 0.032, 'EUR': 0.030, 'GBP': 0.025, 'ZAR': 0.595, 'KES': 3.22, 'TZS': 74, 'BRL': 0.155, 'MXN': 0.645, 'MAD': 0.296, 'TRY': 1.06, 'THB': 1.13, 'KRW': 42, 'RUB': 2.96 },
      'MAD': { 'UGX': 400, 'USD': 0.109, 'EUR': 0.10, 'GBP': 0.085, 'ZAR': 2.0, 'KES': 10.9, 'TZS': 250, 'BRL': 0.52, 'MXN': 2.17, 'EGP': 3.38, 'TRY': 3.59, 'THB': 3.81, 'KRW': 142, 'RUB': 10.0 },
      'TRY': { 'UGX': 112, 'USD': 0.030, 'EUR': 0.028, 'GBP': 0.024, 'ZAR': 0.559, 'KES': 3.03, 'TZS': 70, 'BRL': 0.145, 'MXN': 0.606, 'EGP': 0.94, 'MAD': 0.279, 'THB': 0.296, 'KRW': 11, 'RUB': 0.78 },
      'THB': { 'UGX': 105, 'USD': 0.028, 'EUR': 0.026, 'GBP': 0.022, 'ZAR': 0.529, 'KES': 2.86, 'TZS': 66, 'BRL': 0.137, 'MXN': 0.571, 'EGP': 0.885, 'MAD': 0.262, 'TRY': 3.38, 'KRW': 10.5, 'RUB': 0.74 },
      'KRW': { 'UGX': 2.85, 'USD': 0.00077, 'EUR': 0.00071, 'GBP': 0.00061, 'ZAR': 0.0143, 'KES': 0.077, 'TZS': 1.77, 'BRL': 0.0037, 'MXN': 0.0154, 'EGP': 0.0238, 'MAD': 0.007, 'TRY': 0.090, 'THB': 0.095, 'RUB': 0.0067 },
      'RUB': { 'UGX': 40, 'USD': 0.011, 'EUR': 0.01, 'GBP': 0.0085, 'ZAR': 0.20, 'KES': 1.09, 'TZS': 25, 'BRL': 0.052, 'MXN': 0.217, 'EGP': 0.337, 'MAD': 0.10, 'TRY': 1.28, 'THB': 1.35, 'KRW': 50 }
    };

    if (rates[fromCurrency] && rates[fromCurrency][toCurrency]) {
      return amount * rates[fromCurrency][toCurrency];
    }
    return amount;
  }

  const formatAmount = (amount: number, currency: string): string => {
    const validCurrencies = ['UGX', 'USD', 'EUR', 'GBP', 'KES', 'TZS', 'RWF', 'ZAR', 'CAD', 'AUD', 'NZD', 'CHF', 'SEK', 'NOK', 'DKK', 'JPY', 'CNY', 'INR', 'BRL', 'MXN', 'ARS', 'CLP', 'PEN', 'COP', 'EGP', 'MAD', 'TRY', 'THB', 'KRW', 'RUB'];
    const safeCurrency = validCurrencies.includes(currency) ? currency : 'UGX';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: safeCurrency,
      minimumFractionDigits: 0
    }).format(amount);
  }

  // Create a formatCurrency function that uses user preferences
  const formatCurrencyWithConversion = (amount: number, serviceCurrency: string) => {
    try {
      // Use user's selected currency preference
      const userCurrency = selectedCurrency || 'UGX';

      // If user's currency matches service currency, no conversion needed
      if (userCurrency === serviceCurrency) {
        return formatAmount(amount, userCurrency);
      }

      // Convert amount to user's currency
      const convertedAmount = convertCurrency(amount, serviceCurrency, userCurrency);

      return formatAmount(convertedAmount, userCurrency);
    } catch (error) {
      // Fallback to original service currency
      console.warn('Currency conversion failed, using original currency:', error);
      return formatAmount(amount, serviceCurrency);
    }
  }

  useEffect(() => {
    const load = async () => {
      if (!orderId) return
      setLoading(true)
      try {
        const { data: o } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle()
        setOrder(o)

        // Load order items
        const { data: its } = await supabase.from('order_items').select('*').eq('order_id', orderId)
        const itemsData = its || []

        // Fetch ALL ticket_type records for this service so we can show available tickets
        let allTicketTypes: any[] = []
        let serviceForOrder: any = null
        if (itemsData.length > 0) {
          const ticketTypeIds = itemsData.map((it: any) => it.ticket_type_id)
          const { data: tts } = await supabase.from('ticket_types').select('*').in('id', ticketTypeIds)
          const ttMap: any = {};
          (tts || []).forEach((t: any) => { ttMap[t.id] = t })

          // attach ticket_type objects to items for display
          itemsData.forEach((it: any) => { it.ticket_type = ttMap[it.ticket_type_id] || null })

          // choose representative service from the first ticket_type that has a service_id
          const firstWithService = (tts || []).find((t: any) => t && t.service_id)
          if (firstWithService && firstWithService.service_id) {
            const { data: svc } = await supabase.from('services').select('*').eq('id', firstWithService.service_id).maybeSingle()
            serviceForOrder = svc || null

            // Fetch ALL ticket types for this service
            const { data: allTts } = await supabase.from('ticket_types').select('*').eq('service_id', firstWithService.service_id)
            allTicketTypes = allTts || []
          }
        }

        setItems(itemsData)
        setAllTicketTypes(allTicketTypes)
        // Prefill buyer information from logged-in profile if available and buyer fields are empty
        if (profile) {
          setBuyer(b => ({
            name: b.name || profile.full_name || '',
            surname: b.surname || '',
            email: b.email || profile.email || '',
            phone: b.phone || (profile as any).phone || '',
            countryCode: b.countryCode || '+256',
            emailCopy: b.emailCopy || false
          }))
        }

        // attach representative service to order object for quick access in the UI
        if (o) setOrder({ ...o, _service: serviceForOrder })
      } catch (err) {
        console.error('Failed to load order:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orderId, profile])

  const updateTicketQuantity = async (ticketTypeId: string, newQuantity: number) => {
    if (newQuantity < 0 || !orderId) return
    
    try {
      // Find existing order item for this ticket type
      const existingItem = items.find(item => item.ticket_type_id === ticketTypeId)
      
      if (existingItem) {
        // Update existing item
        if (newQuantity === 0) {
          // Remove item if quantity is 0
          const { error } = await supabase
            .from('order_items')
            .delete()
            .eq('id', existingItem.id)

          if (error) throw error

          // Update local state
          setItems(prev => prev.filter(item => item.id !== existingItem.id))
        } else {
          // Update quantity
          const { error } = await supabase
            .from('order_items')
            .update({ quantity: newQuantity })
            .eq('id', existingItem.id)

          if (error) throw error

          // Update local state
          setItems(prev => prev.map(item => 
            item.id === existingItem.id ? { ...item, quantity: newQuantity } : item
          ))
        }
      } else if (newQuantity > 0) {
        // Add new item
        const { data: newItem, error } = await supabase
          .from('order_items')
          .insert({
            order_id: orderId,
            ticket_type_id: ticketTypeId,
            quantity: newQuantity,
            unit_price: allTicketTypes.find(tt => tt.id === ticketTypeId)?.price || 0
          })
          .select()
          .single()

        if (error) throw error

        // Add ticket_type info to the new item
        const ticketType = allTicketTypes.find(tt => tt.id === ticketTypeId)
        const itemWithType = { ...newItem, ticket_type: ticketType }

        // Update local state
        setItems(prev => [...prev, itemWithType])
      }

      // Recalculate order total
      const updatedItems = items
        .filter(item => item.ticket_type_id !== ticketTypeId || (existingItem && item.id === existingItem.id))
        .map(item => {
          if (item.ticket_type_id === ticketTypeId) {
            return { ...item, quantity: newQuantity }
          }
          return item
        })
        .filter(item => item.quantity > 0)
      
      // Add new item if it was just created
      if (!existingItem && newQuantity > 0) {
        const ticketType = allTicketTypes.find(tt => tt.id === ticketTypeId)
        updatedItems.push({
          ticket_type_id: ticketTypeId,
          quantity: newQuantity,
          unit_price: ticketType?.price || 0,
          ticket_type: ticketType
        })
      }
      
      const newTotal = updatedItems.reduce((sum, item) => sum + (Number(item.unit_price) * item.quantity), 0)
      
      setOrder((prev: any) => prev ? { ...prev, total_amount: newTotal } : null)
    } catch (err) {
      console.error('Failed to update ticket quantity:', err)
      alert('Failed to update ticket quantity. Please try again.')
    }
  }

  if (loading) return <div className="p-6">Loading order…</div>
  if (!order) return <div className="p-6">Order not found</div>

  return (
    <div className="min-h-screen flex items-start justify-center p-6 bg-gray-50">
      {/* Modal-like centered container */}
      <div className="w-full max-w-6xl bg-white rounded-lg shadow-lg overflow-hidden" style={{ maxHeight: '92vh' }}>
        {/* Progress Header */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Checkout</h2>
            <div>
              <button onClick={() => navigate(-1)} className="text-sm text-gray-600 hover:text-gray-900">Close</button>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs">1</div>
              <div className="text-sm text-gray-600">TICKETS</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#61B82C] text-white flex items-center justify-center text-xs">2</div>
              <div className="text-sm font-medium text-[#61B82C]">DETAILS</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs">3</div>
              <div className="text-sm text-gray-400">PAYMENT</div>
            </div>
          </div>
        </div>

        {/* Content area: two-column on md+ */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 px-6 py-6 overflow-auto">
          {/* Left: form & actions (span 3 cols on md) */}
          <div className="md:col-span-3 space-y-4">
            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-medium text-lg">Buyer Information</h3>
              <div className="grid grid-cols-1 gap-4 mt-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First name *</label>
                    <input className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[#61B82C] focus:border-transparent" value={buyer.name} onChange={(e) => setBuyer(s => ({ ...s, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Surname *</label>
                    <input className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[#61B82C] focus:border-transparent" value={buyer.surname} onChange={(e) => setBuyer(s => ({ ...s, surname: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[#61B82C] focus:border-transparent" value={buyer.email} onChange={(e) => setBuyer(s => ({ ...s, email: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cellphone</label>
                  <div className="flex gap-2">
                    <select 
                      className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[#61B82C] focus:border-transparent bg-white min-w-[120px]"
                      value={buyer.countryCode} 
                      onChange={(e) => setBuyer(s => ({ ...s, countryCode: e.target.value }))}
                    >
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+7">🇷🇺 +7</option>
                      <option value="+20">🇪🇬 +20</option>
                      <option value="+27">🇿🇦 +27</option>
                      <option value="+30">🇬🇷 +30</option>
                      <option value="+31">🇳🇱 +31</option>
                      <option value="+32">🇧🇪 +32</option>
                      <option value="+33">🇫🇷 +33</option>
                      <option value="+34">🇪🇸 +34</option>
                      <option value="+36">🇭🇺 +36</option>
                      <option value="+39">🇮🇹 +39</option>
                      <option value="+40">🇷🇴 +40</option>
                      <option value="+41">🇨🇭 +41</option>
                      <option value="+43">🇦🇹 +43</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+45">🇩🇰 +45</option>
                      <option value="+46">🇸🇪 +46</option>
                      <option value="+47">🇳🇴 +47</option>
                      <option value="+48">🇵🇱 +48</option>
                      <option value="+49">🇩🇪 +49</option>
                      <option value="+51">🇵🇪 +51</option>
                      <option value="+52">🇲🇽 +52</option>
                      <option value="+53">🇨🇺 +53</option>
                      <option value="+54">🇦🇷 +54</option>
                      <option value="+55">🇧🇷 +55</option>
                      <option value="+56">🇨🇱 +56</option>
                      <option value="+57">🇨🇴 +57</option>
                      <option value="+58">🇻🇪 +58</option>
                      <option value="+60">🇲🇾 +60</option>
                      <option value="+61">🇦🇺 +61</option>
                      <option value="+62">🇮🇩 +62</option>
                      <option value="+63">🇵🇭 +63</option>
                      <option value="+64">🇳🇿 +64</option>
                      <option value="+65">🇸🇬 +65</option>
                      <option value="+66">🇹🇭 +66</option>
                      <option value="+81">🇯🇵 +81</option>
                      <option value="+82">🇰🇷 +82</option>
                      <option value="+84">🇻🇳 +84</option>
                      <option value="+86">🇨🇳 +86</option>
                      <option value="+90">🇹🇷 +90</option>
                      <option value="+91">🇮🇳 +91</option>
                      <option value="+92">🇵🇰 +92</option>
                      <option value="+93">🇦🇫 +93</option>
                      <option value="+94">🇱🇰 +94</option>
                      <option value="+95">🇲🇲 +95</option>
                      <option value="+98">🇮🇷 +98</option>
                      <option value="+211">🇸🇸 +211</option>
                      <option value="+212">🇲🇦 +212</option>
                      <option value="+213">🇩🇿 +213</option>
                      <option value="+216">🇹🇳 +216</option>
                      <option value="+218">🇱🇾 +218</option>
                      <option value="+220">🇬🇲 +220</option>
                      <option value="+221">🇸🇳 +221</option>
                      <option value="+222">🇲🇷 +222</option>
                      <option value="+223">🇲🇱 +223</option>
                      <option value="+224">🇬🇳 +224</option>
                      <option value="+225">🇨🇮 +225</option>
                      <option value="+226">🇧🇫 +226</option>
                      <option value="+227">🇳🇪 +227</option>
                      <option value="+228">🇹🇬 +228</option>
                      <option value="+229">🇧🇯 +229</option>
                      <option value="+230">🇲🇺 +230</option>
                      <option value="+231">🇱🇷 +231</option>
                      <option value="+232">🇸🇱 +232</option>
                      <option value="+233">🇬🇭 +233</option>
                      <option value="+234">🇳🇬 +234</option>
                      <option value="+235">🇹🇩 +235</option>
                      <option value="+236">🇨🇫 +236</option>
                      <option value="+237">🇨🇲 +237</option>
                      <option value="+238">🇨🇻 +238</option>
                      <option value="+239">🇸🇹 +239</option>
                      <option value="+240">🇬🇶 +240</option>
                      <option value="+241">🇬🇦 +241</option>
                      <option value="+242">🇨🇬 +242</option>
                      <option value="+243">🇨🇩 +243</option>
                      <option value="+244">🇦🇴 +244</option>
                      <option value="+245">🇬🇼 +245</option>
                      <option value="+246">🇮🇴 +246</option>
                      <option value="+247">🇦🇨 +247</option>
                      <option value="+248">🇸🇨 +248</option>
                      <option value="+249">🇸🇩 +249</option>
                      <option value="+250">🇷🇼 +250</option>
                      <option value="+251">🇪🇹 +251</option>
                      <option value="+252">🇸🇴 +252</option>
                      <option value="+253">🇩🇯 +253</option>
                      <option value="+254">🇰🇪 +254</option>
                      <option value="+255">🇹🇿 +255</option>
                      <option value="+256">🇺🇬 +256</option>
                      <option value="+257">🇧🇮 +257</option>
                      <option value="+258">🇲🇿 +258</option>
                      <option value="+260">🇿🇲 +260</option>
                      <option value="+261">🇲🇬 +261</option>
                      <option value="+262">🇷🇪 +262</option>
                      <option value="+263">🇿🇼 +263</option>
                      <option value="+264">🇳🇦 +264</option>
                      <option value="+265">🇲🇼 +265</option>
                      <option value="+266">🇱🇸 +266</option>
                      <option value="+267">🇧🇼 +267</option>
                      <option value="+268">🇸🇿 +268</option>
                      <option value="+269">🇰🇲 +269</option>
                      <option value="+290">🇸🇭 +290</option>
                      <option value="+291">🇪🇷 +291</option>
                      <option value="+297">🇦🇼 +297</option>
                      <option value="+298">🇫🇴 +298</option>
                      <option value="+299">🇬🇱 +299</option>
                      <option value="+350">🇬🇮 +350</option>
                      <option value="+351">🇵🇹 +351</option>
                      <option value="+352">🇱🇺 +352</option>
                      <option value="+353">🇮🇪 +353</option>
                      <option value="+354">🇮🇸 +354</option>
                      <option value="+355">🇦🇱 +355</option>
                      <option value="+356">🇲🇹 +356</option>
                      <option value="+357">🇨🇾 +357</option>
                      <option value="+358">🇫🇮 +358</option>
                      <option value="+359">🇧🇬 +359</option>
                      <option value="+370">🇱🇹 +370</option>
                      <option value="+371">🇱🇻 +371</option>
                      <option value="+372">🇪🇪 +372</option>
                      <option value="+373">🇲🇩 +373</option>
                      <option value="+374">🇦🇲 +374</option>
                      <option value="+375">🇧🇾 +375</option>
                      <option value="+376">🇦🇩 +376</option>
                      <option value="+377">🇲🇨 +377</option>
                      <option value="+378">🇸🇲 +378</option>
                      <option value="+380">🇺🇦 +380</option>
                      <option value="+381">🇷🇸 +381</option>
                      <option value="+382">🇲🇪 +382</option>
                      <option value="+383">🇽🇰 +383</option>
                      <option value="+385">🇭🇷 +385</option>
                      <option value="+386">🇸🇮 +386</option>
                      <option value="+387">🇧🇦 +387</option>
                      <option value="+389">🇲🇰 +389</option>
                      <option value="+420">🇨🇿 +420</option>
                      <option value="+421">🇸🇰 +421</option>
                      <option value="+423">🇱🇮 +423</option>
                      <option value="+500">🇫🇰 +500</option>
                      <option value="+501">🇧🇿 +501</option>
                      <option value="+502">🇬🇹 +502</option>
                      <option value="+503">🇸🇻 +503</option>
                      <option value="+504">🇭🇳 +504</option>
                      <option value="+505">🇳🇮 +505</option>
                      <option value="+506">🇨🇷 +506</option>
                      <option value="+507">🇵🇦 +507</option>
                      <option value="+508">🇵🇲 +508</option>
                      <option value="+509">🇭🇹 +509</option>
                      <option value="+590">🇬🇵 +590</option>
                      <option value="+591">🇧🇴 +591</option>
                      <option value="+592">🇬🇾 +592</option>
                      <option value="+593">🇪🇨 +593</option>
                      <option value="+594">🇬🇫 +594</option>
                      <option value="+595">🇵🇾 +595</option>
                      <option value="+596">🇲🇶 +596</option>
                      <option value="+597">🇸🇷 +597</option>
                      <option value="+598">🇺🇾 +598</option>
                      <option value="+599">🇨🇼 +599</option>
                      <option value="+670">🇹🇱 +670</option>
                      <option value="+672">🇦🇶 +672</option>
                      <option value="+673">🇧🇳 +673</option>
                      <option value="+674">🇳🇷 +674</option>
                      <option value="+675">🇵🇬 +675</option>
                      <option value="+676">🇹🇴 +676</option>
                      <option value="+677">🇸🇧 +677</option>
                      <option value="+678">🇻🇺 +678</option>
                      <option value="+679">🇫🇯 +679</option>
                      <option value="+680">🇵🇼 +680</option>
                      <option value="+681">🇼🇫 +681</option>
                      <option value="+682">🇨🇰 +682</option>
                      <option value="+683">🇳🇺 +683</option>
                      <option value="+684">🇦🇸 +684</option>
                      <option value="+685">🇼🇸 +685</option>
                      <option value="+686">🇰🇮 +686</option>
                      <option value="+687">🇳🇨 +687</option>
                      <option value="+688">🇹🇻 +688</option>
                      <option value="+689">🇵🇫 +689</option>
                      <option value="+690">🇹🇰 +690</option>
                      <option value="+691">🇫🇲 +691</option>
                      <option value="+692">🇲🇭 +692</option>
                      <option value="+850">🇰🇵 +850</option>
                      <option value="+852">🇭🇰 +852</option>
                      <option value="+853">🇲🇴 +853</option>
                      <option value="+855">🇰🇭 +855</option>
                      <option value="+856">🇱🇦 +856</option>
                      <option value="+880">🇧🇩 +880</option>
                      <option value="+886">🇹🇼 +886</option>
                      <option value="+960">🇲🇻 +960</option>
                      <option value="+961">🇱🇧 +961</option>
                      <option value="+962">🇯🇴 +962</option>
                      <option value="+963">🇸🇾 +963</option>
                      <option value="+964">🇮🇶 +964</option>
                      <option value="+965">🇰🇼 +965</option>
                      <option value="+966">🇸🇦 +966</option>
                      <option value="+967">🇾🇪 +967</option>
                      <option value="+968">🇴🇲 +968</option>
                      <option value="+970">🇵🇸 +970</option>
                      <option value="+971">🇦🇪 +971</option>
                      <option value="+972">🇮🇱 +972</option>
                      <option value="+973">🇧🇭 +973</option>
                      <option value="+974">🇶🇦 +974</option>
                      <option value="+975">🇧🇹 +975</option>
                      <option value="+976">🇲🇳 +976</option>
                      <option value="+977">🇳🇵 +977</option>
                      <option value="+992">🇹🇯 +992</option>
                      <option value="+993">🇹🇲 +993</option>
                      <option value="+994">🇦🇿 +994</option>
                      <option value="+995">🇬🇪 +995</option>
                      <option value="+996">🇰🇬 +996</option>
                      <option value="+998">🇺🇿 +998</option>
                    </select>
                    <input 
                      className="flex-1 border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[#61B82C] focus:border-transparent" 
                      value={buyer.phone} 
                      onChange={(e) => setBuyer(s => ({ ...s, phone: e.target.value }))} 
                      placeholder="759 918649"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="emailCopy" checked={buyer.emailCopy} onChange={(e) => setBuyer(s => ({ ...s, emailCopy: e.target.checked }))} className="rounded" />
                  <label htmlFor="emailCopy" className="text-sm text-gray-700">Email this ticket holder a copy of this ticket</label>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-medium text-lg mb-2">Payment</h3>
              <div className="mt-4 flex items-center gap-3">
                <button 
                  onClick={() => navigate(`/checkout/${orderId}/payment`)} 
                  style={{ backgroundColor: '#61B82C' }} 
                  className="text-white px-4 py-2 rounded hover:opacity-90"
                >
                  Next
                </button>
                <button onClick={() => navigate(-1)} className="bg-gray-100 px-4 py-2 rounded">Back</button>
              </div>
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="md:col-span-2">
            <div className="sticky top-6 space-y-4">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="font-semibold text-lg mb-4">Order Summary</h3>
                <div>
                  {/* Event sticker and basic event info */}
                  <div className="flex items-center gap-4 mb-6">
                    {order._service?.images?.[0] ? (
                      <img src={order._service.images[0]} alt={order._service.title} className="w-24 h-24 object-cover rounded-lg shadow-sm" />
                    ) : (
                      <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-sm text-gray-500">Sticker</div>
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-lg">{order._service?.title || 'Event'}</div>
                      <div className="text-sm text-gray-600 mt-1">Order #{order.reference || `#${(order.id || '').toString().slice(0,8)}`}</div>
                      {order._service?.event_datetime && (
                        <div className="text-sm text-gray-600">
                          📅 {new Date(order._service.event_datetime).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      )}
                      <div className="text-sm text-gray-600">📍 {order._service?.event_location || order._service?.location || 'Venue'}</div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-3">
                      <div className="text-sm font-medium text-gray-700">Tickets</div>
                      {!showAllTickets && (
                        <button 
                          onClick={() => setShowAllTickets(true)}
                          className="text-[#61B82C] hover:text-[#4a8f23] text-sm font-medium underline transition-colors"
                        >
                          Edit Order
                        </button>
                      )}
                      {showAllTickets && (
                        <button 
                          onClick={() => setShowAllTickets(false)}
                          className="text-gray-600 hover:text-gray-800 text-sm font-medium underline transition-colors"
                        >
                          Done Editing
                        </button>
                      )}
                    </div>
                    <div className="space-y-3 mb-6">
                      {allTicketTypes
                        .filter(ticketType => showAllTickets || items.some(item => item.ticket_type_id === ticketType.id && item.quantity > 0))
                        .map((ticketType: any) => {
                        const existingItem = items.find(item => item.ticket_type_id === ticketType.id)
                        const quantity = existingItem?.quantity || 0
                        
                        return (
                          <div key={ticketType.id} className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg">
                            <div className="text-sm flex-1">
                              <div className="font-medium">{ticketType.title}</div>
                              <div className="text-xs text-gray-500">{formatCurrencyWithConversion(ticketType.price, order.currency)} each</div>
                            </div>
                            <div className="flex items-center gap-2">
                              {showAllTickets ? (
                                <>
                                  <button 
                                    onClick={() => updateTicketQuantity(ticketType.id, quantity - 1)}
                                    className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm font-medium transition-colors disabled:opacity-50"
                                    disabled={quantity <= 0}
                                  >
                                    -
                                  </button>
                                  <span className="text-sm font-medium min-w-[20px] text-center">{quantity}</span>
                                  <button 
                                    onClick={() => updateTicketQuantity(ticketType.id, quantity + 1)}
                                    className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm font-medium transition-colors"
                                  >
                                    +
                                  </button>
                                </>
                              ) : (
                                <span className="text-sm font-medium">{quantity}</span>
                              )}
                            </div>
                            <div className="text-sm font-medium ml-4">{formatCurrencyWithConversion(ticketType.price * quantity, order.currency)}</div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="border-t pt-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <div>Total Tickets</div>
                        <div className="font-medium">{items.reduce((s, it) => s + Number(it.quantity || 0), 0)}</div>
                      </div>

                      <div className="flex justify-between text-sm">
                        <div>Subtotal</div>
                        <div className="font-medium">{formatCurrencyWithConversion(Number(order.total_amount || 0), order.currency)}</div>
                      </div>

                      <div className="flex justify-between text-sm">
                        <div>Service Fees</div>
                        <div className="font-medium">{formatCurrencyWithConversion(Math.max(1000, Math.round(Number(order.total_amount || 0) * 0.01)), order.currency)}</div>
                      </div>

                      <div className="flex justify-between text-lg font-bold mt-4 pt-3 border-t">
                        <div>Total</div>
                        <div>{formatCurrencyWithConversion(Number(order.total_amount || 0) + Math.max(1000, Math.round(Number(order.total_amount || 0) * 0.01)), order.currency)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
