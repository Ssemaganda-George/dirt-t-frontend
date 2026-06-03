import { supabase } from '../lib/supabaseClient'
import type { Vendor } from '../types'

// Re-export the type alias used in database.ts
export type VendorStatus = 'pending' | 'approved' | 'rejected' | 'suspended'

export async function getAllVendors(): Promise<Vendor[]> {
  const { data: simpleData, error: simpleError } = await supabase
    .from('vendors')
    .select(`
      id,
      user_id,
      business_name,
      business_description,
      business_address,
      business_phone,
      business_email,
      status,
      created_at,
      updated_at,
      current_tier_id,
      current_commission_rate,
      manual_tier_id,
      manual_tier_assigned_at,
      manual_tier_expires_at,
      manual_tier_reason
    `)
    .order('created_at', { ascending: false })

  if (simpleError) {
    console.error('Error fetching vendors:', simpleError)
    throw simpleError
  }

  return (simpleData || []).map(vendor => ({
    ...vendor,
    business_website: undefined,
    business_type: undefined,
    operating_hours: undefined,
    years_in_business: undefined,
    business_license: undefined,
    tax_id: undefined,
    approved_at: undefined,
    approved_by: undefined,
    profiles: {
      id: vendor.user_id,
      full_name: vendor.business_name,
      email: vendor.business_email,
      phone: undefined
    }
  })) as Vendor[]
}

export async function getVendorById(vendorId: string): Promise<Vendor | null> {
  try {
    // First attempt: try joining profiles (may fail in some RLS/schema setups)
    const { data, error } = await supabase
      .from('vendors')
      .select(`
        *,
        profiles (
          id,
          full_name,
          email,
          phone
        )
      `)
      .eq('id', vendorId)
      .single()

    if (!error && data) {
      return data as Vendor
    }

    // Fallback: simple vendor select without joins (safer for strict RLS setups)
    console.warn('getVendorById: profiles join failed or returned no data, falling back to simple vendor select', error)
    const { data: simpleData, error: simpleError } = await supabase
      .from('vendors')
      .select('id, user_id, business_name, business_email, business_description, business_address, business_phone, status, created_at, updated_at, bank_details, mobile_money_accounts, preferred_payout')
      .eq('id', vendorId)
      .single()

    if (simpleError) {
      console.error('Error fetching vendor by id (simple fallback):', simpleError)
      throw simpleError
    }

    // Construct a Vendor-shaped object with a minimal profiles stub
    const vendor = {
      ...simpleData,
      profiles: {
        id: (simpleData as any)?.user_id,
        full_name: (simpleData as any)?.business_name,
        email: (simpleData as any)?.business_email,
        phone: undefined
      }
    } as Vendor

    return vendor
  } catch (error) {
    console.error('getVendorById error:', error)
    throw error
  }
}

export async function getVendorByUserId(userId: string): Promise<Vendor | null> {
  try {
    const { data, error } = await supabase
      .from('vendors')
      .select(`
        *,
        profiles (
          id,
          full_name,
          email,
          phone
        )
      `)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Error fetching vendor by user_id:', error)
      throw error
    }

    return data as Vendor
  } catch (error) {
    console.error('getVendorByUserId error:', error)
    throw error
  }
}

export async function updateVendorStatus(vendorId: string, status: VendorStatus): Promise<Vendor> {
  try {
    // Get current user for approved_by field
    const { data: { user } } = await supabase.auth.getUser();

    // Use atomic function to prevent race conditions
    const { data, error } = await supabase.rpc('update_vendor_status_atomic', {
      p_vendor_id: vendorId,
      p_status: status,
      p_approved_by: user?.id || null
    });

    if (error) throw error;

    if (!data.success) {
      throw new Error(data.error || 'Failed to update vendor status');
    }

    // Fetch the updated vendor with profile info
    const { data: updatedVendor, error: fetchError } = await supabase
      .from('vendors')
      .select(`
        *,
        profiles (
          id,
          full_name,
          email,
          phone
        )
      `)
      .eq('id', vendorId)
      .single();

    if (fetchError) throw fetchError;
    return updatedVendor;
  } catch (error) {
    console.error('Error updating vendor status:', error);
    throw error;
  }
}

