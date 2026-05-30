// ─── Rehearse: personal conversation preparation ──────────────────────────
// Rehearsals are the user's own real upcoming conversations. Unlike Scenarios
// (structured training), each Rehearsal is built from the user's own inputs and
// stored locally. The AI-generated scenario is produced server-side via
// /api/coaching (never expose the API key in the browser).

const LS_KEY = 'fable_rehearsals'

const read = () => {
  try { const v = localStorage.getItem(LS_KEY); return v ? JSON.parse(v) : [] }
  catch { return [] }
}
const write = (list) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)) } catch {}
}

// Generate a reasonably-unique id without a uuid dependency.
export const newRehearsalId = () =>
  `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

// Map the personal prepare-mode framing to the underlying difficulty system.
export const REHEARSE_DIFFICULTY_TO_SYSTEM = {
  warmup:    'easy',
  realistic: 'medium',
  worstcase: 'hard',
}
export const rehearseDifficultyToSystem = (d) =>
  REHEARSE_DIFFICULTY_TO_SYSTEM[d] || 'medium'

// Save a new rehearsal (prepended — newest first). Returns the saved object.
export const saveRehearsal = (rehearsal) => {
  const list = read()
  write([rehearsal, ...list])
  return rehearsal
}

// Get all rehearsals (newest first).
export const getRehearsals = () => read()

// Get a single rehearsal by id.
export const getRehearsal = (id) => read().find((r) => r.id === id) || null

// Merge updates into the rehearsal with the given id. Returns the updated object.
export const updateRehearsal = (id, updates) => {
  const list = read()
  let updated = null
  const next = list.map((r) => {
    if (r.id === id) { updated = { ...r, ...updates }; return updated }
    return r
  })
  write(next)
  return updated
}

// Remove a rehearsal.
export const deleteRehearsal = (id) => {
  write(read().filter((r) => r.id !== id))
}

// "2 days ago" style relative time for card meta.
export const relativeTime = (iso) => {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const mins = Math.floor((Date.now() - then) / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'yesterday'
  if (days < 30)  return `${days} days ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
