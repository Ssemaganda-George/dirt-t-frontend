import { supabase } from '../lib/supabaseClient'
import type { PartnerRequest, Partner } from '../types'

export async function submitPartnerRequest(data: {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  website?: string;
  message?: string;
}): Promise<void> {
  const { error } = await supabase
    .from('partner_requests')
    .insert([{ ...data }]);
  if (error) throw error;
}

export async function getPartnerRequests(): Promise<PartnerRequest[]> {
  const { data, error } = await supabase
    .from('partner_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as PartnerRequest[];
}

export async function updatePartnerRequestStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('partner_requests')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

export async function createBusinessReferral(referralData: {
  referrer_name: string;
  referrer_email: string;
  referrer_phone?: string;
  name: string; // business name
  email: string; // contact email
  phone?: string; // contact phone
  company?: string; // business name again
  contact_person?: string;
  business_location?: string;
  message?: string; // business description
}): Promise<PartnerRequest> {
  // For now, map the referral data to the existing table structure
  // The referrer information will be included in the message field
  const messageWithReferral = `
Business Referral Submitted

Referrer Information:
- Name: ${referralData.referrer_name}
- Email: ${referralData.referrer_email}
${referralData.referrer_phone ? `- Phone: ${referralData.referrer_phone}` : ''}

Business Information:
- Business Name: ${referralData.name}
- Location: ${referralData.business_location || 'Not specified'}
- Contact Person: ${referralData.contact_person || 'Not specified'}
- Contact Email: ${referralData.email}
${referralData.phone ? `- Contact Phone: ${referralData.phone}` : ''}

Business Description:
${referralData.message || 'No description provided'}

Submitted via DirtTrails referral form.
  `.trim();

  const { data, error } = await supabase
    .from('partner_requests')
    .insert([{
      name: referralData.name,
      email: referralData.email,
      phone: referralData.phone,
      company: referralData.company,
      message: messageWithReferral,
      status: 'pending',
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return data as PartnerRequest;
}

export async function getPartners(): Promise<Partner[]> {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Partner[];
}

export async function getActivePartners(): Promise<Partner[]> {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Partner[];
}

export async function addPartner(partner: Omit<Partner, 'id' | 'created_at' | 'updated_at'>): Promise<Partner> {
  const { data, error } = await supabase
    .from('partners')
    .insert([{ ...partner }])
    .select()
    .single();
  if (error) throw error;
  return data as Partner;
}

export async function updatePartner(id: string, updates: Partial<Omit<Partner, 'id' | 'created_at' | 'updated_at'>>): Promise<Partner> {
  const { data, error } = await supabase
    .from('partners')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Partner;
}

/**
 * Fetches the first admin profile's ID from the database.
 * Returns null if not found or on error.
 */
export async function getAdminProfileId(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single();
    if (error || !data) {
      console.error('Error fetching admin profile ID:', error);
      return null;
    }
    return data.id;
  } catch (err) {
    console.error('Exception fetching admin profile ID:', err);
    return null;
  }
}
