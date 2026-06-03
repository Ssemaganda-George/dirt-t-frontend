import { supabase } from '../lib/supabaseClient'
import { getSession } from '../services/AuthService'
import type { UserPreferences } from '../types'

export async function getUserPreferences(): Promise<UserPreferences | null> {
  try {
    const session = await getSession()
    if (!session) {
      console.warn('No active session for user preferences query')
      return null
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .single();

    if (error) {
      // If no preferences found, return null (not an error)
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Supabase error fetching user preferences:', error)
      throw error;
    }

    return data as UserPreferences;
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    throw error;
  }
}

export async function saveUserPreferences(userId: string, preferences: {
  region: string;
  currency: string;
  language: string;
}): Promise<UserPreferences> {
  try {
    // Use atomic function to prevent race conditions
    const { data, error } = await supabase.rpc('save_user_preferences_atomic', {
      p_user_id: userId,
      p_region: preferences.region,
      p_currency: preferences.currency,
      p_language: preferences.language
    });

    if (error) throw error;

    if (!data.success) {
      throw new Error(data.error || 'Failed to save user preferences');
    }

    // Fetch the updated preferences to return
    const { data: updatedPrefs, error: fetchError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError) throw fetchError;
    return updatedPrefs as UserPreferences;
  } catch (error) {
    console.error('Error saving user preferences:', error);
    throw error;
  }
}
