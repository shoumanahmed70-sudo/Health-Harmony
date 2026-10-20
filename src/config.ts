/**
 * Public browser configuration.
 *
 * These values are safe to ship to the browser: the project URL and the
 * publishable/anon key are protected by Row Level Security. NEVER put a
 * service-role key or the database password in this file.
 *
 * Render (and other hosts) can override these with VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY. If those build-time variables are absent in a
 * production build, the fallback below keeps the deployed store connected
 * instead of showing the "setup incomplete" screen. Development builds keep
 * using .env / the local demo backend.
 */
const PROD_FALLBACK_URL = 'https://pjtaxslzlcmfbeiislre.supabase.co'
const PROD_FALLBACK_KEY = 'sb_publishable_eUtaXH8Oj7NSUiZd8RQ70w_wDp3Ra96'

const envUrl = import.meta.env.VITE_SUPABASE_URL
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const SUPABASE_URL = envUrl || (import.meta.env.PROD ? PROD_FALLBACK_URL : '')
export const SUPABASE_ANON_KEY = envKey || (import.meta.env.PROD ? PROD_FALLBACK_KEY : '')
