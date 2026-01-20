import { createClient } from '@supabase/supabase-js'


// Support both Vite/browser and Node.js (scripts)

let supabaseUrl: string | undefined;
let supabaseKey: string | undefined;

if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) {
  // Browser/Vite: use anon key
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
} else if (typeof process !== 'undefined' && process.env) {
  // Node.js: prefer service role key for scripts
  if (!process.env.VITE_SUPABASE_URL && !process.env.SUPABASE_URL) {
    try {
      require('dotenv').config();
    } catch (e) {}
  }
  supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
}

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase credentials are not set in environment variables.');
}



export const supabase = createClient(supabaseUrl, supabaseKey)
