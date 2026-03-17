import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-emerald-50 flex flex-col">
      {/* Header removed as requested */}

      {/* Main Content */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-10">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-emerald-700 hover:underline text-sm font-medium">&larr; Back</button>
        <div className="bg-white/90 rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
          <h1 className="text-3xl font-bold mb-2 text-emerald-800">Create My Safari</h1>
          <div className="mb-8 text-gray-600">Fill out the form below and our team will help you plan your perfect safari adventure.</div>
          <form className="space-y-7">
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
            <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg py-3 font-semibold shadow transition">Submit Safari Request</button>
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
