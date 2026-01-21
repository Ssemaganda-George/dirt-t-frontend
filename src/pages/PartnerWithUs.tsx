import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

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
    <div className="max-w-lg mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Partner With Us</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input name="name" value={form.name} onChange={handleChange} placeholder="Name*" className="w-full border p-2 rounded" required />
        <input name="email" value={form.email} onChange={handleChange} placeholder="Email*" className="w-full border p-2 rounded" required type="email" />
        <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" className="w-full border p-2 rounded" />
        <input name="company" value={form.company} onChange={handleChange} placeholder="Company" className="w-full border p-2 rounded" />
        <input name="website" value={form.website} onChange={handleChange} placeholder="Company Website" className="w-full border p-2 rounded" />
        <textarea name="message" value={form.message} onChange={handleChange} placeholder="Message" className="w-full border p-2 rounded" rows={4} />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm">Thank you for your interest! We will contact you soon.</div>}
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>{loading ? 'Submitting...' : 'Submit'}</button>
      </form>
    </div>
  );
};

export default PartnerWithUs;
