/**
 * Single entry point for Supabase Auth — pages and contexts should import from here,
 * not from supabaseClient directly.
 */
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import type { Profile, Vendor } from '../types'

export function getAuthStorageKey(): string {
  return `sb-${import.meta.env.VITE_SUPABASE_URL}-auth-token`
}

export function isEmailConfirmed(user: User): boolean {
  return Boolean((user as { email_confirmed_at?: string; confirmed_at?: string }).email_confirmed_at
    || (user as { confirmed_at?: string }).confirmed_at)
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session ?? null
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser()
  return user?.id ?? null
}

/** For MarzPay / edge calls — returns undefined when logged out. */
export async function getOptionalUserId(): Promise<string | undefined> {
  const session = await getSession()
  return session?.user?.id
}

export async function getAccessToken(): Promise<string | undefined> {
  const session = await getSession()
  return session?.access_token
}

export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signUpWithPassword(email: string, password: string) {
  return supabase.auth.signUp({ email, password })
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

export function clearLocalAuthStorage(): void {
  try {
    localStorage.removeItem(getAuthStorageKey())
  } catch {
    // ignore quota / private mode
  }
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  return supabase.auth.onAuthStateChange(callback)
}

export async function resetPasswordForEmail(email: string, redirectTo: string) {
  return supabase.auth.resetPasswordForEmail(email, { redirectTo })
}

export async function signInWithOtpPhone(phoneE164: string) {
  return supabase.auth.signInWithOtp({ phone: phoneE164 })
}

export async function signInWithOtpEmail(email: string) {
  return supabase.auth.signInWithOtp({ email })
}

export async function verifyPhoneOtp(phone: string, token: string) {
  return supabase.auth.verifyOtp({ phone, token, type: 'sms' })
}

export async function updateAuthUser(updates: { password?: string; email?: string }) {
  return supabase.auth.updateUser(updates)
}

export async function fetchProfileByUserId(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error || !data) return null
  return data as Profile
}

export async function fetchVendorByUserId(userId: string): Promise<Vendor | null> {
  const { data, error } = await supabase.from('vendors').select('*').eq('user_id', userId).single()
  if (error || !data) return null
  return data as Vendor
}

export async function fetchVendorByUserIdForPostVerify(userId: string): Promise<Vendor | null> {
  try {
    return await fetchVendorByUserId(userId)
  } catch {
    return null
  }
}

export async function updateProfileByUserId(userId: string, updates: Partial<Profile>): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data as Profile
}

export async function createUserProfileAtomic(params: {
  userId: string
  email: string
  firstName: string
  lastName: string
  role: string
  homeCity?: string | null
  homeCountry?: string | null
}) {
  return supabase.rpc('create_user_profile_atomic', {
    p_user_id: params.userId,
    p_email: params.email,
    p_first_name: params.firstName,
    p_last_name: params.lastName,
    p_role: params.role,
    p_home_city: params.homeCity ?? null,
    p_home_country: params.homeCountry ?? null,
  })
}

export async function createVendorProfileAtomic(userId: string) {
  return supabase.rpc('create_vendor_profile_atomic', {
    p_user_id: userId,
    p_business_name: '',
    p_status: 'pending',
  })
}

export async function upsertTouristOnSignup(userId: string, fullName: string) {
  return supabase.from('tourists').upsert({ user_id: userId, first_name: fullName }, { onConflict: 'user_id' })
}
