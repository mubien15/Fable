// ─── Supabase browser client ─────────────────────────────────────────────
// Single shared client for auth + per-user data. Uses the publishable
// (anon) key, which is safe in the browser because every table is protected
// by Row Level Security — a user can only ever read/write their own rows.
import { createClient } from '@supabase/supabase-js'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Guard so a missing env var fails loudly in dev rather than silently.
if (typeof window !== 'undefined' && (!url || !anon)) {
  // eslint-disable-next-line no-console
  console.error('[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
