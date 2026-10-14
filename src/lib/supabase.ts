import { createClient } from '@supabase/supabase-js'
import { validateAuthConfig } from './auth-config'

const config = validateAuthConfig(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)

export const supabase = config ? createClient(config.url, config.key, {
  auth: {
    flowType: 'pkce',
    storage: window.sessionStorage,
    detectSessionInUrl: true,
  },
}) : null
