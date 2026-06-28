// ─── Authenticated fetch ─────────────────────────────────────────────────
// Drop-in replacement for fetch() on our own /api routes. Attaches the
// signed-in user's Supabase access token so the server can identify them
// (for the free-tier usage cap and to block anonymous abuse). Returns a
// normal Response, so callers can `await` it or chain `.then()` exactly like
// fetch.
import { supabase } from './supabaseClient'

export async function apiFetch(url, opts = {}) {
  let token = ''
  try {
    const { data } = await supabase.auth.getSession()
    token = data?.session?.access_token || ''
  } catch {
    // no session available — call goes out unauthenticated and the server decides
  }
  const headers = { ...(opts.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(url, { ...opts, headers })
}
