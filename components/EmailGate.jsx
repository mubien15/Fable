import { useState, useEffect } from 'react'

// ─── Email-capture gate ────────────────────────────────────────────────────
// Wraps the whole app. On first visit, asks for an email before letting the
// visitor in. Once captured (stored in localStorage), renders children
// immediately on every future visit. No page reload — purely React state.
//
// The email is sent to the landing page's existing /api/subscribe endpoint,
// which adds the contact to Brevo list #3 (same list as the website waitlist).
// That endpoint has open CORS, so we can POST to it cross-origin and avoid
// configuring a Brevo key on the app's own Vercel project.

const CAPTURED_KEY = 'fable_email'
const SUBSCRIBE_URL = 'https://www.scenariolab.quest/api/subscribe'

// Fable design tokens (kept local so the component is self-contained).
const COLORS = {
  bg:    '#FAF7F2',
  coral: '#E8644A',
  navy:  '#1C2B4A',
  inkSoft: '#8C7B6B',
  border:  '#E7DECF',
  surface: '#FFFFFF',
  green:   '#5AC87A',
}
const SERIF = "'Lora', Georgia, serif"
const SANS  = "'DM Sans', system-ui, -apple-system, sans-serif"

const isValidEmail = (v) => /\S+@\S+\.\S+/.test(v)

export default function EmailGate({ children }) {
  // checked: have we read localStorage yet? Prevents a flash of the gate for
  // already-captured visitors (localStorage isn't available during SSR).
  const [checked,  setChecked]  = useState(false)
  const [captured, setCaptured] = useState(false)
  const [value,    setValue]    = useState('')
  const [error,    setError]    = useState('')
  const [sending,  setSending]  = useState(false)

  useEffect(() => {
    let has = false
    try { has = !!localStorage.getItem(CAPTURED_KEY) } catch {}
    setCaptured(has)
    setChecked(true)
  }, [])

  const submit = async (e) => {
    e?.preventDefault?.()
    const email = value.trim()
    if (!isValidEmail(email)) { setError('Please enter a valid email address.'); return }
    setSending(true)
    setError('')
    try {
      const res = await fetch(SUBSCRIBE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'app' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) throw new Error(data.error || 'Signup failed')
      try { localStorage.setItem(CAPTURED_KEY, email) } catch {}
      setCaptured(true)
    } catch (err) {
      setError('Something went wrong — please try again.')
      setSending(false)
    }
  }

  // Until we've checked storage, render a blank canvas (avoids gate flash).
  if (!checked) {
    return <div style={{ minHeight: '100dvh', background: COLORS.bg }} />
  }

  if (captured) return children

  return (
    <div style={{
      minHeight: '100dvh', background: COLORS.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>

        {/* Logo */}
        <h1 style={{ fontFamily: SERIF, fontSize: 44, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1, marginBottom: 10 }}>
          <span style={{ color: COLORS.coral }}>F</span>
          <span style={{ color: COLORS.navy }}>.able</span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: '.18em',
          textTransform: 'uppercase', color: COLORS.coral, marginBottom: 28,
        }}>
          Your communication coach
        </p>

        <p style={{ fontFamily: SERIF, fontSize: 18, color: COLORS.navy, lineHeight: 1.5, marginBottom: 8 }}>
          Practice the conversations that matter.
        </p>
        <p style={{ fontFamily: SANS, fontSize: 14, color: COLORS.inkSoft, lineHeight: 1.6, marginBottom: 28 }}>
          Enter your email to start. We'll keep you posted as Fable grows — no spam, unsubscribe anytime.
        </p>

        <form onSubmit={submit}>
          <input
            type="email"
            value={value}
            onChange={(e) => { setValue(e.target.value); if (error) setError('') }}
            placeholder="your@email.com"
            autoFocus
            autoComplete="email"
            autoCapitalize="off"
            spellCheck={false}
            disabled={sending}
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
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={sending}
            style={{
              width: '100%', border: 'none', borderRadius: 12, padding: '14px 20px',
              background: COLORS.coral, color: '#fff', opacity: sending ? 0.7 : 1,
              fontFamily: SANS, fontSize: 15, fontWeight: 700, cursor: sending ? 'default' : 'pointer',
            }}
          >
            {sending ? 'Just a moment…' : 'Start practising →'}
          </button>
        </form>

        <p style={{ fontFamily: SANS, fontSize: 12, color: COLORS.inkSoft, marginTop: 22, lineHeight: 1.5 }}>
          By continuing you agree to receive occasional product updates.
        </p>
      </div>
    </div>
  )
}
