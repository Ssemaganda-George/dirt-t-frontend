import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Handshake, Users, TrendingUp, CheckCircle } from 'lucide-react';

const PartnerWithUs: React.FC = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    website: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    const { name, email, phone, company, website, message } = form;
    console.log('Form data:', { name, email, phone, company, website, message });

    if (!name || !email) {
      setError('Name and email are required.');
      setLoading(false);
      return;
    }

    try {
      console.log('Starting form submission...');
      console.log('Form data:', { name, email, phone, company, website, message });

      console.log('Attempting direct insert to partner_requests...');
      const { data, error } = await supabase.from('partner_requests').insert([
        { name, email, phone, company, website, message }
      ]);
      console.log('Insert response:', { data, error });

      if (error) {
        console.error('Insert error:', error);
        setError(`Failed to submit: ${error.message}`);
      } else {
        console.log('Submission successful!');
        setSuccess(true);
        setForm({ name: '', email: '', phone: '', company: '', website: '', message: '' });
      }
    } catch (err: any) {
      console.error('Exception during submission:', err);
      setError(`Failed to submit: ${err.message || 'Unknown error'}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <Handshake className="h-20 w-20 text-white mx-auto mb-6" />
            <h1 className="text-4xl font-black text-white mb-4 tracking-tight antialiased">Partner With Us</h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed antialiased">
              Join our network of trusted partners and grow your business with DirtTrails. Let's create exceptional experiences together.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Partnership Benefits */}
        <div className="bg-white shadow-sm border border-gray-200 p-8 mb-16">
          <h2 className="text-3xl font-black text-black mb-8 tracking-tight antialiased">Why Partner With DirtTrails?</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-black flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-black mb-4 tracking-tight antialiased">Expand Your Reach</h3>
              <p className="text-gray-700 leading-snug antialiased">Connect with thousands of travelers seeking authentic Ugandan experiences.</p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-black flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-black mb-4 tracking-tight antialiased">Grow Your Business</h3>
              <p className="text-gray-700 leading-snug antialiased">Increase bookings and revenue through our established platform.</p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-black flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-black mb-4 tracking-tight antialiased">Quality Assurance</h3>
              <p className="text-gray-700 leading-snug antialiased">Benefit from our quality standards and customer support network.</p>
            </div>
          </div>
        </div>

        {/* Partnership Form */}
        <div className="bg-white shadow-sm border border-gray-200 p-8">
          <h2 className="text-3xl font-black text-black mb-8 tracking-tight antialiased">Start Your Partnership</h2>

          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">Name *</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">Email *</label>
                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  type="email"
                  className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">Phone</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+256 XXX XXX XXX"
                  className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">Company</label>
                <input
                  name="company"
                  value={form.company}
                  onChange={handleChange}
                  placeholder="Your company name"
                  className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">Company Website</label>
              <input
                name="website"
                value={form.website}
                onChange={handleChange}
                placeholder="https://yourwebsite.com"
                className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">Tell us about your business</label>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                placeholder="Describe your services, location, and what makes your business special..."
                rows={6}
                className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg">
                Thank you for your interest! We will contact you soon.
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-black text-white py-4 px-8 rounded-lg font-bold text-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Partnership Application'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PartnerWithUs;
