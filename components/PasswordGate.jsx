import { useState, useEffect } from 'react'

// ─── Early-access password gate ───────────────────────────────────────────
// Wraps the whole app. If localStorage 'fable_auth' === 'granted', renders
// children immediately. Otherwise shows the gate until the correct code is
// entered. No page reload — purely React state.

const ACCESS_CODE = 'liyana2023'  // compared case-insensitively below
const AUTH_KEY    = 'fable_auth_v2'  // bumped so old grants don't bypass the new code

// Fable design tokens (kept local so the component is self-contained).
const COLORS = {
  bg:    '#FAF7F2',  // arctic white / Fable canvas
  coral: '#E8644A',
  navy:  '#1C2B4A',
  inkSoft: '#8C7B6B',
  border:  '#E7DECF',
  surface: '#FFFFFF',
}
const SERIF = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
const SANS  = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

export default function PasswordGate({ children }) {
  // checked: have we read localStorage yet? Prevents a flash of the gate for
  // already-authed users (localStorage isn't available during SSR).
  const [checked, setChecked] = useState(false)
  const [authed,  setAuthed]  = useState(false)
  const [value,   setValue]   = useState('')
  const [error,   setError]   = useState(false)
  const [shake,   setShake]   = useState(false)

  useEffect(() => {
    let granted = false
    try { granted = localStorage.getItem(AUTH_KEY) === 'granted' } catch {}
    setAuthed(granted)
    setChecked(true)
  }, [])

  const submit = (e) => {
    e?.preventDefault?.()
    if (value.trim().toLowerCase() === ACCESS_CODE) {
      try { localStorage.setItem(AUTH_KEY, 'granted') } catch {}
      setError(false)
      setAuthed(true)
      return
    }
    // Wrong code: show error, shake, clear, let them retry.
    setError(true)
    setShake(true)
    setValue('')
    setTimeout(() => setShake(false), 450)
  }

  // Until we've checked storage, render a blank canvas (avoids gate flash).
  if (!checked) {
    return <div style={{ minHeight: '100dvh', background: COLORS.bg }} />
  }

  if (authed) return children

  return (
    <div style={{
      minHeight: '100dvh', background: COLORS.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>

        {/* Logo */}
        <h1 style={{ fontFamily: SERIF, fontSize: 44, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1, marginBottom: 10 }}>
          <span style={{ color: COLORS.coral }}>F</span>
          <span style={{ color: COLORS.navy }}>.able</span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: '.18em',
          textTransform: 'uppercase', color: COLORS.coral, marginBottom: 40,
        }}>
          Early access
        </p>

        <form onSubmit={submit}>
          <input
            type="password"
            value={value}
            onChange={(e) => { setValue(e.target.value); if (error) setError(false) }}
            placeholder="Enter access code"
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className={shake ? 'input-shake' : ''}
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 12,
              border: `1.5px solid ${error ? COLORS.coral : COLORS.border}`,
              background: COLORS.surface, color: COLORS.navy,
              fontFamily: SANS, fontSize: 16, textAlign: 'center',
              marginBottom: 12, transition: 'border-color .15s',
            }}
          />

          {error && (
            <p style={{ fontFamily: SANS, fontSize: 13, color: COLORS.coral, lineHeight: 1.5, marginBottom: 12 }}>
              Incorrect code — request access at scenariolab.quest
            </p>
          )}

          <button
            type="submit"
            style={{
              width: '100%', border: 'none', borderRadius: 12, padding: '14px 20px',
              background: COLORS.coral, color: '#fff',
              fontFamily: SANS, fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Enter →
          </button>
        </form>

        <p style={{ fontFamily: SANS, fontSize: 12, color: COLORS.inkSoft, marginTop: 22, lineHeight: 1.5 }}>
          Request access at scenariolab.quest
        </p>
        <p style={{ fontFamily: SANS, fontSize: 11, color: COLORS.inkSoft, marginTop: 16, lineHeight: 1.5 }}>
          <a href="/privacy" style={{ color: COLORS.inkSoft, textDecoration: 'none' }}>Privacy Policy</a>
          {' · '}
          <a href="/terms" style={{ color: COLORS.inkSoft, textDecoration: 'none' }}>Terms of Service</a>
        </p>
      </div>
    </div>
  )
}
