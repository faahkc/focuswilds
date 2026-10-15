import { createClient } from '@supabase/supabase-js'
import { validateAuthConfig } from './auth-config'

const config = validateAuthConfig(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)

// Keep development offline while the Firebase migration is in progress.
export const supabase = config && !import.meta.env.DEV ? createClient(config.url, config.key, {
  auth: {
    flowType: 'pkce',
    storage: window.sessionStorage,
    detectSessionInUrl: true,
  },
}) : null
