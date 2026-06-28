// ─── Supabase admin (server-only) ────────────────────────────────────────
// Uses the service-role key to write rows the user can't (e.g. the Stripe
// webhook flipping a profile's tier). NEVER import this into client code — the
// service key bypasses Row Level Security.
import { createClient } from '@supabase/supabase-js'

const url        = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
