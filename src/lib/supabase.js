import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

const missingConfigProxy = new Proxy({}, {
  get() { throw new Error('Supabase not configured — add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to environment variables') }
})

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : missingConfigProxy
