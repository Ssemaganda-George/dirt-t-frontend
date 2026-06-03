export interface PartnerRequest {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  website?: string;
  message?: string;
  status: string;
  created_at: string;
  type?: 'partner_request' | 'business_referral';
  referrer_name?: string;
  referrer_email?: string;
  referrer_phone?: string;
  contact_person?: string;
  business_location?: string;
}

export interface Partner {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  website?: string;
  description?: string;
  logo_url?: string;
  status: string;
  created_at: string;
  updated_at: string;
}
