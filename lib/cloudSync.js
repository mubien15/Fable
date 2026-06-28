// ─── Per-user cloud data sync ─────────────────────────────────────────────
// Strategy: localStorage stays the app's working store (so none of the app's
// data logic changes), and we mirror it to a single JSON document in Supabase
// (`user_state.data`). On login we hydrate localStorage from the cloud; on
// every write we debounce-push the whole document back up. RLS guarantees a
// user can only read/write their own row.
import { supabase } from './supabaseClient'

// Every localStorage key whose value belongs to the user's account.
export const SYNCED_KEYS = [
  'fable_user',
  'fable_sessions',
  'fable_daily_rep',
  'completedScenarios',
  'fable_completed_data',
  'fable_prefs',
  'fable_storylab',
  'fable_rehearsals',
]

let userId = null
let pushTimer = null

export function setSyncUser(id) { userId = id }

export function clearSyncUser() {
  userId = null
  if (pushTimer) { clearTimeout(pushTimer); pushTimer = null }
}

// Remove all synced data from this browser — called on logout so the next
// account on the same device never inherits the previous user's data.
export function clearLocalData() {
  for (const k of SYNCED_KEYS) {
    try { localStorage.removeItem(k) } catch {}
  }
}

// Pull the cloud document into localStorage. If the cloud is empty but this
// browser already has data (e.g. a beta tester's pre-account trial), adopt the
// local data into the account instead of wiping it.
export async function hydrateFromCloud(id) {
  userId = id
  let cloud = {}
  try {
    const { data } = await supabase
      .from('user_state').select('data').eq('user_id', id).maybeSingle()
    cloud = (data && data.data) || {}
  } catch {}

  const cloudHasData = cloud && Object.keys(cloud).length > 0
  if (cloudHasData) {
    // Cloud is the source of truth — mirror it down exactly.
    for (const k of SYNCED_KEYS) {
      try {
        if (cloud[k] !== undefined) localStorage.setItem(k, JSON.stringify(cloud[k]))
        else localStorage.removeItem(k)
      } catch {}
    }
  } else {
    // First time on the cloud — adopt whatever is already local.
    const localHasData = SYNCED_KEYS.some((k) => {
      try { return localStorage.getItem(k) != null } catch { return false }
    })
    if (localHasData) await pushNow()
  }
}

export function schedulePush() {
  if (!userId) return
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => { pushNow() }, 1200)
}

export async function pushNow() {
  if (!userId) return
  if (pushTimer) { clearTimeout(pushTimer); pushTimer = null }
  const blob = {}
  for (const k of SYNCED_KEYS) {
    try { const v = localStorage.getItem(k); if (v != null) blob[k] = JSON.parse(v) } catch {}
  }
  try {
    await supabase.from('user_state').upsert(
      { user_id: userId, data: blob },
      { onConflict: 'user_id' },
    )
  } catch {}
}
