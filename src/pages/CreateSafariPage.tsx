import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUnifiedInquiry } from '../lib/database';
import { validateSafariInquiry, sanitizeString } from '../lib/validation';
import { AlertCircle, CheckCircle } from 'lucide-react';

const COUNTRIES = [
  'Tanzania', 'Kenya', 'Uganda', 'Zanzibar', 'Rwanda'
];
const ACTIVITIES = [
  'Adventure Safaris', 'Mountain Climbing', 'Cultural / Eco Tours', 'Trekking / Walking',
  'Gorilla / Chimpanzee', 'Beach Holidays', 'Great Migration', 'Combined Safaris',
  'Special Safaris', 'Honeymoon Vacation', 'City Tours', 'Boat Safaris', 'Historical Sites',
  'Waterfalls', 'Fishing', 'Volunteering', 'Day Trips', 'Birding Tour'
];
const TRAVEL_WITH = [
  'Solo', 'Couple', 'Honeymoon', 'Family', 'Group', 'Others'
];

type SafariForm = {
  countries: string[];
  activities: string[];
  travelWith: string;
  days: string;
  budget: string;
  startDate: string;
  adults: number;
  children: number;
  rooms: number;
  fullName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  extraInfo: string;
};

export default function CreateSafariPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [form, setForm] = useState<SafariForm>({
    countries: [],
    activities: [],
    travelWith: '',
    days: '',
    budget: '',
    startDate: '',
    adults: 1,
    children: 0,
    rooms: 1,
    fullName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    extraInfo: ''
  });
  const handleChange = (field: keyof SafariForm, value: string | number) => setForm(f => ({ ...f, [field]: value }));
  const handleMultiSelect = (field: 'countries' | 'activities', value: string) => setForm(f => ({ ...f, [field]: f[field].includes(value) ? f[field].filter((v: string) => v !== value) : [...f[field], value] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);
    setSubmitting(true);

    try {
      // Validate input
      const validation = validateSafariInquiry({
        name: `${form.fullName} ${form.lastName}`.trim(),
        email: form.email,
        phone: form.phone,
        countries: form.countries,
        activities: form.activities
      });

      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        setSubmitting(false);
        return;
      }

      // Prepare safari-specific data
      const safariData = {
        countries: form.countries,
        activities: form.activities,
        travelWith: sanitizeString(form.travelWith),
        days: parseInt(form.days) || 1,
        budget: parseInt(form.budget) || 100,
        startDate: form.startDate,
        adults: form.adults,
        children: form.children,
        rooms: form.rooms,
        country: sanitizeString(form.country),
        extraInfo: sanitizeString(form.extraInfo)
      };

      // Submit to unified inquiry system
      await createUnifiedInquiry({
        inquiry_type: 'safari',
        name: sanitizeString(`${form.fullName} ${form.lastName}`.trim()),
        email: sanitizeString(form.email),
        phone: form.phone ? sanitizeString(form.phone) : undefined,
        message: form.extraInfo ? sanitizeString(form.extraInfo) : `Safari request: ${form.countries.join(', ')} - ${form.activities.join(', ')}`,
        preferred_date: form.startDate || undefined,
        number_of_guests: form.adults + form.children,
        safari_data: safariData,
        priority: 'normal',
        source: 'website'
      });

      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting safari request:', error);
      setValidationErrors(['An error occurred while submitting your request. Please try again.']);
    } finally {
      setSubmitting(false);
    }
  };

  // Success view
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-emerald-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center border border-gray-100">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-emerald-800 mb-4">Safari Request Submitted!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for your safari request! Our team will review your preferences and get back to you within 24 hours with personalized recommendations.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/')}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg py-3 font-semibold shadow transition"
            >
              Return to Home
            </button>
            <button
              onClick={() => {
                setSubmitted(false);
                setForm({
                  countries: [],
                  activities: [],
                  travelWith: '',
                  days: '',
                  budget: '',
                  startDate: '',
                  adults: 1,
                  children: 0,
                  rooms: 1,
                  fullName: '',
                  lastName: '',
                  email: '',
                  phone: '',
                  country: '',
                  extraInfo: ''
                });
              }}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg py-3 font-semibold transition"
            >
              Submit Another Request
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-emerald-50 flex flex-col">
      {/* Header removed as requested */}

      {/* Main Content */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-10">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-emerald-700 hover:underline text-sm font-medium">&larr; Back</button>
        <div className="bg-white/90 rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
          <h1 className="text-3xl font-bold mb-2 text-emerald-800">Create My Safari</h1>
          <div className="mb-8 text-gray-600">Fill out the form below and our team will help you plan your perfect safari adventure.</div>
          
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center mb-2">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <span className="font-medium text-red-800">Please fix the following errors:</span>
              </div>
              <ul className="list-disc list-inside text-sm text-red-700">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-7">
            <div>
              <label className="font-semibold">1. What country/countries do you want to visit?</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {COUNTRIES.map(c => (
                  <button type="button" key={c} onClick={() => handleMultiSelect('countries', c)} className={`px-3 py-1 rounded-full border transition-all duration-150 ${form.countries.includes(c) ? 'bg-emerald-600 text-white border-emerald-600 shadow' : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-400'}`}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="font-semibold">2. What do you want to do?</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {ACTIVITIES.map(a => (
                  <button type="button" key={a} onClick={() => handleMultiSelect('activities', a)} className={`px-3 py-1 rounded-full border transition-all duration-150 ${form.activities.includes(a) ? 'bg-emerald-600 text-white border-emerald-600 shadow' : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-400'}`}>{a}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="font-semibold">3. Who are you travelling with?</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {TRAVEL_WITH.map(t => (
                  <button type="button" key={t} onClick={() => handleChange('travelWith', t)} className={`px-3 py-1 rounded-full border transition-all duration-150 ${form.travelWith === t ? 'bg-emerald-600 text-white border-emerald-600 shadow' : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-400'}`}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="font-semibold">4. How many days do you want to travel?</label>
              <div className="flex items-center gap-4 mt-2">
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={form.days || 1}
                  onChange={e => handleChange('days', e.target.value)}
                  className="w-full accent-emerald-600"
                />
                <span className="w-16 text-right font-medium text-emerald-700">{form.days || 1} day{Number(form.days) > 1 ? 's' : ''}</span>
              </div>
            </div>
            <div>
              <label className="font-semibold">5. Do you have a budget per person in mind?</label>
              <div className="flex items-center gap-4 mt-2">
                <input
                  type="range"
                  min={100}
                  max={10000}
                  step={50}
                  value={form.budget ? Number(form.budget) : 100}
                  onChange={e => handleChange('budget', e.target.value)}
                  className="w-full accent-emerald-600"
                />
                <span className="w-28 text-right font-medium text-emerald-700">${form.budget || 100} per person</span>
              </div>
            </div>
            <div>
              <label className="font-semibold">6. When do you want to travel? / Number of People and Rooms?</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="block text-xs mb-1">Travel Start Date</label>
                  <input type="date" className="w-full border rounded px-3 py-2" value={form.startDate} onChange={e => handleChange('startDate', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs mb-1">Number of Adult/s</label>
                  <input type="number" min={1} className="w-full border rounded px-3 py-2" value={form.adults} onChange={e => handleChange('adults', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs mb-1">Number of Children</label>
                  <input type="number" min={0} className="w-full border rounded px-3 py-2" value={form.children} onChange={e => handleChange('children', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs mb-1">Number of Rooms</label>
                  <input type="number" min={1} className="w-full border rounded px-3 py-2" value={form.rooms} onChange={e => handleChange('rooms', e.target.value)} />
                </div>
              </div>
            </div>
            <div>
              <label className="font-semibold">7. Contact Details</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="block text-xs mb-1">First Name</label>
                  <input type="text" className="w-full border rounded px-3 py-2" value={form.fullName} onChange={e => handleChange('fullName', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs mb-1">Last Name</label>
                  <input type="text" className="w-full border rounded px-3 py-2" value={form.lastName} onChange={e => handleChange('lastName', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs mb-1">Email</label>
                  <input type="email" className="w-full border rounded px-3 py-2" value={form.email} onChange={e => handleChange('email', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs mb-1">Phone</label>
                  <input type="text" className="w-full border rounded px-3 py-2" value={form.phone} onChange={e => handleChange('phone', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs mb-1">Country</label>
                  <input type="text" className="w-full border rounded px-3 py-2" value={form.country} onChange={e => handleChange('country', e.target.value)} />
                </div>
              </div>
              <div className="mt-2">
                <label className="block text-xs mb-1">Extra Info</label>
                <textarea className="w-full border rounded px-3 py-2" rows={3} value={form.extraInfo} onChange={e => handleChange('extraInfo', e.target.value)} />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={submitting}
              className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg py-3 font-semibold shadow transition flex items-center justify-center"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                'Submit Safari Request'
              )}
            </button>
          </form>
          {/* Company Info Card restored below the form */}
          <div className="bg-white/80 rounded-xl shadow p-6 border border-gray-100 mt-8">
            <h2 className="text-xl font-bold mb-2 text-emerald-800">Dirt Trails</h2>
            <div className="mb-2 text-green-700 font-medium">Verified Email</div>
            <div className="mb-1">safaris.dirttrails@gmail.com</div>
            <div className="mb-2">Contact Phone: <span className="font-medium">+256 759 918 649</span></div>
            {/* <div className="mb-2">Mobile Phone: <span className="font-medium">+256 700 000 000</span></div> */}
            <div className="mb-2">Complete Basic Info <span className="text-green-600">Verified</span></div>
            <div className="mt-4 text-xs text-gray-500">Reservation Forms: Create My Safari, Hotel Booking, Safari Booking, Contacts Form, Subscriptions, Vehicle Booking, Flight Reservation, Coupons & Offers</div>
          </div>
        </div>
      </main>
    </div>
  );
}
