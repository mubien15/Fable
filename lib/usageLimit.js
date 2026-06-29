// ─── Server-side free-tier metering ──────────────────────────────────────
// Protects the Anthropic/OpenAI budget. Paid users are unlimited; free users
// get FREE_DAILY_LIMIT metered AI calls per day. Designed to FAIL OPEN on any
// infrastructure hiccup (auth/DB) so a metering outage never breaks practice —
// it only ever hard-blocks on the explicit over-limit case.
import { supabaseAdmin } from './supabaseAdmin'

const LIMIT = parseInt(process.env.FREE_DAILY_LIMIT || '100', 10)
const SESSION_LIMIT = parseInt(process.env.FREE_DAILY_SESSIONS || '5', 10)

function bearer(req) {
  return (req.headers.authorization || '').replace('Bearer ', '').trim()
}

async function userFromReq(req) {
  const token = bearer(req)
  if (!token) return { token: '', user: null, errored: false }
  try {
    const { data } = await supabaseAdmin.auth.getUser(token)
    return { token, user: data?.user || null, errored: false }
  } catch {
    return { token, user: null, errored: true }
  }
}

// Require a signed-in user, no metering. Used by the voice endpoints to stop
// anonymous abuse. Returns the user or null.
export async function requireUser(req) {
  const { user } = await userFromReq(req)
  return user
}

// Returns { ok:true, user } when the request may proceed, or
// { ok:false, status, body } when it must be rejected.
export async function enforceLimit(req) {
  const { token, user, errored } = await userFromReq(req)

  if (errored) return { ok: true, user: null }            // auth service hiccup → don't break
  if (!token)  return { ok: false, status: 401, body: { error: 'auth', message: 'Please sign in again.' } }
  if (!user)   return { ok: false, status: 401, body: { error: 'auth', message: 'Please sign in again.' } }

  // Paid users are unlimited.
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('tier').eq('id', user.id).maybeSingle()
    if (profile && profile.tier && profile.tier !== 'free') return { ok: true, user }
  } catch {
    return { ok: true, user }                              // metering read failed → fail open
  }

  // Free tier: atomically check-and-consume one unit for today (UTC).
  try {
    const today = new Date().toISOString().slice(0, 10)
    const { data: consumed, error } = await supabaseAdmin
      .rpc('try_consume', { p_user: user.id, p_day: today, p_limit: LIMIT })
    if (error) return { ok: true, user }                  // metering error → fail open
    if (consumed === false) {
      return {
        ok: false,
        status: 429,
        body: {
          error: 'daily_limit',
          message: "You've reached today's free practice limit. Upgrade for unlimited practice, or come back tomorrow.",
        },
      }
    }
  } catch {
    return { ok: true, user }
  }

  return { ok: true, user }
}

// Free-tier cap on how many practice sessions can be STARTED per day (default 5).
// Call this once when a new scenario session begins. Same fail-open posture.
export async function enforceSessionStart(req) {
  const { token, user, errored } = await userFromReq(req)

  if (errored) return { ok: true }
  if (!token || !user) return { ok: false, status: 401, body: { error: 'auth', message: 'Please sign in again.' } }

  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('tier').eq('id', user.id).maybeSingle()
    if (profile && profile.tier && profile.tier !== 'free') return { ok: true }
  } catch {
    return { ok: true }
  }

  try {
    const today = new Date().toISOString().slice(0, 10)
    const { data: consumed, error } = await supabaseAdmin
      .rpc('try_consume_session', { p_user: user.id, p_day: today, p_limit: SESSION_LIMIT })
    if (error) return { ok: true }
    if (consumed === false) {
      return {
        ok: false,
        status: 429,
        body: {
          error: 'daily_session_limit',
          message: `You've used your ${SESSION_LIMIT} free practice sessions for today. Upgrade for unlimited practice, or come back tomorrow.`,
        },
      }
    }
  } catch {
    return { ok: true }
  }

  return { ok: true }
}
