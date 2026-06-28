import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

// ─── Account gate ─────────────────────────────────────────────────────────
// Replaces the shared early-access password. Shows sign-up / login until the
// user has a Supabase session, then renders the app. Also handles the
// password-recovery link flow.

const C = {
  bg: '#FAF7F2', surface: '#FFFFFF', border: '#E7DECF',
  coral: '#E8644A', navy: '#1C2B4A', ink: '#1C2B4A',
  inkSoft: '#8C7B6B', inkFaint: '#A89B8C',
}
const SANS = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

const field = {
  width: '100%', padding: '14px 16px', borderRadius: 12,
  border: `1.5px solid ${C.border}`, background: C.surface, color: C.navy,
  fontFamily: SANS, fontSize: 16, marginBottom: 12, outline: 'none',
}
const primaryBtn = {
  width: '100%', border: 'none', borderRadius: 12, padding: '14px 20px',
  background: 'linear-gradient(180deg, #ED7359 0%, #E8644A 100%)', color: '#fff',
  fontFamily: SANS, fontSize: 15, fontWeight: 700, cursor: 'pointer',
  boxShadow: '0 6px 18px -5px rgba(232,100,74,0.42)',
}
const linkBtn = {
  background: 'none', border: 'none', color: C.coral,
  fontFamily: SANS, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 4,
}

export default function AuthGate({ children }) {
  const [checked, setChecked] = useState(false)
  const [session, setSession] = useState(null)
  const [mode, setMode] = useState('signin')   // signin | signup | forgot | sent | recovery
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecked(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess)
      if (event === 'PASSWORD_RECOVERY') setMode('recovery')
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const reset = () => { setError(''); setNotice('') }

  const submit = async (e) => {
    e?.preventDefault?.()
    reset()
    const mail = email.trim().toLowerCase()

    if (mode === 'forgot') {
      if (!mail) return setError('Enter your email first.')
      setBusy(true)
      const { error } = await supabase.auth.resetPasswordForEmail(mail, {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      })
      setBusy(false)
      if (error) return setError(error.message)
      setMode('sent'); setNotice(`If an account exists for ${mail}, a reset link is on its way.`)
      return
    }

    if (mode === 'recovery') {
      if (password.length < 8) return setError('Use at least 8 characters.')
      setBusy(true)
      const { error } = await supabase.auth.updateUser({ password })
      setBusy(false)
      if (error) return setError(error.message)
      setNotice('Password updated. You’re all set.')
      setMode('signin'); setPassword('')
      return
    }

    if (!mail || !password) return setError('Email and password are both required.')
    if (mode === 'signup' && password.length < 8) return setError('Use at least 8 characters.')

    setBusy(true)
    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email: mail, password })
      setBusy(false)
      if (error) return setError(error.message)
      // If confirmation is off, a session comes back and the gate opens.
      // If confirmation is on, no session yet — tell them to check email.
      if (!data.session) { setMode('sent'); setNotice(`We sent a confirmation link to ${mail}. Click it to finish creating your account.`) }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: mail, password })
      setBusy(false)
      if (error) return setError(error.message)
    }
  }

  if (!checked) return <div style={{ minHeight: '100dvh', background: C.bg }} />
  if (session && mode !== 'recovery') return children

  const titles = {
    signin:   'Welcome back',
    signup:   'Create your account',
    forgot:   'Reset your password',
    sent:     'Check your email',
    recovery: 'Set a new password',
  }
  const subtitles = {
    signin:   'Log in to keep practicing.',
    signup:   'Start practicing the conversations that matter.',
    forgot:   'We’ll email you a link to set a new one.',
    sent:     '',
    recovery: 'Choose a new password for your account.',
  }

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontFamily: SANS, fontSize: 40, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1 }}>
            <span style={{ color: C.coral }}>F</span><span style={{ color: C.navy }}>.able</span>
          </h1>
        </div>

        <h2 style={{ fontFamily: SANS, fontSize: 22, fontWeight: 700, color: C.navy, textAlign: 'center', marginBottom: 6 }}>
          {titles[mode]}
        </h2>
        {subtitles[mode] && (
          <p style={{ fontFamily: SANS, fontSize: 14, color: C.inkSoft, textAlign: 'center', marginBottom: 26, lineHeight: 1.5 }}>
            {subtitles[mode]}
          </p>
        )}

        {notice && (
          <p style={{ fontFamily: SANS, fontSize: 13, color: C.navy, background: '#EAF6F1', border: '1px solid #BFE6D8', borderRadius: 12, padding: '12px 14px', marginBottom: 16, lineHeight: 1.5, textAlign: 'center' }}>
            {notice}
          </p>
        )}

        {mode === 'sent' ? (
          <button onClick={() => { reset(); setMode('signin') }} style={{ ...primaryBtn }}>
            Back to log in
          </button>
        ) : (
          <form onSubmit={submit}>
            {mode !== 'recovery' && (
              <input
                type="email" value={email} autoComplete="email" autoCapitalize="off"
                onChange={(e) => { setEmail(e.target.value); reset() }}
                placeholder="you@work.com" style={field}
              />
            )}
            {mode !== 'forgot' && (
              <input
                type="password" value={password}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                onChange={(e) => { setPassword(e.target.value); reset() }}
                placeholder={mode === 'signup' || mode === 'recovery' ? 'Create a password (8+ characters)' : 'Password'}
                style={field}
              />
            )}

            {error && (
              <p style={{ fontFamily: SANS, fontSize: 13, color: C.coral, marginBottom: 12, lineHeight: 1.5 }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>
              {busy ? 'One moment…'
                : mode === 'signup' ? 'Create account'
                : mode === 'forgot' ? 'Send reset link'
                : mode === 'recovery' ? 'Update password'
                : 'Log in'}
            </button>
          </form>
        )}

        {/* Footer links */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          {mode === 'signin' && (
            <>
              <button style={linkBtn} onClick={() => { reset(); setMode('forgot') }}>Forgot password?</button>
              <div style={{ marginTop: 10, fontFamily: SANS, fontSize: 13, color: C.inkSoft }}>
                New to Fable?{' '}
                <button style={linkBtn} onClick={() => { reset(); setMode('signup') }}>Create an account</button>
              </div>
            </>
          )}
          {mode === 'signup' && (
            <div style={{ fontFamily: SANS, fontSize: 13, color: C.inkSoft }}>
              Already have an account?{' '}
              <button style={linkBtn} onClick={() => { reset(); setMode('signin') }}>Log in</button>
            </div>
          )}
          {(mode === 'forgot') && (
            <button style={linkBtn} onClick={() => { reset(); setMode('signin') }}>← Back to log in</button>
          )}
        </div>

        <p style={{ fontFamily: SANS, fontSize: 11, color: C.inkFaint, textAlign: 'center', marginTop: 28, lineHeight: 1.6 }}>
          By continuing you agree to our{' '}
          <a href="/terms" style={{ color: C.inkSoft }}>Terms</a> and{' '}
          <a href="/privacy" style={{ color: C.inkSoft }}>Privacy Policy</a>.
        </p>
      </div>
    </div>
  )
}
