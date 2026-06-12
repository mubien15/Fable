import Head from 'next/head'
import { useState, useEffect, useRef, useCallback } from 'react'
import { ALL_TRACKS } from '../data/tracks'
import { DAILY_REP_PROGRAM } from '../data/daily-rep'
import {
  getRehearsals, saveRehearsal, updateRehearsal,
  newRehearsalId, rehearseDifficultyToSystem, relativeTime,
} from '../data/rehearsals'

// ═══════════════════════════════════════════════
// FEATURE FLAGS
// ═══════════════════════════════════════════════
// Master switch for free/paid tier gating (locked scenarios + Rehearse).
// Set to false for a completely open app (no friction). Flip to true to
// re-enable the founding-members paywall.
const TIER_GATING_ENABLED = false

// ═══════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════
const C = {
  // Backgrounds
  bg: '#FAF7F2', surface: '#FFFFFF', surfaceSubtle: '#F0EBE1',
  border: 'rgba(28,43,74,0.12)',

  // Coral — CTAs and actions only
  coral: '#E8644A', coralHover: '#F2856F', coralLight: '#F2856F',
  coralDim: '#FAD5CC', coralBg: '#FEF0EB',

  // Navy — identity, headings, active states (replaces steel blue)
  blue: '#2D4070', blueDeep: '#1C2B4A', blueDim: '#C5D0E6', blueBg: '#E8EDF5',

  // Track background tints → warm cream
  trackAudit: '#F0EBE1', trackConsulting: '#F0EBE1', trackLeadership: '#F0EBE1',

  // Teal — kept for positive feedback states
  teal: '#2BA084', tealBg: '#E8F7F4',

  // Text
  ink: '#1C2B4A', inkMid: '#2D4070', inkSoft: '#8C7B6B', inkFaint: '#A89B8C',
}
// One typeface across the app: the Apple system stack (SF Pro on Apple
// devices). SERIF is kept as an alias so heading styles keep their weights.
const SERIF = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
const SANS = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
// Tiny silent WAV used to unlock the audio element on iOS/Safari (user gesture requirement)
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='

// ═══════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════
const ROLES = [
  { id: 'auditor',    label: 'Auditor / GRC / Compliance',    icon: 'audit', recommended_track: 'audit',      description: 'Practice delivering findings, managing examiners, and holding your position.' },
  { id: 'consultant', label: 'Consultant / Advisory',          icon: 'consulting', recommended_track: 'consulting', description: 'Practice client conversations, pitches, and the moments that make or break an engagement.' },
  { id: 'manager',    label: 'People Manager / Team Lead',     icon: 'leadership', recommended_track: 'leadership', description: 'Practice feedback, underperformance, and the conversations most managers avoid until it\'s too late.' },
  { id: 'all',        label: 'All of the above / Other',       icon: '⊞', recommended_track: null,         description: 'You wear a lot of hats. We\'ve got scenarios for all of them.' },
]

const SCENARIO_CHIPS = [
  { id: 'interview',  label: 'Job Interview' },
  { id: 'friend',     label: 'Difficult Friend' },
  { id: 'feelings',   label: 'Express Feelings' },
]

const MISSIONS = [
  { day: 1,  title: 'First Words',   prompt: 'Tell me what you do — but make me care',                                          locked: false },
  { day: 2,  title: 'The Hook',      prompt: 'Tell me about your week. Start with the most interesting moment',                  locked: false },
  { day: 3,  title: 'Show Don\'t Tell', prompt: 'Describe a place that matters to you without naming it',                       locked: false },
  { day: 4,  title: 'The Middle',    prompt: 'Tell me about a time something didn\'t go as planned',                            locked: false },
  { day: 5,  title: 'Endings',       prompt: 'Finish this: "The thing I didn\'t expect was..."',                                locked: false },
  { day: 6,  title: 'Your Voice',    prompt: 'Tell me something you believe that most people don\'t',                            locked: false },
  { day: 7,  title: 'Texture',       prompt: 'Tell me about something small that happened this week — make me feel like I was there', locked: false },
  ...Array.from({ length: 23 }, (_, i) => ({ day: i + 8, title: `Day ${i + 8}`, prompt: '', locked: true })),
]

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

// Find a scenario + its parent track from ALL_TRACKS by scenario id
function findTrackScenario(scenarioId) {
  for (const track of ALL_TRACKS) {
    const scenario = track.scenarios.find((sc) => sc.id === scenarioId)
    if (scenario) return { scenario, track }
  }
  return null
}

// Resolve a Daily Rep day into a playable scenario object
function getDailyRepScenario(day) {
  if (!day || day.type === 'user-choice') return null
  if (day.type === 'mini') {
    const m = day.mini_scenario
    return {
      id: `daily-rep-day-${day.day}`,
      title: m.title,
      context: m.context,
      counterpartRole: m.counterpartRole,
      userRole: m.userRole,
      challenge: m.challenge,
      opening_line: m.opening_line,
      coaching_focus: m.coaching_focus || [],
      difficulty_default: m.difficulty_default || day.difficulty_default || 'medium',
      system_prompt_addition: m.system_prompt_addition || '',
    }
  }
  if (day.type === 'track') {
    return findTrackScenario(day.scenario_id)?.scenario || null
  }
  return null
}

// ═══════════════════════════════════════════════
// STORAGE HELPERS
// ═══════════════════════════════════════════════
const LS = {
  user:          'fable_user',
  sessions:      'fable_sessions',
  storylab:      'fable_storylab',  // kept for migration awareness
  dailyRep:      'fable_daily_rep',
  completed:     'completedScenarios',
  completedData: 'fable_completed_data',  // rich per-scenario debrief data
  prefs:         'fable_prefs',           // cross-session user preferences
}

function lsGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback }
  catch { return fallback }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

// ═══════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════

function PrivacyNote() {
  return (
    <p style={{ color: C.inkSoft, fontSize: 12, textAlign: 'center', marginTop: 24, lineHeight: 1.5 }}>
      Your sessions are private. We never share your conversations.
    </p>
  )
}

function CoachAvatar({ size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${C.coral}, ${C.coralLight})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: size * 0.45, fontFamily: SERIF, userSelect: 'none',
    }}>✦</div>
  )
}

function Dots() {
  const dot = (delay) => (
    <div style={{
      width: 7, height: 7, borderRadius: '50%', background: C.coral,
      animation: `dotBounce 1.2s ease-in-out ${delay}s infinite`,
    }} />
  )
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '8px 0' }}>
      {dot(0)} {dot(0.2)} {dot(0.4)}
    </div>
  )
}

function Btn({ children, onClick, variant = 'primary', disabled, style: s = {} }) {
  const base = {
    width: '100%', border: 'none', borderRadius: 14, padding: '15px 20px',
    fontSize: 15, fontWeight: 700, fontFamily: SANS, letterSpacing: '.01em',
    cursor: disabled ? 'default' : 'pointer', transition: 'opacity .15s, transform .1s',
    ...s,
  }
  const v = {
    primary:   { background: disabled ? C.coralDim : C.coral, color: disabled ? '#fff8' : '#fff' },
    blue:      { background: C.blueDeep, color: '#fff' },
    secondary: { background: 'transparent', color: C.ink, border: `1.5px solid ${C.border}` },
    ghost:     { background: 'transparent', color: C.inkSoft, padding: '10px 20px', fontSize: 14 },
  }
  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...v[variant] }}>
      {children}
    </button>
  )
}

function Card({ children, bg = C.surface, border = C.border, style: s = {} }) {
  return (
    <div style={{
      background: bg, borderRadius: 16, padding: '18px 20px',
      border: `1px solid ${border}`, ...s,
    }}>
      {children}
    </div>
  )
}

// ─── Shared voice recorder — MediaRecorder + Whisper (iOS-reliable) ──────────
// Replaces webkitSpeechRecognition everywhere. The browser speech API silently
// stops producing results on iOS Safari after any <audio> playback; recording
// audio and transcribing server-side via /api/transcribe avoids that entirely.
function useVoiceRecorder() {
  const [recording,    setRecording]    = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [error,        setError]        = useState(null)
  const mrRef     = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const mimeRef   = useRef('audio/mp4')

  const release = () => {
    try { streamRef.current?.getTracks().forEach((t) => t.stop()) } catch {}
    streamRef.current = null
  }
  useEffect(() => () => release(), [])

  const pickMime = () => {
    if (typeof MediaRecorder === 'undefined') return ''
    for (const m of ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg']) {
      try { if (MediaRecorder.isTypeSupported(m)) return m } catch {}
    }
    return ''
  }

  const start = async () => {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Voice recording isn’t supported in this browser — try Chrome, Safari, or Edge.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = pickMime()
      mimeRef.current = mime || 'audio/mp4'
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data) }
      mrRef.current = mr
      mr.start()
      setRecording(true)
    } catch (err) {
      release()
      setRecording(false)
      setError(err?.name === 'NotAllowedError' || err?.name === 'SecurityError'
        ? 'Microphone access denied — enable it in your browser settings.'
        : 'Could not access the microphone — try again.')
    }
  }

  // Stops recording, transcribes, returns the text (or '' on failure).
  const stopAndTranscribe = async () => {
    const mr = mrRef.current
    if (!mr) { setRecording(false); return '' }
    mrRef.current = null
    setRecording(false)
    setTranscribing(true)
    const blob = await new Promise((resolve) => {
      mr.addEventListener('stop', () => resolve(new Blob(chunksRef.current, { type: mimeRef.current })), { once: true })
      try { mr.stop() } catch { resolve(new Blob(chunksRef.current, { type: mimeRef.current })) }
    })
    release()
    try {
      if (!blob || blob.size === 0) { setTranscribing(false); setError('No audio captured — try again.'); return '' }
      const res = await fetch('/api/transcribe', { method: 'POST', headers: { 'Content-Type': mimeRef.current }, body: blob })
      const data = await res.json().catch(() => ({}))
      setTranscribing(false)
      const text = (data.text || '').trim()
      if (!res.ok || !text) { setError(data.error || 'Didn’t catch that — try again.'); return '' }
      return text
    } catch {
      setTranscribing(false)
      setError('Transcription failed — check your connection and try again.')
      return ''
    }
  }

  const cancel = () => {
    const mr = mrRef.current
    mrRef.current = null
    chunksRef.current = []
    try { mr?.stop() } catch {}
    release()
    setRecording(false)
  }

  return { recording, transcribing, error, setError, start, stopAndTranscribe, cancel }
}

function VoiceTextarea({ value, onChange, placeholder, minHeight = 140 }) {
  const rec = useVoiceRecorder()
  const busy = rec.recording || rec.transcribing

  const toggle = async () => {
    if (rec.recording) {
      const text = await rec.stopAndTranscribe()
      if (text) onChange(value ? (value.trim() + ' ' + text).trim() : text)
    } else if (!rec.transcribing) {
      rec.start()
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', minHeight, resize: 'none', padding: '14px 52px 14px 16px',
          background: C.surface, border: `1.5px solid ${rec.recording ? C.coral : C.border}`, borderRadius: 14,
          color: C.ink, fontSize: 16, lineHeight: 1.7, fontFamily: SERIF,
          transition: 'border-color .15s',
        }}
        onFocus={(e) => (e.target.style.borderColor = C.coral)}
        onBlur={(e)  => (e.target.style.borderColor = rec.recording ? C.coral : C.border)}
      />
      <button
        onClick={toggle}
        disabled={rec.transcribing}
        title={rec.recording ? 'Stop & transcribe' : 'Tap to speak'}
        style={{
          position: 'absolute', bottom: 12, right: 12, width: 36, height: 36,
          borderRadius: '50%', border: 'none',
          background: rec.recording ? C.coral : C.border,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: rec.recording ? 'recordPulse 1.5s ease-in-out infinite' : 'none',
          transition: 'background .2s',
        }}
      >
        {rec.recording ? (
          <span style={{ width: 12, height: 12, borderRadius: 2, background: '#fff', display: 'block' }} />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke={C.inkSoft} strokeWidth="2" strokeLinecap="round">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
            <path d="M19 10v2a7 7 0 01-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}
      </button>
      {(rec.recording || rec.transcribing) && (
        <div style={{
          position: 'absolute', top: 10, left: 12,
          display: 'flex', alignItems: 'center', gap: 5,
          background: C.coralBg, padding: '3px 9px', borderRadius: 20,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.coral, animation: 'pulse 1s infinite' }} />
          <span style={{ color: C.coral, fontSize: 11, fontWeight: 700, fontFamily: SANS }}>
            {rec.transcribing ? 'Transcribing…' : 'Recording — tap ■ when done'}
          </span>
        </div>
      )}
      {rec.error && !busy && (
        <p style={{ fontFamily: SANS, fontSize: 12, color: C.coral, marginTop: 6, lineHeight: 1.4 }}>{rec.error}</p>
      )}
    </div>
  )
}

// Cohesive line-icon set for the bottom nav. All stroke = currentColor so they
// tint coral when active / faint when inactive, exactly like the old glyphs did.
function NavIcon({ id, color }) {
  const common = {
    width: 23, height: 23, viewBox: '0 0 24 24', fill: 'none',
    stroke: color, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
  }
  switch (id) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M3.5 11.5 12 4l8.5 7.5" />
          <path d="M5.5 10v9.5h13V10" />
        </svg>
      )
    case 'scenarios':
      return (
        <svg {...common}>
          <rect x="3.5"  y="3.5"  width="7" height="7" rx="1.6" />
          <rect x="13.5" y="3.5"  width="7" height="7" rx="1.6" />
          <rect x="3.5"  y="13.5" width="7" height="7" rx="1.6" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
        </svg>
      )
    case 'rehearse':
      // A sparkle — signals the personalized / custom-built moment.
      return (
        <svg {...common}>
          <path d="M12 3c.45 4 1.55 5.1 5.5 5.5-3.95.4-5.05 1.5-5.5 5.5-.45-4-1.55-5.1-5.5-5.5C9.45 8.1 10.55 7 12 3Z" />
          <path d="M18.5 15c.2 1.6.75 2.15 2.3 2.35-1.55.2-2.1.75-2.3 2.35-.2-1.6-.75-2.15-2.3-2.35 1.55-.2 2.1-.75 2.3-2.35Z" />
        </svg>
      )
    case 'coach':
      // Speech bubble — conversation / guidance.
      return (
        <svg {...common}>
          <path d="M20 13.5a2 2 0 0 1-2 2H9l-4 3.5V6a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2Z" />
        </svg>
      )
    case 'progress':
      // Bar chart — growth over time.
      return (
        <svg {...common}>
          <path d="M4 20h16" />
          <path d="M7.5 20v-5" />
          <path d="M12 20V8.5" />
          <path d="M16.5 20v-8" />
        </svg>
      )
    default:
      return null
  }
}

// Line icons for content areas — same visual language as NavIcon (thin
// stroke, currentColor) so tracks, daily rep and coach modes match the nav.
function LineIcon({ id, color = C.blue, size = 22 }) {
  const common = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: color, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
  }
  switch (id) {
    case 'audit': // magnifying glass
      return (
        <svg {...common}>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m15.5 15.5 5 5" />
        </svg>
      )
    case 'consulting': // briefcase
    case 'work':
      return (
        <svg {...common}>
          <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
          <path d="M8.5 7.5v-2a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2" />
          <path d="M3.5 12.5h17" />
        </svg>
      )
    case 'career': // upward trend arrow
      return (
        <svg {...common}>
          <path d="m3.5 17 6-6 3.5 3.5L20 7.5" />
          <path d="M14.5 7.5H20V13" />
        </svg>
      )
    case 'leadership': // two people
    case 'relationships':
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 19.5c.5-3.2 2.7-4.8 5.5-4.8s5 1.6 5.5 4.8" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M16 14.6c2.5.2 4.1 1.7 4.5 4.4" />
        </svg>
      )
    case 'target': // bullseye — Daily Rep
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="4.7" />
          <circle cx="12" cy="12" r="1.1" />
        </svg>
      )
    case 'compass': // Coach: situation to work through
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="m15.2 8.8-1.9 5.3-5.3 1.9 1.9-5.3z" />
        </svg>
      )
    case 'thought': // thought bubble — Coach: just need to think
      return (
        <svg {...common}>
          <path d="M12 4.5c4.3 0 7.5 2.5 7.5 5.8s-3.2 5.8-7.5 5.8c-.9 0-1.8-.1-2.6-.3l-3.1 1.4.8-2.5c-1.6-1.1-2.6-2.7-2.6-4.4 0-3.3 3.2-5.8 7.5-5.8Z" />
          <circle cx="6.2" cy="20" r="1" />
        </svg>
      )
    case 'family': // heart
      return (
        <svg {...common}>
          <path d="M12 20s-7.3-4.8-7.3-9.6C4.7 7.4 6.7 6 8.7 6c1.4 0 2.6.7 3.3 1.9C12.7 6.7 13.9 6 15.3 6c2 0 4 1.4 4 4.4C19.3 15.2 12 20 12 20Z" />
        </svg>
      )
    case 'clarity': // eye — seeing clearly
      return (
        <svg {...common}>
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )
    case 'idea': // lightbulb — hints
      return (
        <svg {...common}>
          <path d="M12 3a6 6 0 0 0-3.4 10.9c.7.5 1.1 1.3 1.1 2.1h4.6c0-.8.4-1.6 1.1-2.1A6 6 0 0 0 12 3Z" />
          <path d="M9.8 19h4.4" />
          <path d="M10.5 21.5h3" />
        </svg>
      )
    case 'mic': // microphone — voice mode
      return (
        <svg {...common}>
          <rect x="9" y="2.5" width="6" height="11" rx="3" />
          <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
          <path d="M12 17.5v3" />
        </svg>
      )
    case 'lock': // padlock
      return (
        <svg {...common}>
          <rect x="5" y="10.5" width="14" height="10" rx="2" />
          <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
        </svg>
      )
    case 'chat': // generic conversation session
      return (
        <svg {...common}>
          <path d="M20 13.5a2 2 0 0 1-2 2H9l-4 3.5V6a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2Z" />
          <path d="M8.5 9.5h7" />
          <path d="M8.5 12.5h4.5" />
        </svg>
      )
    case 'flame': // streak
      return (
        <svg {...common}>
          <path d="M12 3c.6 2.8 1.9 4.4 3.7 6.1A6.3 6.3 0 0 1 18 13.6 6 6 0 0 1 6 13.6c0-1.6.6-3 1.7-4.2.4 1 .9 1.7 1.8 2.3C9.4 8.5 10.4 5.6 12 3Z" />
        </svg>
      )
    default:
      return null
  }
}

function BottomNav({ active, onChange }) {
  const tabs = [
    { id: 'home',      label: 'Home'      },
    { id: 'scenarios', label: 'Scenarios' },
    { id: 'rehearse',  label: 'Rehearse'  },
    { id: 'coach',     label: 'Coach'     },
    { id: 'progress',  label: 'Progress'  },
  ]
  return (
    // Floating liquid-glass pill: translucent navy with blur + a top sheen,
    // detached from the screen edges so the safe area shows through beneath.
    <nav style={{
      position: 'fixed', left: '50%', transform: 'translateX(-50%)',
      bottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
      width: 'calc(100% - 24px)', maxWidth: 400,
      background: 'rgba(28,43,74,0.86)',
      backdropFilter: 'blur(20px) saturate(1.6)',
      WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
      border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: 32,
      boxShadow: '0 12px 36px rgba(28,43,74,0.38), inset 0 1px 0 rgba(255,255,255,0.16)',
      display: 'flex', zIndex: 200,
      padding: '8px 8px',
    }}>
      {tabs.map((t) => {
        const isActive = active === t.id
        const color = isActive ? '#FFB4A3' : 'rgba(255,255,255,0.6)'
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              background: isActive ? 'rgba(255,255,255,0.12)' : 'none',
              border: 'none', padding: '7px 0 6px', borderRadius: 24,
              boxShadow: isActive ? 'inset 0 1px 0 rgba(255,255,255,0.18)' : 'none',
              transition: 'background .25s ease',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 23 }}>
              <NavIcon id={t.id} color={color} />
            </span>
            <span style={{
              fontSize: 9.5, fontWeight: 700, letterSpacing: '.05em', fontFamily: SANS, color,
            }}>
              {t.label.toUpperCase()}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

function SubHeader({ title, onBack }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', color: C.inkSoft, fontSize: 20, padding: '4px 0',
      }}>←</button>
      <h2 style={{ fontFamily: SERIF, color: C.ink, fontSize: 20, fontWeight: 600 }}>{title}</h2>
    </div>
  )
}

// ═══════════════════════════════════════════════
// ONBOARDING
// ═══════════════════════════════════════════════

function OnboardDots({ step }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 36 }}>
      {[1, 2, 3].map((s) => (
        <div key={s} style={{
          width: s === step ? 20 : 7, height: 7, borderRadius: 4,
          background: s === step ? C.coral : C.coralDim,
          transition: 'width .3s, background .3s',
        }} />
      ))}
    </div>
  )
}

function Onboard1({ onNext }) {
  const [name, setName] = useState('')
  return (
    <div className="fade-up" style={{ padding: '60px 28px 40px' }}>
      <OnboardDots step={1} />
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 36, marginBottom: 20, textAlign: 'center' }}>✦</div>
        <h1 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 600, color: C.ink, margin: '0 0 12px', lineHeight: 1.25 }}>
          The conversations that matter most deserve more than improvisation.
        </h1>
        <p style={{ color: C.inkSoft, fontSize: 15, lineHeight: 1.65 }}>
          Fable helps professionals in regulated industries practice the high-stakes conversations that define careers — before they have to have them for real.
        </p>
      </div>

      <label style={{ display: 'block', fontFamily: SANS, color: C.inkMid, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        What's your name?
      </label>
      <input
        type="text"
        placeholder="Your first name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && name.trim() && onNext(name.trim())}
        style={{
          width: '100%', padding: '14px 16px', borderRadius: 14,
          border: `1.5px solid ${C.border}`, background: C.surface,
          fontSize: 16, color: C.ink, marginBottom: 20,
          transition: 'border-color .15s',
        }}
        onFocus={(e) => (e.target.style.borderColor = C.coral)}
        onBlur={(e)  => (e.target.style.borderColor = C.border)}
        autoFocus
      />
      <Btn onClick={() => name.trim() && onNext(name.trim())} disabled={!name.trim()}>
        Start practicing →
      </Btn>
      <PrivacyNote />
    </div>
  )
}

function Onboard2({ name, onNext }) {
  const [choice, setChoice] = useState('')
  return (
    <div className="fade-up" style={{ padding: '60px 28px 40px' }}>
      <OnboardDots step={2} />
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: C.ink, marginBottom: 8 }}>
          Good to meet you, {name}.
        </h1>
        <p style={{ color: C.inkSoft, fontSize: 15, lineHeight: 1.65 }}>
          Who do you show up as at work? We'll personalize your practice to the conversations that matter most in your world.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {ROLES.map((r) => (
          <button
            key={r.id}
            onClick={() => setChoice(r.id)}
            style={{
              padding: '14px 18px', borderRadius: 14, textAlign: 'left',
              border: `1.5px solid ${choice === r.id ? C.coral : C.border}`,
              background: choice === r.id ? C.coralBg : C.surface,
              transition: 'all .15s', display: 'flex', alignItems: 'flex-start', gap: 12,
            }}
          >
            <span style={{ marginTop: 2, flexShrink: 0, display: 'flex' }}><LineIcon id={r.icon} color={C.blue} size={21} /></span>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: choice === r.id ? C.coral : C.ink, marginBottom: 3 }}>
                {r.label}
              </p>
              <p style={{ fontFamily: SERIF, fontSize: 13, color: choice === r.id ? C.coral : C.inkSoft, lineHeight: 1.45, fontStyle: 'italic' }}>
                {r.description}
              </p>
            </div>
          </button>
        ))}
      </div>
      <Btn onClick={() => choice && onNext(choice)} disabled={!choice}>
        This is my role →
      </Btn>
      <PrivacyNote />
    </div>
  )
}

function Onboard3({ onNext, onSkip }) {
  const [moment, setMoment] = useState('')
  return (
    <div className="fade-up" style={{ padding: '60px 28px 40px' }}>
      <OnboardDots step={3} />
      <div style={{ marginBottom: 24 }}>
        <div style={{ background: C.ink, borderRadius: 16, padding: '20px 22px', marginBottom: 24 }}>
          <p style={{ fontFamily: SERIF, color: '#F8FAFC', fontSize: 16, lineHeight: 1.7, fontStyle: 'italic' }}>
            "30 days. 30 real conversations. Identify the habits holding you back."
          </p>
        </div>
        <h1 style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 600, color: C.ink, marginBottom: 8, lineHeight: 1.3 }}>
          Is there a conversation coming up you want to prepare for?
        </h1>
        <p style={{ color: C.inkSoft, fontSize: 15, lineHeight: 1.65 }}>
          A difficult conversation, an interview, something important — describe it and we'll start there.
        </p>
      </div>

      <VoiceTextarea
        value={moment}
        onChange={setMoment}
        placeholder="Describe the situation... (or tap the mic to speak)"
        minHeight={140}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
        <Btn onClick={() => onNext(moment.trim())} disabled={!moment.trim()}>
          Let's prepare for this →
        </Btn>
        <Btn variant="ghost" onClick={onSkip}>I'll explore on my own →</Btn>
      </div>
      <PrivacyNote />
    </div>
  )
}

// ═══════════════════════════════════════════════
// HOME SCREEN
// ═══════════════════════════════════════════════
const TRACK_BG = { audit: C.surface, consulting: C.surface, leadership: C.surface, career: C.surface }

function HomeScreen({ user, sessions, rehearsals = [], dailyRep, setScreen, onResumeSession, setActiveTrack, onStartDay }) {
  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const currentDayIndex = Math.min((dailyRep.currentDay || 1) - 1, 29)
  const currentDayData  = DAILY_REP_PROGRAM[currentDayIndex]
  const completedCount  = (dailyRep.completedDays || []).length
  const streak          = dailyRep.streak || 0

  // Surface user's recommended track first
  const recommendedId = ROLES.find((r) => r.id === user?.role)?.recommended_track
  const sortedTracks = [...ALL_TRACKS].sort((a, b) => {
    if (a.id === recommendedId) return -1
    if (b.id === recommendedId) return 1
    return 0
  })

  const SectionLabel = ({ children }) => (
    <p style={{
      fontFamily: SANS, fontSize: 11, fontWeight: 600, letterSpacing: '.08em',
      textTransform: 'uppercase', color: C.blueDeep, marginBottom: 14,
    }}>{children}</p>
  )

  return (
    <div className="fade-up" style={{ padding: '36px 20px calc(120px + env(safe-area-inset-bottom, 0px))' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        <p style={{
          fontFamily: SANS, fontSize: 11, fontWeight: 500, letterSpacing: '.08em',
          textTransform: 'uppercase', color: C.inkFaint, marginBottom: 6,
        }}>{greeting}</p>
        <h1 style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 700, color: C.ink, lineHeight: 1.15, marginBottom: 6 }}>
          {user.name}
        </h1>
        <p style={{ fontFamily: SANS, fontSize: 15, color: C.inkMid, lineHeight: 1.5 }}>
          What conversation will you practice today?
        </p>
      </div>

      {/* ── Daily Practice ── */}
      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Daily Practice</SectionLabel>
        <div style={{ background: C.ink, borderRadius: 16, padding: '16px 20px', marginBottom: 12 }}>
          <p style={{ fontFamily: SERIF, color: '#F8FAFC', fontSize: 14, lineHeight: 1.7, fontStyle: 'italic' }}>
            "{DAILY_REP_PROGRAM[(dailyRep.currentDay || 1) - 1]?.insight
              || '30 days. 30 real conversations. Identify the habits holding you back.'}"
          </p>
        </div>
        <Card style={{ background: C.surface }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: `linear-gradient(135deg, ${C.coral}, ${C.coralLight})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><LineIcon id="target" color="#fff" size={22} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                <p style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: C.inkFaint, letterSpacing: '.07em', textTransform: 'uppercase' }}>
                  DAILY REP · DAY {dailyRep.currentDay || 1} · {currentDayData?.phase_label?.toUpperCase()}
                </p>
                {streak > 0 && (
                  <span style={{ fontFamily: SANS, fontSize: 10, color: C.coral, background: C.coralBg, padding: '1px 7px', borderRadius: 20, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <LineIcon id="flame" color={C.coral} size={11} /> {streak} streak
                  </span>
                )}
              </div>
              <p style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentDayData?.title}
              </p>
              <p style={{ fontFamily: SANS, fontSize: 12, color: C.inkMid, marginBottom: 2 }}>
                Today: {currentDayData?.focus}
              </p>
              <p style={{ fontFamily: SANS, fontSize: 11, color: C.inkFaint }}>
                {currentDayData?.duration}
              </p>
            </div>
          </div>
          <div style={{ height: 4, background: C.border, borderRadius: 4, marginBottom: 14, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(completedCount / 30) * 100}%`, background: C.coral, borderRadius: 4, transition: 'width .4s' }} />
          </div>
          <Btn onClick={() => onStartDay(currentDayData)} style={{ borderRadius: 50 }}>
            Start today's rep →
          </Btn>
        </Card>
      </div>

      {/* ── Your Tracks ── */}
      <SectionLabel>Your Tracks</SectionLabel>
      {sortedTracks.map((track) => (
        <button
          key={track.id}
          onClick={() => { setActiveTrack(track); setScreen('track-scenarios') }}
          style={{
            width: '100%', textAlign: 'left', marginBottom: 12, padding: '16px 20px',
            borderRadius: 16, border: `1px solid ${C.border}`,
            background: TRACK_BG[track.id] || C.surface,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,.06)',
            transition: 'transform .15s ease, box-shadow .15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.005)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,.09)' }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.06)' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1, minWidth: 0 }}>
            <span style={{ marginTop: 2, flexShrink: 0, display: 'flex' }}><LineIcon id={track.id} color={C.blue} size={24} /></span>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 600, color: C.blue, marginBottom: 4 }}>
                {track.title}
              </p>
              <p style={{ fontFamily: SANS, fontSize: 13, color: C.inkMid, lineHeight: 1.4 }}>
                {track.tagline}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginLeft: 14, flexShrink: 0 }}>
            <span style={{ fontFamily: SANS, fontSize: 11, color: C.inkFaint, whiteSpace: 'nowrap' }}>
              {track.scenarios.length} scenarios
            </span>
            <span style={{ color: C.coral, fontSize: 16 }}>→</span>
          </div>
        </button>
      ))}

      {/* ── Recent Sessions ── */}
      {sessions.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <SectionLabel>Recent Sessions</SectionLabel>
          {sessions.slice(-2).reverse().map((s) => {
            const trackMatch = findTrackScenario(s.scenario)
            const rehearsal = (s.rehearsalId || (typeof s.scenario === 'string' && s.scenario.startsWith('r_')))
              ? rehearsals.find((r) => r.id === (s.rehearsalId || s.scenario))
              : null
            const chip = (s.rehearsalId || rehearsal || s.title)
              ? { icon: <span style={{ color: C.coral, fontSize: 18 }}>✦</span>, label: s.title || rehearsal?.title || 'Rehearsal' }
              : trackMatch
                ? { icon: <LineIcon id={trackMatch.track.id} color={C.blue} size={20} />, label: trackMatch.scenario.title }
                : { icon: <LineIcon id="chat" color={C.blue} size={20} />, label: SCENARIO_CHIPS.find((c) => c.id === s.scenario)?.label || s.scenario || 'Session' }
            return (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 0', borderBottom: `1px solid ${C.border}`,
              }}>
                <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{chip.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: SANS, color: C.ink, fontSize: 14, fontWeight: 600, marginBottom: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{chip.label}</p>
                  {s.feedback?.coachNote && (
                    <p style={{
                      fontFamily: SANS, color: C.inkFaint, fontSize: 12, lineHeight: 1.4,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{s.feedback.coachNote}</p>
                  )}
                </div>
                <button onClick={() => onResumeSession(s)} style={{
                  background: 'none', border: 'none', color: C.coral,
                  fontSize: 13, fontWeight: 700, fontFamily: SANS, flexShrink: 0,
                }}>View →</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════
// COACH EXPERIENCE — CONSTANTS
// ═══════════════════════════════════════════════
const LIFE_AREAS = [
  { id: 'work',          icon: 'work',          label: 'Work & Career'    },
  { id: 'relationships', icon: 'relationships', label: 'Relationships'    },
  { id: 'family',        icon: 'family',        label: 'Family'          },
  { id: 'clarity',       icon: 'clarity',       label: 'Personal Clarity' },
]
// Maps a life area to its LineIcon id (sessions may also carry legacy emoji
// strings in lifeAreaIcon — render sites fall back to the area id instead).
const AREA_META = { work: 'work', relationships: 'relationships', family: 'family', clarity: 'clarity', thinking: 'thought' }

const SITUATION_QUESTIONS = {
  work:          "What's the work situation on your mind? Describe it as if you're telling a trusted colleague.",
  relationships: "What's happening in this relationship that you want to think through?",
  family:        "What's the family situation you're navigating right now?",
  clarity:       "What's the thing you keep thinking about but haven't been able to resolve?",
}
const OBSTACLE_QUESTION = "What makes this hard for you personally? Not the situation itself — but what about it feels difficult or stuck?"
const OUTCOME_QUESTION   = "When you imagine this going well — what does that actually look like? What would feel like a good outcome?"

// ═══════════════════════════════════════════════
// COACH ENTRY SCREEN
// ═══════════════════════════════════════════════
function CoachScreen({ sessions, setScreen, onStartMode }) {
  const coachSessions = sessions.filter((s) => s.type === 'coach').slice(-2).reverse()

  const ModeCard = ({ icon, title, desc, btnLabel, mode }) => (
    <div style={{
      background: C.surface, borderRadius: 18, border: `1px solid ${C.border}`,
      padding: '24px', marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <span style={{
          width: 44, height: 44, borderRadius: 12, background: C.coralBg, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><LineIcon id={icon} color={C.coral} size={24} /></span>
        <p style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 600, color: C.blue, lineHeight: 1.2 }}>{title}</p>
      </div>
      <p style={{ fontFamily: SANS, fontSize: 14, color: C.inkMid, lineHeight: 1.65, marginBottom: 20 }}>{desc}</p>
      <Btn onClick={() => onStartMode(mode)} style={{ borderRadius: 50 }}>{btnLabel}</Btn>
    </div>
  )

  return (
    <div className="fade-up" style={{ padding: '36px 20px calc(120px + env(safe-area-inset-bottom, 0px))' }}>
      <p style={{
        fontFamily: SANS, fontSize: 11, fontWeight: 600, letterSpacing: '.08em',
        textTransform: 'uppercase', color: C.inkSoft, marginBottom: 8,
      }}>Coach</p>
      <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 700, color: C.ink, marginBottom: 6, lineHeight: 1.3 }}>
        Not every hard conversation fits a scenario.
      </h1>
      <p style={{ fontFamily: SANS, fontSize: 15, color: C.inkMid, marginBottom: 28, lineHeight: 1.55 }}>
        Use the coach for anything on your mind — work, people, decisions, or just thinking out loud.
      </p>

      <ModeCard
        icon="compass"
        title="I have a situation to work through"
        desc="A conversation coming up, a decision you're stuck on, or something you need to prepare for. Walk through it with your coach."
        btnLabel="Let's work on it →"
        mode="specific"
      />
      <ModeCard
        icon="thought"
        title="I just need to think"
        desc="No agenda. Something is sitting with you and you're not sure what you need yet. Just start."
        btnLabel="Start talking →"
        mode="thinking"
      />

      {coachSessions.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <p style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.blueDeep, marginBottom: 14 }}>
            Recent Coach Sessions
          </p>
          {coachSessions.map((s) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ flexShrink: 0, display: 'flex' }}><LineIcon id={AREA_META[s.lifeArea] || 'thought'} color={C.blue} size={19} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: SANS, color: C.ink, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.label || 'Coaching session'}
                </p>
                <p style={{ fontFamily: SANS, color: C.inkFaint, fontSize: 12 }}>{s.date}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════
// COACH AREA SCREEN (life area selector)
// ═══════════════════════════════════════════════
function CoachAreaScreen({ setScreen, onSelectArea }) {
  return (
    <div className="fade-up" style={{ padding: '36px 20px calc(120px + env(safe-area-inset-bottom, 0px))' }}>
      <SubHeader title="Coach" onBack={() => setScreen('coach')} />
      <p style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, color: C.ink, marginBottom: 6, lineHeight: 1.35 }}>
        What area is this in?
      </p>
      <p style={{ fontFamily: SANS, fontSize: 14, color: C.inkMid, marginBottom: 28 }}>
        This helps the Coach ask the right questions.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {LIFE_AREAS.map((area) => (
          <button
            key={area.id}
            onClick={() => onSelectArea(area.id)}
            style={{
              padding: '24px 16px', borderRadius: 16, border: `1.5px solid ${C.border}`,
              background: C.surface, textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,.06)',
              transition: 'border-color .15s, background .15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.background = C.blueBg }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.surface }}
          >
            <span style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><LineIcon id={area.icon} color={C.blue} size={28} /></span>
            <p style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: C.ink, lineHeight: 1.3 }}>{area.label}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// COACH GUIDED SCREEN (3 questions)
// ═══════════════════════════════════════════════
function CoachGuidedScreen({ lifeArea, setScreen, onComplete }) {
  const [step, setStep]   = useState(0)
  const [answers, setAnswers] = useState({ situation: '', obstacle: '', outcome: '' })
  const [current, setCurrent] = useState('')

  const STEPS = [
    { key: 'situation', question: SITUATION_QUESTIONS[lifeArea] || SITUATION_QUESTIONS.work },
    { key: 'obstacle',  question: OBSTACLE_QUESTION },
    { key: 'outcome',   question: OUTCOME_QUESTION  },
  ]

  const goBack = () => {
    if (step > 0) { setStep((s) => s - 1); setCurrent(answers[STEPS[step - 1].key]) }
    else setScreen('coach-area')
  }

  const next = () => {
    if (current.trim().length < 5) return
    const key = STEPS[step].key
    const newAnswers = { ...answers, [key]: current.trim() }
    setAnswers(newAnswers)
    if (step < 2) { setStep((s) => s + 1); setCurrent('') }
    else onComplete(newAnswers)
  }

  return (
    <div className="fade-up" style={{ padding: '36px 20px calc(120px + env(safe-area-inset-bottom, 0px))' }}>
      <SubHeader title="Coach" onBack={goBack} />

      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 4,
            background: i <= step ? C.blue : C.border,
            transition: 'background .3s',
          }} />
        ))}
      </div>

      <p style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.blueDeep, marginBottom: 14 }}>
        Question {step + 1} of 3
      </p>
      <p style={{ fontFamily: SERIF, fontSize: 19, color: C.ink, lineHeight: 1.55, marginBottom: 24 }}>
        {STEPS[step].question}
      </p>

      <VoiceTextarea value={current} onChange={setCurrent} placeholder="Take your time…" minHeight={140} />

      <div style={{ marginTop: 20 }}>
        <Btn onClick={next} disabled={current.trim().length < 5}>
          {step < 2 ? 'Next →' : 'Talk to Coach →'}
        </Btn>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// COACH FREEFORM SCREEN (mode 2 entry)
// ═══════════════════════════════════════════════
function CoachFreeformScreen({ setScreen, onStart }) {
  const [text, setText] = useState('')
  return (
    <div className="fade-up" style={{ padding: '36px 20px calc(120px + env(safe-area-inset-bottom, 0px))' }}>
      <SubHeader title="Coach" onBack={() => setScreen('coach')} />
      <p style={{ fontFamily: SERIF, fontSize: 17, color: C.inkMid, lineHeight: 1.65, marginBottom: 10 }}>
        Just start wherever feels right. There's no wrong way to begin.
      </p>
      <p style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 600, color: C.ink, marginBottom: 24 }}>
        What's on your mind?
      </p>
      <VoiceTextarea value={text} onChange={setText} placeholder="Type or speak whatever is with you right now…" minHeight={200} />
      <div style={{ marginTop: 20 }}>
        <Btn onClick={() => text.trim().length >= 10 && onStart(text.trim())} disabled={text.trim().length < 10}
          style={{ borderRadius: 50 }}>
          I'm ready →
        </Btn>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// COACH CONVERSATION SCREEN
// ═══════════════════════════════════════════════
function CoachConversationScreen({ coachSession, setScreen, onWrapUp }) {
  const [messages, setMessages] = useState([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(true)
  const rec        = useVoiceRecorder()
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)
  const initialCtx = useRef('')

  // Build the initial user message from session data
  useEffect(() => {
    let ctx = ''
    if (coachSession?.mode === 'thinking') {
      ctx = coachSession.freeformText || ''
    } else if (coachSession?.mode === 'specific' && coachSession?.guidedAnswers) {
      const { situation, obstacle, outcome } = coachSession.guidedAnswers
      ctx = [
        situation && `My situation: ${situation}`,
        obstacle  && `What makes it hard: ${obstacle}`,
        outcome   && `What good looks like: ${outcome}`,
      ].filter(Boolean).join('\n\n')
    }
    initialCtx.current = ctx
    fetchCoach([], ctx)
  }, [])

  const scrollDown = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)

  const fetchCoach = async (history, userMessage) => {
    setLoading(true)
    try {
      const res = await fetch('/api/coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'coach',
          coachMode: coachSession?.mode,
          lifeArea: coachSession?.lifeArea,
          guidedAnswers: coachSession?.guidedAnswers,
          userMessage,
          sessionHistory: history,
        }),
      })
      const data = await res.json()
      setMessages((prev) => [...prev, { role: 'coach', content: data.reply }])
    } catch {
      setMessages((prev) => [...prev, { role: 'coach', content: "I'm here. Take your time." }])
    } finally {
      setLoading(false)
      scrollDown()
    }
  }

  // Tap to record → tap again to stop & transcribe (appended to the input).
  const toggleMic = async () => {
    if (rec.recording) {
      const text = await rec.stopAndTranscribe()
      if (text) setInput((prev) => (prev ? (prev.trim() + ' ' + text).trim() : text))
    } else if (!rec.transcribing) {
      rec.start()
    }
  }

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    if (rec.recording) rec.cancel()

    const userMsg   = { role: 'user', content: text }
    const nextMsgs  = [...messages, userMsg]
    setMessages(nextMsgs)
    setInput('')
    scrollDown()

    // Build full history: initial context + all displayed messages except current
    const history = []
    if (initialCtx.current) history.push({ role: 'user', content: initialCtx.current })
    for (const m of messages) {
      history.push({ role: m.role === 'coach' ? 'assistant' : 'user', content: m.content })
    }

    await fetchCoach(history, text)
    inputRef.current?.focus()
  }

  const areaIcon  = AREA_META[coachSession?.lifeArea || 'thinking'] || 'thought'
  const areaLabel = coachSession?.situationLabel || (coachSession?.mode === 'thinking' ? 'Thinking out loud' : 'Personal session')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: C.bg }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, background: C.surface, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => setScreen('coach')} style={{ background: 'none', border: 'none', color: C.inkSoft, fontSize: 20 }}>←</button>
        <CoachAvatar size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: SANS, fontWeight: 700, color: C.ink, fontSize: 14 }}>Coach</p>
          <p style={{ fontFamily: SANS, color: C.inkSoft, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
            <LineIcon id={areaIcon} color={C.inkSoft} size={13} /> {areaLabel}
          </p>
        </div>
        <button
          onClick={() => onWrapUp(messages)}
          style={{ background: 'none', border: 'none', color: C.blue, fontSize: 13, fontWeight: 600, fontFamily: SANS, flexShrink: 0 }}
        >
          Wrap up
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && messages.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CoachAvatar size={28} />
            <div style={{ padding: '12px 16px', borderRadius: '16px 16px 16px 4px', background: C.surface, border: `1px solid ${C.border}` }}>
              <Dots />
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}>
            {m.role === 'coach' && <CoachAvatar size={26} />}
            <div style={{
              maxWidth: '80%', padding: '12px 16px',
              background: m.role === 'user' ? C.blue : C.surface,
              color: m.role === 'user' ? '#fff' : C.ink,
              fontSize: 15, lineHeight: 1.65, fontFamily: SERIF,
              border: m.role === 'coach' ? `1px solid ${C.border}` : 'none',
              borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && messages.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CoachAvatar size={26} />
            <div style={{ padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: C.surface, border: `1px solid ${C.border}` }}>
              <Dots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, background: C.surface }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={rec.transcribing ? 'Transcribing…' : rec.recording ? 'Recording — tap ■ when done' : 'Reply…'}
              style={{
                width: '100%', padding: '12px 46px 12px 16px', borderRadius: 12,
                border: `1.5px solid ${rec.recording ? C.blue : C.border}`,
                background: rec.recording ? C.blueBg : C.bg,
                fontSize: 15, color: C.ink, fontFamily: SERIF,
                transition: 'border-color .15s, background .15s',
              }}
            />
            <button onClick={toggleMic} disabled={rec.transcribing} style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              width: 30, height: 30, borderRadius: '50%', border: 'none',
              background: rec.recording ? C.blue : C.border,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: rec.recording ? 'recordPulse 1.5s ease-in-out infinite' : 'none',
              transition: 'background .2s',
            }}>
              {rec.recording ? (
                <span style={{ width: 11, height: 11, borderRadius: 2, background: '#fff', display: 'block' }} />
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke={C.inkSoft} strokeWidth="2" strokeLinecap="round">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>
          </div>
          <button onClick={send} disabled={!input.trim() || loading} style={{
            background: !input.trim() || loading ? C.blueDim : C.blue,
            color: '#fff', border: 'none', borderRadius: 12,
            padding: '0 18px', fontSize: 18, fontWeight: 700, height: 46, flexShrink: 0,
          }}>→</button>
        </div>
        {rec.error && !rec.recording && !rec.transcribing && (
          <p style={{ fontFamily: SANS, fontSize: 12, color: C.coral, marginTop: 8, lineHeight: 1.4 }}>{rec.error}</p>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// COACH DEBRIEF SCREEN
// ═══════════════════════════════════════════════
function CoachDebriefScreen({ coachSession, setScreen, setSessions, sessions }) {
  const [debrief,    setDebrief]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [reflection, setReflection] = useState('')
  const [saved,      setSaved]      = useState(false)

  useEffect(() => {
    const msgs = coachSession?.messages || []
    if (msgs.length === 0) {
      setDebrief({ insight: 'You showed up and started a conversation with yourself — that takes courage.', nextStep: 'Sit with what came up before deciding what to do.' })
      setLoading(false)
      return
    }
    fetch('/api/coaching', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'coach-debrief', sessionHistory: msgs }),
    })
      .then((r) => r.json())
      .then((d) => setDebrief(d))
      .catch(() => setDebrief({ insight: 'Something shifted in this conversation.', nextStep: 'Give yourself time to let it settle.' }))
      .finally(() => setLoading(false))
  }, [])

  const save = () => {
    const newSession = {
      id: Date.now(),
      type: 'coach',
      date: new Date().toLocaleDateString(),
      mode: coachSession?.mode,
      lifeArea: coachSession?.lifeArea,
      lifeAreaIcon: AREA_META[coachSession?.lifeArea] || 'thought',
      label: coachSession?.situationLabel || 'Coaching session',
      messages: coachSession?.messages || [],
      reflection,
      debrief,
      completed: true,
    }
    const updated = [...sessions, newSession]
    setSessions(updated)
    lsSet(LS.sessions, updated)
    setSaved(true)
  }

  return (
    <div className="fade-up" style={{ padding: '36px 20px calc(120px + env(safe-area-inset-bottom, 0px))' }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.blueDeep, marginBottom: 8 }}>
          Session complete
        </p>
        <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 700, color: C.ink }}>Wrap-up</h1>
      </div>

      {loading ? (
        <Card style={{ textAlign: 'center', padding: '32px' }}>
          <Dots />
          <p style={{ fontFamily: SANS, color: C.inkSoft, fontSize: 14, marginTop: 12 }}>Reflecting on your session…</p>
        </Card>
      ) : (
        <>
          <Card bg={C.blueBg} border={C.blueDim} style={{ marginBottom: 14 }}>
            <p style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: C.blue, letterSpacing: '.06em', marginBottom: 8 }}>
              ONE THING THAT STOOD OUT
            </p>
            <p style={{ fontFamily: SERIF, color: C.ink, fontSize: 15, lineHeight: 1.65 }}>{debrief?.insight}</p>
          </Card>

          <Card bg={C.tealBg} border="transparent" style={{ marginBottom: 24 }}>
            <p style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: C.teal, letterSpacing: '.06em', marginBottom: 8 }}>
              SOMETHING TO CARRY FORWARD
            </p>
            <p style={{ fontFamily: SERIF, color: C.ink, fontSize: 15, lineHeight: 1.65 }}>{debrief?.nextStep}</p>
          </Card>

          <div style={{ marginBottom: 20 }}>
            <p style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: C.inkMid, marginBottom: 12 }}>
              What do you want to remember from this conversation?
            </p>
            <VoiceTextarea value={reflection} onChange={setReflection} placeholder="Your own words…" minHeight={100} />
          </div>

          {saved ? (
            <div style={{ textAlign: 'center', padding: '14px', borderRadius: 14, background: C.tealBg, marginBottom: 14 }}>
              <p style={{ fontFamily: SANS, color: C.teal, fontWeight: 700 }}>✓ Saved</p>
            </div>
          ) : (
            <Btn onClick={save} style={{ marginBottom: 12 }}>Save reflection</Btn>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="secondary" onClick={() => setScreen('coach')} style={{ flex: 1 }}>Back to Coach</Btn>
            <Btn variant="secondary" onClick={() => setScreen('home')} style={{ flex: 1 }}>Home</Btn>
          </div>
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════
// PRACTICE SCREEN
// ═══════════════════════════════════════════════
function PracticeScreen({ session, setScreen, onFeedback, user }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState(false)

  const chip = SCENARIO_CHIPS.find((c) => c.id === session?.scenario)

  const submit = async () => {
    if (text.trim().length < 10 || loading) return
    setLoading(true)
    setSubmitError(false)
    try {
      const res = await fetch('/api/coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            scenario: session?.context,
            userMessage: text.trim(),
            userName: user?.name,
            userRole: user?.role || 'all',
          }),
      })
      const data = await res.json()
      onFeedback({ feedback: data, userMessage: text.trim() })
      setScreen('feedback')
    } catch {
      setSubmitError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fade-up" style={{ padding: '28px 20px 120px' }}>
      <SubHeader title="Practice" onBack={() => setScreen('coach')} />

      {/* Scenario card */}
      <Card bg={C.coralBg} border={C.coralDim} style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <CoachAvatar size={28} />
          <span style={{ fontFamily: SANS, color: C.coral, fontSize: 11, fontWeight: 700, letterSpacing: '.06em' }}>
            YOUR SCENARIO {chip ? `· ${chip.label}` : ''}
          </span>
        </div>
        <p style={{ fontFamily: SERIF, color: C.ink, fontSize: 15, lineHeight: 1.65, fontStyle: 'italic' }}>
          {session?.context}
        </p>
      </Card>

      {/* Coach prompt */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}>
        <CoachAvatar size={36} />
        <Card style={{ flex: 1, padding: '14px 16px' }}>
          <p style={{ fontFamily: SERIF, color: C.ink, fontSize: 15, lineHeight: 1.65 }}>
            Say what you'd say. What do you want the other person to understand?
          </p>
        </Card>
      </div>

      <VoiceTextarea
        value={text}
        onChange={setText}
        placeholder="Type or speak what you want to say…"
        minHeight={160}
      />
      <p style={{ fontFamily: SANS, color: C.inkFaint, fontSize: 12, marginTop: 6, marginBottom: 20 }}>
        {text.length} characters · aim for at least a sentence or two
      </p>

      {submitError && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px', marginBottom: 12 }}>
          <p style={{ fontFamily: SANS, fontSize: 13, color: '#B91C1C', lineHeight: 1.5 }}>
            The coach took too long to respond — tap below to try again.
          </p>
        </div>
      )}
      {loading ? (
        <Card style={{ textAlign: 'center', padding: '20px' }}>
          <Dots />
          <p style={{ fontFamily: SERIF, color: C.inkSoft, fontSize: 15, fontStyle: 'italic', marginTop: 8 }}>
            Your coach is reading this…
          </p>
        </Card>
      ) : (
        <Btn onClick={submit} disabled={text.trim().length < 10}>
          Get my coaching →
        </Btn>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════
// FEEDBACK SCREEN
// ═══════════════════════════════════════════════
function FeedbackScreen({ session, setScreen, setSessions, sessions, storylab, setStorylab }) {
  const [revealed, setRevealed] = useState(false)
  const { feedback, userMessage } = session

  const complete = () => {
    const newSession = {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      scenario: session.scenario,
      context: session.context,
      userMessage,
      feedback,
      completed: true,
    }
    const updated = [...sessions, newSession]
    setSessions(updated)
    lsSet(LS.sessions, updated)

    // Advance Storylab day when a mission is completed
    if (session.scenario === 'storylab' && storylab && setStorylab) {
      const currentDay = storylab.currentDay || 1
      const completedDays = storylab.completedDays || []
      if (!completedDays.includes(currentDay)) {
        const newCompleted = [...completedDays, currentDay]
        const nextDay = Math.min(currentDay + 1, 30)
        setStorylab({ currentDay: nextDay, completedDays: newCompleted })
      }
    }

    setScreen('home')
  }

  if (!feedback) return null

  return (
    <div className="fade-up" style={{ padding: '28px 20px calc(120px + env(safe-area-inset-bottom, 0px))' }}>
      <SubHeader title="Your coaching" onBack={() => setScreen('practice')} />

      {/* What you said */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontFamily: SANS, color: C.inkSoft, fontSize: 11, fontWeight: 700, letterSpacing: '.07em', marginBottom: 8 }}>
          WHAT YOU SAID
        </p>
        <Card style={{ borderLeft: `3px solid ${C.border}` }}>
          <p style={{ fontFamily: SERIF, color: C.inkMid, fontSize: 15, lineHeight: 1.7, fontStyle: 'italic' }}>
            "{userMessage}"
          </p>
        </Card>
      </div>

      {/* Strengths */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontFamily: SANS, color: C.teal, fontSize: 11, fontWeight: 700, letterSpacing: '.07em', marginBottom: 10 }}>
          WHAT LANDED
        </p>
        {feedback.strengths?.map((s, i) => (
          <Card key={i} bg={C.tealBg} border="transparent" style={{ marginBottom: 10 }}>
            <p style={{ fontFamily: SANS, color: C.teal, fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{s.label}</p>
            <p style={{ fontFamily: SERIF, color: C.inkMid, fontSize: 14, lineHeight: 1.65 }}>{s.note}</p>
          </Card>
        ))}
      </div>

      {/* Sharpen */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontFamily: SANS, color: C.blue, fontSize: 11, fontWeight: 700, letterSpacing: '.07em', marginBottom: 10 }}>
          ONE THING TO SHARPEN
        </p>
        <Card bg={C.blueBg} border="transparent">
          <p style={{ fontFamily: SANS, color: C.blue, fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{feedback.sharpen?.label}</p>
          <p style={{ fontFamily: SERIF, color: C.inkMid, fontSize: 14, lineHeight: 1.65 }}>{feedback.sharpen?.note}</p>
        </Card>
      </div>

      {/* Coach note */}
      {feedback.coachNote && (
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-start', padding: '14px 16px',
          borderRadius: 14, background: C.coralBg, marginBottom: 16,
        }}>
          <CoachAvatar size={28} />
          <p style={{ fontFamily: SERIF, color: C.coral, fontSize: 14, lineHeight: 1.6, fontStyle: 'italic' }}>
            {feedback.coachNote}
          </p>
        </div>
      )}

      {/* Rewrite — hidden behind reveal */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => setRevealed((r) => !r)}
          style={{
            width: '100%', padding: '14px 20px', borderRadius: 14,
            background: `linear-gradient(135deg, ${C.coral}, ${C.coralLight})`,
            border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: SANS,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <span>Try it like this</span>
          <span style={{ transform: revealed ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .2s' }}>▼</span>
        </button>

        {revealed && (
          <div className="fade-in" style={{
            marginTop: 1, padding: '18px 20px', borderRadius: '0 0 14px 14px',
            background: C.coralBg, border: `1px solid ${C.coralDim}`, borderTop: 'none',
          }}>
            <p style={{ fontFamily: SERIF, color: C.ink, fontSize: 16, lineHeight: 1.8, fontStyle: 'italic', marginBottom: 14 }}>
              "{feedback.rewrite}"
            </p>
            <Btn
              onClick={() => { setScreen('share') }}
              variant="secondary"
              style={{ fontSize: 13, padding: '10px' }}
            >
              Share this message ↗
            </Btn>
          </div>
        )}
      </div>

      {/* CTAs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={() => setScreen('simulation')}
          style={{
            width: '100%', padding: '16px', borderRadius: 14,
            background: C.blueBg, border: `1px solid ${C.blueDim}`,
            color: C.blue, fontSize: 15, fontWeight: 700, fontFamily: SANS,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <span>Continue the conversation</span>
          <span>→</span>
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="secondary" onClick={() => setScreen('practice')} style={{ flex: 1, padding: '13px' }}>
            Try again
          </Btn>
          <Btn onClick={complete} style={{ flex: 2, padding: '13px' }}>
            Session complete ✓
          </Btn>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// SIMULATION SCREEN
// ═══════════════════════════════════════════════
function SimulationScreen({ session, setScreen, setSessions, sessions, onSaveMessages, onEnd, onComplete }) {
  const [messages, setMessages] = useState(() => {
    // Restore saved messages if the user is resuming
    if (session?.messages?.length > 0) return session.messages

    const msgs = [
      { role: 'coach', content: session?.scenarioData
          ? `In character as ${session.scenarioData.counterpartRole.split('—')[0].trim()}. Go whenever you're ready.`
          : "In character. Respond naturally — I'll follow your lead." },
    ]
    // Pre-load the scenario's opening line so the user responds to it immediately
    if (session?.scenarioData?.opening_line) {
      msgs.push({ role: 'other', content: session.scenarioData.opening_line })
    }
    return msgs
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hintLoading, setHintLoading] = useState(false)
  // Restore turn count from saved messages (count user turns)
  const [turn, setTurn] = useState(() =>
    session?.messages?.filter((m) => m.role === 'user').length || 0
  )
  // Restore done state: a coach message after position 0 means the session ended
  const [done, setDone] = useState(() =>
    session?.messages?.slice(1).some((m) => m.role === 'coach') || false
  )
  const [listening, setListening] = useState(false)
  const [sendError, setSendError] = useState(false)  // true = last API call failed, show retry
  // ── Voice mode ──────────────────────────────────────────────────────────────
  const [voiceEnabled, setVoiceEnabled] = useState(() => session?.voiceEnabled !== false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [ttsError,  setTtsError]  = useState(null)   // null = ok, string = error message to show
  // Opening line needs a user-gesture tap on iOS before audio can play.
  // If voice is on and there's an opening line, show a "Tap to begin" button first.
  const hasOpeningLine = !!(voiceEnabled && session?.scenarioData?.opening_line && !(session?.messages?.length > 0))
  const [needsOpeningTap, setNeedsOpeningTap] = useState(hasOpeningLine)
  const audioElRef        = useRef(null)   // single persistent <audio> element (pre-unlocked)
  const audioBlobUrlRef   = useRef(null)   // current blob URL (for cleanup)
  // ── Voice input via MediaRecorder + Whisper (iOS-reliable; replaces Web Speech API) ──
  const [transcribing, setTranscribing] = useState(false)  // true while Whisper is processing
  const mediaRecorderRef = useRef(null)
  const mediaStreamRef   = useRef(null)
  const audioChunksRef   = useRef([])
  const recMimeRef       = useRef('audio/mp4')
  // ────────────────────────────────────────────────────────────────────────────
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const finalRef = useRef('')


  // Create the single persistent audio element on mount.
  // Reusing one element is required for iOS — once unlocked via a user-gesture
  // play(), the same element can play new src values from async contexts.
  useEffect(() => {
    const el = new Audio()
    el.preload = 'auto'
    audioElRef.current = el
    return () => { el.pause(); el.src = '' }
  }, [])

  // Play a silent WAV on the element once per session to satisfy iOS/Safari's
  // requirement that audio playback be triggered by a user gesture.
  const unlockAudio = () => {
    const el = audioElRef.current
    if (!el || el.dataset.unlocked) return
    el.dataset.unlocked = '1'
    el.src = SILENT_WAV
    el.play().catch(() => {})
  }

  // releaseForMic: true when called by user gesture (interrupt / session end).
  // Clears el.src so iOS releases the "playback" audio session before the mic starts.
  // Safe because speak() is always async — the stale src='' error fires during
  // the await fetch/blob gap, before the next el.onerror handler is attached.
  const stopSpeaking = (releaseForMic = false) => {
    const el = audioElRef.current
    if (el) {
      el.onended = null
      el.onerror = null
      if (!el.paused) el.pause()
      if (releaseForMic) {
        // Release audio session so iOS can switch to record mode for the mic.
        el.src = ''
      }
    }
    if (audioBlobUrlRef.current) {
      URL.revokeObjectURL(audioBlobUrlRef.current)
      audioBlobUrlRef.current = null
    }
    setIsPlaying(false)
  }

  const speak = async (text, voice = 'onyx') => {
    if (!text) return

    // Strip roleplay action cues before sending to TTS — they sound wrong
    // when read aloud (*sighs*, *looks confused*, [frustrated], etc.).
    // The full text (with cues) is still shown in the chat bubble.
    const spoken = text
      .replace(/\*[^*\n]+\*/g, '')   // *action cues*
      .replace(/\[[^\]\n]+\]/g, '')  // [action cues]
      .replace(/\s{2,}/g, ' ')
      .trim()
    if (!spoken) return  // nothing left to say after stripping

    stopSpeaking()
    setIsPlaying(true)
    setTtsError(null)

    try {
      const ttsText = spoken.length > 500 ? spoken.slice(0, 497) + '…' : spoken
      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ttsText, voice }),
      })

      if (!res.ok) {
        let msg = `API error ${res.status}`
        try { const j = await res.json(); msg = j.error || msg } catch {}
        console.error('[TTS] API error:', msg)
        setIsPlaying(false)
        setTtsError(msg)
        return
      }

      const blob = await res.blob()
      if (blob.size === 0) {
        setIsPlaying(false)
        setTtsError('Empty audio response from OpenAI')
        return
      }

      const url = URL.createObjectURL(blob)
      audioBlobUrlRef.current = url

      const el = audioElRef.current
      if (!el) { setIsPlaying(false); return }

      // Attach handlers BEFORE setting src so no events are missed.
      el.onended = () => {
        URL.revokeObjectURL(url)
        audioBlobUrlRef.current = null
        el.onended = null
        el.onerror = null   // cleared before src change — harmless error below
        setIsPlaying(false)
        // Set src='' to signal iOS the audio element is done so it can release
        // the "playback" audio session. Do NOT call el.load() — that re-activates
        // the element and keeps the session alive longer.
        // The empty-src error fires on the now-null onerror → no harm.
        el.src = ''
        // No mic-handoff delay needed: MediaRecorder (unlike Web Speech API) works
        // immediately after playback, so "Tap to speak" appears instantly.
      }
      el.onerror = (e) => {
        console.error('[TTS] Audio element error:', e)
        URL.revokeObjectURL(url)
        audioBlobUrlRef.current = null
        el.onended = null
        el.onerror = null
        setIsPlaying(false)
        setTtsError('Audio playback failed — try refreshing')
      }
      // Set src after handlers; the browser queues load events on the same tick.
      el.src = url

      const playPromise = el.play()
      if (playPromise) {
        playPromise.catch((err) => {
          console.error('[TTS] play() blocked:', err.name)
          setIsPlaying(false)
          setTtsError(`Playback blocked (${err.name}) — tap Send first to unlock audio`)
        })
      }
    } catch (err) {
      console.error('[TTS] speak() error:', err)
      setIsPlaying(false)
      setTtsError(err?.message || 'Unexpected TTS error')
    }
  }

  // Opening line is triggered by user tap (handleBegin) to satisfy iOS audio unlock requirement.
  // If voice is off, or session is being resumed, no tap needed — opening line already in chat.

  // ── Voice input: MediaRecorder → OpenAI Whisper ────────────────────────────
  // We do NOT use webkitSpeechRecognition: on iOS Safari it silently stops
  // producing results once any <audio> element has played (our TTS reply) —
  // the mic "records" forever but onresult never fires. MediaRecorder +
  // server-side Whisper transcription is reliable turn after turn on iOS.

  // Called when user taps "Tap to hear the opening" — satisfies iOS audio gesture requirement
  const handleBegin = () => {
    unlockAudio()
    setNeedsOpeningTap(false)
    speak(session.scenarioData.opening_line, session.scenarioData.voice || 'onyx')
  }

  // Choose a recording container Safari/Chrome support and Whisper accepts.
  const pickMime = () => {
    if (typeof MediaRecorder === 'undefined') return ''
    const candidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg']
    for (const m of candidates) {
      try { if (MediaRecorder.isTypeSupported(m)) return m } catch {}
    }
    return ''
  }

  const releaseMicStream = () => {
    try { mediaStreamRef.current?.getTracks().forEach((t) => t.stop()) } catch {}
    mediaStreamRef.current = null
  }

  const startRecording = async () => {
    unlockAudio()
    setTtsError(null)
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setTtsError('Voice recording is not supported in this browser.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      const mime = pickMime()
      recMimeRef.current = mime || 'audio/mp4'
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      audioChunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data) }
      mediaRecorderRef.current = mr
      mr.start()
      setListening(true)
    } catch (err) {
      console.error('[mic] getUserMedia failed:', err?.name, err?.message)
      releaseMicStream()
      setListening(false)
      if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
        setTtsError('Microphone access denied — enable it in Safari settings, then reload.')
      } else {
        setTtsError('Could not access the microphone — try again.')
      }
    }
  }

  // Stop the recorder, transcribe via Whisper, then either send (voice mode)
  // or fill the input (text mode) depending on autoSend.
  const finishRecording = async (autoSend) => {
    const mr = mediaRecorderRef.current
    if (!mr) { setListening(false); return }
    mediaRecorderRef.current = null
    setListening(false)
    setTranscribing(true)

    // Wait for the recorder to flush its final chunk before building the blob.
    const blob = await new Promise((resolve) => {
      mr.addEventListener('stop', () => {
        resolve(new Blob(audioChunksRef.current, { type: recMimeRef.current }))
      }, { once: true })
      try { mr.stop() } catch { resolve(new Blob(audioChunksRef.current, { type: recMimeRef.current })) }
    })
    releaseMicStream()

    try {
      if (!blob || blob.size === 0) {
        setTranscribing(false)
        setTtsError('No audio captured — hold a moment longer before stopping.')
        return
      }
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': recMimeRef.current },
        body: blob,
      })
      const data = await res.json().catch(() => ({}))
      setTranscribing(false)
      const text = (data.text || '').trim()
      if (!res.ok || !text) {
        setTtsError(data.error || "Didn't catch that — tap to try again.")
        return
      }
      if (autoSend) send(text)
      else setInput((prev) => (prev ? (prev + ' ' + text).trim() : text))
    } catch (err) {
      console.error('[transcribe] client error:', err?.message)
      setTranscribing(false)
      setTtsError('Transcription failed — check your connection and try again.')
    }
  }

  const cancelRecording = () => {
    const mr = mediaRecorderRef.current
    mediaRecorderRef.current = null
    audioChunksRef.current = []
    try { mr?.stop() } catch {}
    releaseMicStream()
    setListening(false)
  }

  // Text-mode mic button: tap to start, tap again to stop + fill the input box.
  const toggleMic = () => {
    if (listening) finishRecording(false)
    else if (!transcribing) startRecording()
  }

  // Release the mic hardware if the screen unmounts mid-recording.
  useEffect(() => () => releaseMicStream(), [])

  const scrollDown = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)

  const DEBRIEF_TRIGGERS = ['feedback', 'done', 'end session', "that's enough", 'finish', 'wrap up', 'debrief']
  const wantsDebrief = (msg) => DEBRIEF_TRIGGERS.some((t) => msg.toLowerCase().includes(t))

  const send = async (override) => {
    unlockAudio()  // satisfy iOS gesture requirement — must be called synchronously on tap
    const text = (typeof override === 'string' ? override : input).trim()
    if (!text || loading || done) return
    setSendError(false)

    const userMsg = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)
    scrollDown()

    // ── User-triggered debrief ───────────────────────────────────────────
    if (wantsDebrief(text) && turn >= 2) {
      try {
        const conversationHistory = next.filter((m) => m.role !== 'coach')
        const res = await fetch('/api/coaching', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'scenario-debrief',
            scenario: session?.scenarioData || session?.context,
            conversationHistory,
          }),
        })
        const debrief = await res.json()
        const summary = debrief.overall_summary || 'Session complete — good work showing up to practice.'
        const finalMsgs = [...next, { role: 'coach', content: summary }]
        setMessages(finalMsgs)
        setDone(true)
        onSaveMessages?.(finalMsgs)
        if (voiceEnabled) stopSpeaking()
      } catch {
        const finalMsgs = [...next, { role: 'coach', content: 'Session ended. Review the conversation above for your key moments.' }]
        setMessages(finalMsgs)
        setDone(true)
      } finally {
        setLoading(false)
        scrollDown()
      }
      return
    }

    try {
      const history = next
        .filter((m) => m.role !== 'coach')
        .map((m) => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'simulation',
          scenario: session?.scenarioData || session?.context,
          userMessage: text,
          sessionHistory: history.slice(0, -1),
          difficulty: session?.difficulty || 'medium',
          userRole: session?.userRole || 'all',
        }),
      })
      const data = await res.json()
      const newTurn = turn + 1
      setTurn(newTurn)

      const reply = data.reply || "Let's continue…"
      const hasCoach = reply.includes('[COACH]')
      const parts = hasCoach ? reply.split('[COACH]') : [reply, null]

      const counterpartText = parts[0].trim()
      const toAdd = [{ role: 'other', content: counterpartText }]
      if (parts[1]) {
        // AI decided to end — show coach note and mark done
        toAdd.push({ role: 'coach', content: parts[1].replace(':', '').trim() })
        setDone(true)
      } else if (newTurn >= 10) {
        // Hard safety cap — end without coach note after 10 turns
        setDone(true)
      }

      setMessages((prev) => [...prev, ...toAdd])

      // Speak the counterpart's reply in voice mode (don't speak the coach note)
      if (voiceEnabled) {
        speak(counterpartText, session?.scenarioData?.voice || 'onyx')
      }
    } catch {
      setSendError(true)
    } finally {
      setLoading(false)
      scrollDown()
      if (!voiceEnabled) inputRef.current?.focus()
    }
  }

  const handleEnd = (msgs = messages) => {
    const newSession = {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      scenario: session?.scenario,
      title: session?.scenarioData?.title,   // human-readable label for the session log
      rehearsalId: session?.rehearsalId || null,
      context: session?.context,
      messages: msgs,
      userMessage: session?.userMessage,
      feedback: session?.feedback,
      isDailyRep: session?.isDailyRep || false,
      dailyRepDay: session?.dailyRepDay,
      completed: true,
    }
    const updated = [...sessions, newSession]
    setSessions(updated)
    lsSet(LS.sessions, updated)
    // Save messages to currentSession so debrief can access them
    onSaveMessages?.(msgs)
    onComplete?.()  // e.g. increment rehearsal practiceCount
    if (session?.isDailyRep) {
      setScreen('daily-rep-debrief')
    } else {
      setScreen('scenario-debrief')
    }
  }

  const getHint = async () => {
    if (hintLoading || loading) return
    setHintLoading(true)
    try {
      const res = await fetch('/api/coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'simulation-hint',
          conversationHistory: messages,
          scenario: session?.scenarioData,
        }),
      })
      const data = await res.json()
      if (data.hint) {
        setMessages((prev) => [...prev, { role: 'hint', content: data.hint }])
        scrollDown()
      }
    } catch {
      // silent fail — hint is optional
    } finally {
      setHintLoading(false)
    }
  }

  const bgFor = (role) => {
    if (role === 'user')  return C.coral
    if (role === 'coach') return C.coralBg
    if (role === 'hint')  return C.blueBg
    return C.surface
  }
  const colorFor = (role) => {
    if (role === 'user') return '#fff'
    if (role === 'hint') return C.blueDeep
    return C.ink
  }

  const scenarioTitle = session?.scenarioData?.title || 'Role-play'
  const diffMeta = DIFFICULTY_META[session?.difficulty || 'medium'] || DIFFICULTY_META.medium

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: C.bg }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px', borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', gap: 10,
        background: C.surface, flexShrink: 0,
      }}>
        <button
          onClick={() => {
            onSaveMessages?.(messages)
            setScreen(session?.rehearsalId ? 'rehearse' : session?.scenarioData ? 'track-scenarios' : 'feedback')
          }}
          style={{ background: 'none', border: 'none', color: C.inkSoft, fontSize: 20, flexShrink: 0, padding: '4px 4px 4px 0' }}
        >←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: SANS, fontWeight: 700, color: C.ink, fontSize: 14,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{scenarioTitle}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={{
              fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: '.04em',
              color: diffMeta.color(C), background: diffMeta.bg(C),
              padding: '1px 7px', borderRadius: 20,
            }}>{diffMeta.label.toUpperCase()}</span>
            {session?.scenarioData?.userRole && (
              <span style={{ fontFamily: SANS, fontSize: 11, color: C.inkSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                You: {session.scenarioData.userRole.split('—')[0].trim().split(' or ')[0].trim().split(',')[0].trim()}
              </span>
            )}
          </div>
        </div>
        {/* Voice / Text mode toggle */}
        <button
          onClick={() => { if (isPlaying) stopSpeaking(true); setVoiceEnabled((v) => !v) }}
          style={{
            background: voiceEnabled ? C.blueBg : 'transparent',
            border: `1px solid ${voiceEnabled ? C.blueDim : C.border}`,
            color: voiceEnabled ? C.blue : C.inkSoft,
            borderRadius: 20, padding: '5px 10px',
            fontFamily: SANS, fontSize: 11, fontWeight: 600,
            flexShrink: 0, whiteSpace: 'nowrap',
          }}
          title={voiceEnabled ? 'Switch to text mode' : 'Switch to voice mode'}
        >
          {voiceEnabled ? 'Voice' : 'Text'}
        </button>
        <button
          onClick={() => handleEnd()}
          style={{
            background: C.teal, color: '#fff', border: 'none', borderRadius: 10,
            padding: '7px 14px', fontSize: 13, fontWeight: 700, fontFamily: SANS, flexShrink: 0,
          }}
        >End ✓</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
            alignItems: 'flex-end', gap: 8,
          }}>
            {m.role === 'coach' && <CoachAvatar size={26} />}
            {m.role === 'hint' && (
              <div style={{
                flexShrink: 0, width: 26, height: 26,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><LineIcon id="idea" color={C.coral} size={17} /></div>
            )}
            <div style={{
              maxWidth: '80%', padding: '10px 14px', borderRadius: 16,
              background: bgFor(m.role), color: colorFor(m.role),
              fontSize: m.role === 'hint' ? 14 : 15, lineHeight: 1.6,
              fontFamily: m.role === 'hint' ? SANS : SERIF,
              fontStyle: m.role === 'coach' ? 'italic' : 'normal',
              border: m.role === 'other' ? `1px solid ${C.border}` : m.role === 'hint' ? `1px solid ${C.blueDim}` : 'none',
              borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            }}>
              {m.role === 'hint' && (
                <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: '.05em', display: 'block', marginBottom: 4, color: C.blue }}>
                  COACHING HINT
                </span>
              )}
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Dots />
            </div>
            <p style={{ fontFamily: SERIF, color: C.inkFaint, fontSize: 13, fontStyle: 'italic' }}>Getting into character…</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: `1px solid ${C.border}`, background: C.surface, flexShrink: 0, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {/* API failure retry banner */}
        {sendError && !done && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: '#FEF2F2', borderBottom: `1px solid #FECACA` }}>
            <p style={{ fontFamily: SANS, fontSize: 12, color: '#B91C1C', lineHeight: 1.4 }}>
              The AI took too long to respond — tap to try again.
            </p>
            <button
              onClick={() => { setSendError(false); send() }}
              style={{ background: 'none', border: 'none', fontFamily: SANS, fontSize: 12, fontWeight: 700, color: '#B91C1C', flexShrink: 0, paddingLeft: 10 }}
            >↺ Retry</button>
          </div>
        )}
        {!done && (
          <div style={{ textAlign: 'center', paddingTop: 8, paddingBottom: 2 }}>
            <button
              onClick={getHint}
              disabled={hintLoading || loading}
              style={{
                background: 'none', border: 'none', color: hintLoading ? C.inkFaint : C.blue,
                fontFamily: SANS, fontSize: 12, cursor: hintLoading ? 'default' : 'pointer',
                padding: '2px 8px',
              }}
            >
              {hintLoading ? 'Getting hint…' : 'Not sure what to say? Get a hint'}
            </button>
          </div>
        )}
        <div style={{ padding: '8px 16px 12px' }}>
        {done ? (
          <Btn onClick={() => handleEnd()}>Complete session ✓</Btn>
        ) : voiceEnabled ? (

          /* ── VOICE MODE INPUT PANEL ──────────────────────────────────── */
          <div style={{ textAlign: 'center' }}>

            {/* TTS error chip — shows exact error message from OpenAI or browser */}
            {ttsError && !isPlaying && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 20,
                padding: '4px 12px', marginBottom: 8,
                fontFamily: SANS, fontSize: 11, color: '#B91C1C',
                maxWidth: 320, textAlign: 'left', lineHeight: 1.4,
              }}>
                {ttsError}
              </div>
            )}

            {isPlaying ? (
              /* AI is speaking */
              <div
                onClick={() => stopSpeaking(true)}
                style={{ cursor: 'pointer', padding: '10px 0 4px', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 32, marginBottom: 6 }}>
                  {[0, 0.15, 0.3, 0.15, 0].map((delay, i) => (
                    <span key={i} style={{
                      display: 'block', width: 4, borderRadius: 2,
                      background: C.blue,
                      animation: `voiceWave 1.2s ease-in-out ${delay}s infinite`,
                    }} />
                  ))}
                </div>
                <p style={{ fontFamily: SANS, fontSize: 12, color: C.inkSoft, margin: 0 }}>
                  Tap to interrupt
                </p>
              </div>
            ) : transcribing ? (
              /* Whisper is converting the recording to text */
              <div style={{ padding: '10px 0 4px' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  background: C.blueBg, border: `1px solid ${C.blueDim}`,
                  borderRadius: 20, padding: '5px 14px',
                }}>
                  <Dots />
                  <span style={{ fontFamily: SANS, fontSize: 12, color: C.blue, fontWeight: 600 }}>
                    Transcribing…
                  </span>
                </div>
              </div>
            ) : listening ? (
              /* User is recording their reply */
              <div style={{ padding: '4px 0 4px' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  background: C.coralBg, border: `1px solid ${C.coralDim}`,
                  borderRadius: 20, padding: '5px 12px', marginBottom: 10,
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', background: C.coral, flexShrink: 0,
                    animation: 'recordPulse 1.5s ease-in-out infinite',
                  }} />
                  <span style={{ fontFamily: SANS, fontSize: 12, color: C.coral, fontWeight: 600 }}>
                    Recording… speak now
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button
                    onClick={cancelRecording}
                    style={{
                      background: 'transparent', border: `1px solid ${C.border}`,
                      borderRadius: 10, padding: '8px 16px',
                      fontFamily: SANS, fontSize: 13, color: C.inkSoft,
                    }}
                  >✕ Cancel</button>
                  <button
                    onClick={() => finishRecording(true)}
                    style={{
                      background: C.coral,
                      border: 'none', borderRadius: 10, padding: '8px 20px',
                      fontFamily: SANS, fontSize: 13, fontWeight: 700, color: '#fff',
                    }}
                  >■ Stop &amp; Send</button>
                </div>
              </div>
            ) : loading ? (
              /* Waiting for AI */
              <p style={{ fontFamily: SANS, fontSize: 12, color: C.inkFaint, margin: '8px 0', fontStyle: 'italic' }}>
                Getting into character…
              </p>
            ) : needsOpeningTap ? (
              /* First tap — unlocks iOS audio and plays opening line */
              <button
                onClick={handleBegin}
                style={{
                  background: C.bg, border: `2px solid ${C.blue}`,
                  borderRadius: 40, padding: '12px 28px',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  fontFamily: SANS, fontSize: 14, fontWeight: 600, color: C.blue,
                }}
              >
                ▶ Tap to hear the opening
              </button>
            ) : (
              /* Idle — tap to speak */
              <button
                onClick={toggleMic}
                style={{
                  background: C.bg, border: `2px solid ${C.coral}`,
                  borderRadius: 40, padding: '12px 28px',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  fontFamily: SANS, fontSize: 14, fontWeight: 600, color: C.coral,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.coral} strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
                Tap to speak
              </button>
            )}
          </div>

        ) : (

          /* ── TEXT MODE INPUT (unchanged) ─────────────────────────────── */
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Input with embedded mic */}
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder={listening ? 'Listening…' : 'Type or speak…'}
                style={{
                  width: '100%', padding: '12px 46px 12px 16px', borderRadius: 12,
                  border: `1.5px solid ${listening ? C.coral : C.border}`,
                  background: listening ? C.coralBg : C.bg,
                  fontSize: 15, color: C.ink, fontFamily: SERIF,
                  transition: 'border-color .15s, background .15s',
                }}
              />
              {/* Mic button inside input */}
              <button
                onClick={toggleMic}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  width: 30, height: 30, borderRadius: '50%', border: 'none',
                  background: listening ? C.coral : C.border,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  animation: listening ? 'recordPulse 1.5s ease-in-out infinite' : 'none',
                  transition: 'background .2s',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke={listening ? '#fff' : C.inkSoft} strokeWidth="2" strokeLinecap="round">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </button>
            </div>

            {/* Send button */}
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              style={{
                background: !input.trim() || loading ? C.coralDim : C.coral,
                color: '#fff', border: 'none', borderRadius: 12,
                padding: '0 18px', fontSize: 18, fontWeight: 700,
                height: 46, flexShrink: 0,
              }}
            >→</button>
          </div>

        )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// SHARE SCREEN
// ═══════════════════════════════════════════════
function ShareScreen({ session, setScreen }) {
  const [copied, setCopied]       = useState(false)
  const [copyError, setCopyError] = useState(false)
  const rewrite = session?.feedback?.rewrite || ''

  const copy = async () => {
    setCopyError(false)
    try {
      await navigator.clipboard.writeText(rewrite)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopyError(true)
    }
  }

  return (
    <div className="fade-up" style={{ padding: '28px 20px 40px' }}>
      <SubHeader title="Share your message" onBack={() => setScreen('feedback')} />

      {/* Share card */}
      <div style={{
        background: C.surface, borderRadius: 20, overflow: 'hidden',
        border: `1px solid ${C.border}`, marginBottom: 20,
        boxShadow: '0 4px 24px rgba(0,0,0,.06)',
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontFamily: SERIF, fontWeight: 600, color: C.ink, fontSize: 16 }}>✦ fable</span>
          <span style={{ fontFamily: SANS, color: C.inkSoft, fontSize: 11, fontWeight: 600, letterSpacing: '.06em' }}>
            COACHED MESSAGE
          </span>
        </div>
        <div style={{ padding: '24px 20px 20px' }}>
          <p style={{ fontFamily: SERIF, color: C.ink, fontSize: 17, lineHeight: 1.8, fontStyle: 'italic' }}>
            "{rewrite}"
          </p>
        </div>
        <div style={{
          padding: '12px 20px', borderTop: `1px solid ${C.border}`,
          background: C.bg,
        }}>
          <p style={{ fontFamily: SANS, color: C.inkSoft, fontSize: 12 }}>
            Prepared with Fable · fable.app
          </p>
        </div>
      </div>

      <p style={{ fontFamily: SERIF, color: C.inkSoft, fontSize: 14, fontStyle: 'italic', textAlign: 'center', marginBottom: 20, lineHeight: 1.6 }}>
        This is your message — Fable just helped you find the words.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={copy}
          style={{
            width: '100%', padding: '15px', borderRadius: 14, border: 'none',
            background: copied ? C.teal : C.coral, color: '#fff',
            fontSize: 15, fontWeight: 700, fontFamily: SANS, transition: 'background .25s',
          }}
        >
          {copied ? '✓ Copied to clipboard' : 'Copy message'}
        </button>
        {copyError && (
          <p style={{ fontFamily: SANS, fontSize: 12, color: C.coral, textAlign: 'center', lineHeight: 1.4 }}>
            Couldn’t copy automatically — press and hold the message above to select and copy it.
          </p>
        )}
        <Btn variant="secondary" onClick={() => setScreen('feedback')}>← Back to coaching</Btn>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// PROGRESS SCREEN
// ═══════════════════════════════════════════════
// ═══════════════════════════════════════════════
// PROGRESS — HELPER FUNCTIONS
// ═══════════════════════════════════════════════

function isoWeekNumber(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const y = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d - y) / 86400000) + 1) / 7)
}

function sessionTrack(scenarioId) {
  if (!scenarioId) return null
  if (scenarioId.startsWith('audit'))       return 'audit'
  if (scenarioId.startsWith('consulting'))  return 'consulting'
  if (scenarioId === 'leadership-compensation') return 'career'
  if (scenarioId.startsWith('career'))      return 'career'
  if (scenarioId.startsWith('leadership'))  return 'leadership'
  return null
}

function useProgressData(sessions, dailyRep, completedData) {
  const cdObj = completedData || {}

  // Only count proper scenario sessions (not storylab / coach)
  const scenSessions = sessions.filter(
    s => s.completed && s.scenario && !s.scenario.startsWith('daily-rep-day') && s.scenario !== 'storylab'
  )

  // A session only counts as a rep once its debrief is completed — otherwise
  // REPS, AVG RATING and strengths would tell inconsistent stories.
  // Debriefs live on the session itself (coach / legacy feedback) or in
  // completedData keyed by scenario id (track scenarios & rehearsals).
  const hasDebrief      = s => !!(s.debrief || s.feedback || cdObj[s.scenario]?.debrief)
  const totalReps       = sessions.filter(s => s.completed && hasDebrief(s)).length
  const thirtyDaysAgo   = Date.now() - 30 * 24 * 60 * 60 * 1000
  const repsThisMonth   = sessions.filter(s => s.id > thirtyDaysAgo && s.completed && hasDebrief(s)).length

  // Ratings from saved debriefs
  const ratings = Object.values(cdObj).map(s => s.debrief?.overall_rating).filter(Boolean)
  const avgRating = ratings.length
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
    : null

  // Track breakdown
  const trackCounts = { audit: 0, consulting: 0, leadership: 0, career: 0 }
  scenSessions.forEach(s => {
    const t = sessionTrack(s.scenario)
    if (t) trackCounts[t]++
  })
  const mostPracticed  = Object.entries(trackCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
  const leastPracticed = Object.entries(trackCounts).sort((a, b) => a[1] - b[1])[0]?.[0]

  // Focus scores aggregated across all debriefs
  const focusMap = {}
  Object.values(cdObj).forEach(s => {
    if (!s.debrief?.focus_scores) return
    Object.entries(s.debrief.focus_scores).forEach(([area, score]) => {
      if (typeof score !== 'number' || score <= 0) return
      ;(focusMap[area] = focusMap[area] || []).push(score)
    })
  })
  const avgFocusScores = Object.entries(focusMap)
    .map(([area, scores]) => ({
      area,
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
      count: scores.length,
    }))
    .sort((a, b) => b.avg - a.avg)

  const strengths = avgFocusScores.slice(0, 2)
  const develop   = [...avgFocusScores].slice(-2).reverse().filter(f => f.avg < 4)

  // Lowest-rated completed scenario → next challenge
  const hardest = Object.entries(cdObj)
    .filter(([, s]) => s.debrief?.overall_rating)
    .sort((a, b) => a[1].debrief.overall_rating - b[1].debrief.overall_rating)[0]

  // Weekly activity for growth chart (keyed by ISO year-week)
  const byWeek = {}
  sessions.filter(s => s.completed && s.id).forEach(s => {
    const d = new Date(s.id)
    const key = `${d.getFullYear()}-W${String(isoWeekNumber(d)).padStart(2, '0')}`
    const wk  = byWeek[key] || (byWeek[key] = { sessions: 0, ratings: [] })
    wk.sessions++
    const cd  = cdObj[s.scenario]
    if (cd?.debrief?.overall_rating) wk.ratings.push(cd.debrief.overall_rating)
  })
  const weeklyData = Object.entries(byWeek)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, wk]) => ({
      week,
      sessions: wk.sessions,
      avgRating: wk.ratings.length
        ? wk.ratings.reduce((a, b) => a + b, 0) / wk.ratings.length
        : null,
    }))

  return {
    totalReps, repsThisMonth, avgRating,
    streak: dailyRep?.streak || 0,
    longestStreak: dailyRep?.longestStreak || 0,
    trackCounts, mostPracticed, leastPracticed,
    strengths, develop, hardest,
    avgFocusScores, weeklyData,
    hasRatings:      ratings.length > 0,
    hasEnoughForProfile: totalReps >= 3,
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FocusBar({ area, avg, type }) {
  const pct   = Math.round((avg / 5) * 100)
  const color = type === 'strength' ? C.blueDeep : C.coral
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <p style={{ fontFamily: SERIF, color: C.inkMid, fontSize: 13, lineHeight: 1.4, flex: 1, marginRight: 10 }}>{area}</p>
        <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 12, color, flexShrink: 0 }}>{avg.toFixed(1)}</span>
      </div>
      <div style={{ height: 6, background: C.border, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width .6s ease' }} />
      </div>
    </div>
  )
}

function TrackBreakdown({ trackCounts }) {
  const total  = Object.values(trackCounts).reduce((a, b) => a + b, 0) || 1
  const tracks = [
    { id: 'audit',       label: 'Audit & Compliance',       color: C.blueDeep },
    { id: 'consulting',  label: 'Consulting & Client Work',  color: C.coral    },
    { id: 'career',      label: 'Career & Self-Advocacy',    color: '#7C4DFF'  },
    { id: 'leadership',  label: 'People Leadership',         color: C.teal     },
  ]
  return (
    <div style={{ marginBottom: 28 }}>
      {tracks.map(t => (
        <div key={t.id} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <p style={{ fontFamily: SANS, fontSize: 13, color: C.inkMid, display: 'flex', alignItems: 'center', gap: 6 }}><LineIcon id={t.id} color={C.inkMid} size={14} /> {t.label}</p>
            <span style={{ fontFamily: SANS, fontSize: 12, color: C.inkFaint }}>{trackCounts[t.id]}</span>
          </div>
          <div style={{ height: 6, background: C.border, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4, background: t.color, transition: 'width .6s ease',
              width: `${(trackCounts[t.id] / total) * 100}%`,
              minWidth: trackCounts[t.id] > 0 ? 4 : 0,
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function GrowthChart({ weeklyData, hasRatings }) {
  if (weeklyData.length < 2) {
    return (
      <div style={{ background: C.surfaceSubtle, borderRadius: 12, padding: '20px', textAlign: 'center', marginBottom: 28 }}>
        <p style={{ fontFamily: SERIF, color: C.inkSoft, fontSize: 14, fontStyle: 'italic', lineHeight: 1.6 }}>
          Complete sessions across multiple weeks to see your growth trend here.
        </p>
      </div>
    )
  }
  const W = 320, H = 80, PAD = 12
  const useRatings = hasRatings && weeklyData.some(w => w.avgRating !== null)
  const values = weeklyData.map(w => useRatings ? (w.avgRating || 0) : w.sessions)
  const maxVal  = useRatings ? 5 : Math.max(...values, 1)
  const points  = weeklyData.map((_, i) => ({
    x: PAD + (i / (weeklyData.length - 1)) * (W - PAD * 2),
    y: H - PAD - ((values[i] / maxVal) * (H - PAD * 2)),
  }))
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  return (
    <div style={{ marginBottom: 28 }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {[1, 2, 3, 4, 5].map(v => {
          const y = H - PAD - ((v / maxVal) * (H - PAD * 2))
          return <line key={v} x1={PAD} y1={y.toFixed(1)} x2={W - PAD} y2={y.toFixed(1)} stroke={C.border} strokeWidth="1" />
        })}
        <path d={pathD} fill="none" stroke={C.blue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="4" fill={C.coral} stroke={C.surface} strokeWidth="2" />
        ))}
      </svg>
      <p style={{ fontFamily: SANS, fontSize: 10, color: C.inkFaint, textAlign: 'center', marginTop: 4 }}>
        {useRatings ? 'Average rating per week' : 'Sessions per week'}
      </p>
    </div>
  )
}

function NextChallengeCard({ hardest, openBriefing, setActiveTrack }) {
  if (!hardest) return null
  const [scenarioId, scenarioData] = hardest
  const match = findTrackScenario(scenarioId)
  if (!match) return null
  const { scenario, track } = match
  const rating = scenarioData.debrief?.overall_rating

  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: C.blueDeep, marginBottom: 12 }}>
        Your Next Challenge
      </p>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 22px' }}>
        <p style={{ fontFamily: SANS, fontSize: 13, color: C.inkMid, marginBottom: 10, lineHeight: 1.5 }}>
          Based on your sessions, your biggest growth opportunity right now is:
        </p>
        <p style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 700, color: C.ink, marginBottom: rating ? 4 : 16 }}>
          {scenario.title}
        </p>
        {rating && (
          <p style={{ fontFamily: SANS, fontSize: 12, color: C.inkSoft, marginBottom: 16 }}>
            You've averaged {rating}/5 — try again on a harder difficulty
          </p>
        )}
        <Btn onClick={() => { setActiveTrack(track); openBriefing(scenario) }}>
          Practice now →
        </Btn>
      </div>
    </div>
  )
}

function ProgressSessionLog({ sessions, completedData, rehearsals = [] }) {
  const cdObj   = completedData || {}
  const ordered = [...sessions].filter(s => s.completed).sort((a, b) => b.id - a.id).slice(0, 20)
  if (ordered.length === 0) return null
  return (
    <div>
      {ordered.map(s => {
        const match     = findTrackScenario(s.scenario)
        // Rehearsals aren't track scenarios — resolve their title from the
        // stored session title, or by matching the rehearsal id, before
        // falling back to anything cryptic.
        const rehearsal = (s.rehearsalId || (typeof s.scenario === 'string' && s.scenario.startsWith('r_')))
          ? rehearsals.find(r => r.id === (s.rehearsalId || s.scenario))
          : null
        const icon   = match
          ? <LineIcon id={match.track.id} color={C.blue} size={19} />
          : s.isDailyRep
            ? <LineIcon id="target" color={C.blue} size={19} />
            : (rehearsal || s.rehearsalId || s.title)
              ? <span style={{ color: C.coral, fontSize: 17 }}>✦</span>
              : <LineIcon id="chat" color={C.blue} size={19} />
        const label  = match?.scenario.title
          || s.title
          || rehearsal?.title
          || (s.isDailyRep ? `Day ${s.dailyRepDay} · Daily Rep` : 'Rehearsal')
        const rating = cdObj[s.scenario]?.debrief?.overall_rating
        const d      = new Date(s.id)
        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: SANS, color: C.ink, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
              <p style={{ fontFamily: SANS, color: C.inkFaint, fontSize: 11 }}>
                {d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                {s.isDailyRep && ' · Daily Rep'}
                {!s.isDailyRep && (rehearsal || s.rehearsalId) && ' · Rehearsal'}
              </p>
            </div>
            {rating && (
              <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <span key={n} style={{ fontSize: 11, color: n <= rating ? C.coral : C.border }}>★</span>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════
// PROGRESS SCREEN — MAIN DASHBOARD
// ═══════════════════════════════════════════════
function ProgressScreen({ sessions, setScreen, dailyRep, completedData, openBriefing, setActiveTrack, rehearsals = [] }) {
  const progress = useProgressData(sessions, dailyRep, completedData)
  const rehearseStats = {
    created:   rehearsals.length,
    practiced: rehearsals.reduce((sum, r) => sum + (r.practiceCount || 0), 0),
    done:      rehearsals.filter((r) => r.status === 'done').length,
    helped:    rehearsals.filter((r) => r.practiceHelpedRating === 'yes').length,
    rated:     rehearsals.filter((r) => r.practiceHelpedRating).length,
  }
  const [profile,        setProfile]        = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    if (!progress.hasEnoughForProfile || profile !== null) return
    setProfileLoading(true)
    fetch('/api/coaching', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'profile',
        progressData: {
          totalReps:      progress.totalReps,
          avgRating:      progress.avgRating,
          strengths:      progress.strengths,
          develop:        progress.develop,
          mostPracticed:  progress.mostPracticed,
          leastPracticed: progress.leastPracticed,
          streak:         progress.streak,
          hasRatings:     progress.hasRatings,
        },
      }),
    })
      .then(r => r.json())
      .then(d => setProfile(d.profile || null))
      .catch(() => setProfile(null))
      .finally(() => setProfileLoading(false))
  }, [progress.hasEnoughForProfile])

  const SL = ({ children }) => (
    <p style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: C.blueDeep, marginBottom: 12 }}>
      {children}
    </p>
  )

  // ── Empty state ────────────────────────────────────────────────────────────
  if (progress.totalReps === 0) {
    return (
      <div className="fade-up" style={{ padding: '60px 28px calc(120px + env(safe-area-inset-bottom, 0px))', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 20 }}>◈</div>
        <h1 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 600, color: C.ink, marginBottom: 12, lineHeight: 1.35 }}>
          Your Progress
        </h1>
        <p style={{ fontFamily: SERIF, fontSize: 15, color: C.inkMid, lineHeight: 1.7, marginBottom: 8 }}>
          Every rep you complete will build your communication profile here.
        </p>
        <p style={{ fontFamily: SANS, fontSize: 13, color: C.inkSoft, lineHeight: 1.65, marginBottom: 32 }}>
          Strengths. Patterns. Growth over time.<br />
          The picture gets clearer the more you practice.
        </p>
        <Btn onClick={() => { setScreen('daily-rep') }}>Start your first rep →</Btn>
      </div>
    )
  }

  return (
    <div className="fade-up" style={{ padding: '28px 20px calc(120px + env(safe-area-inset-bottom, 0px))' }}>

      {/* Header */}
      <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Progress</h1>
      <p style={{ fontFamily: SANS, fontSize: 14, color: C.inkMid, marginBottom: 28, lineHeight: 1.55 }}>
        Your communication intelligence
      </p>

      {/* ── Profile card ──────────────────────────────────────────────────── */}
      <SL>Your Profile</SL>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderLeft: `4px solid ${C.coral}`, borderRadius: 16,
        padding: '20px 22px', marginBottom: 28,
      }}>
        <p style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: '.1em', color: C.coral, textTransform: 'uppercase', marginBottom: 10 }}>
          Communication Profile
        </p>
        {!progress.hasEnoughForProfile ? (
          <p style={{ fontFamily: SERIF, fontSize: 14, color: C.inkSoft, fontStyle: 'italic', lineHeight: 1.65 }}>
            Complete 3 or more sessions and your communication profile will appear here.
          </p>
        ) : profileLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Dots />
            <p style={{ fontFamily: SANS, fontSize: 13, color: C.inkSoft }}>Building your profile…</p>
          </div>
        ) : profile ? (
          <p style={{ fontFamily: SERIF, fontSize: 16, color: C.ink, lineHeight: 1.7, fontStyle: 'italic' }}>
            {profile}
          </p>
        ) : (
          <p style={{ fontFamily: SERIF, fontSize: 14, color: C.inkSoft, fontStyle: 'italic', lineHeight: 1.65 }}>
            Keep practicing — your profile will sharpen with each session.
          </p>
        )}
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <SL>This Month</SL>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 28 }}>
        {[
          { val: progress.repsThisMonth, label: 'Reps' },
          { val: progress.avgRating ?? '—',  label: 'Avg Rating' },
          { val: progress.streak,             label: 'Day Streak' },
        ].map(s => (
          <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 10px', textAlign: 'center' }}>
            <p style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 700, color: C.ink, lineHeight: 1, marginBottom: 6 }}>{s.val}</p>
            <p style={{ fontFamily: SANS, fontSize: 10, color: C.inkSoft, textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Strengths ─────────────────────────────────────────────────────── */}
      {progress.strengths.length > 0 && (
        <>
          <SL>Your Strengths</SL>
          <div style={{ marginBottom: 24 }}>
            {progress.strengths.map(f => <FocusBar key={f.area} area={f.area} avg={f.avg} type="strength" />)}
          </div>
        </>
      )}

      {/* ── Develop ───────────────────────────────────────────────────────── */}
      {progress.develop.length > 0 && (
        <>
          <SL>Areas to Develop</SL>
          <div style={{ marginBottom: 24 }}>
            {progress.develop.map(f => <FocusBar key={f.area} area={f.area} avg={f.avg} type="develop" />)}
          </div>
        </>
      )}

      {/* Placeholder when not enough debrief data */}
      {progress.strengths.length === 0 && progress.develop.length === 0 && (
        <>
          <SL>Your Strengths</SL>
          <p style={{ fontFamily: SERIF, color: C.inkSoft, fontSize: 14, fontStyle: 'italic', marginBottom: 24, lineHeight: 1.65 }}>
            Complete a scenario debrief and your strength patterns will appear here.
          </p>
        </>
      )}

      {/* ── Track breakdown ───────────────────────────────────────────────── */}
      <SL>Practice Breakdown</SL>
      <TrackBreakdown trackCounts={progress.trackCounts} />

      {/* ── Growth chart ──────────────────────────────────────────────────── */}
      <SL>Growth Over Time</SL>
      <GrowthChart weeklyData={progress.weeklyData} hasRatings={progress.hasRatings} />

      {/* ── Next challenge ────────────────────────────────────────────────── */}
      {progress.hardest && (
        <NextChallengeCard
          hardest={progress.hardest}
          openBriefing={openBriefing}
          setActiveTrack={setActiveTrack}
        />
      )}

      {/* ── Rehearsal history ─────────────────────────────────────────────── */}
      {rehearseStats.created > 0 && (
        <>
          <SL>Rehearsal History</SL>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '18px 20px', marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <p style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 700, color: C.ink }}>{rehearseStats.created}</p>
                <p style={{ fontFamily: SANS, fontSize: 11, color: C.inkSoft }}>Prepared</p>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <p style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 700, color: C.ink }}>{rehearseStats.practiced}</p>
                <p style={{ fontFamily: SANS, fontSize: 11, color: C.inkSoft }}>Times rehearsed</p>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <p style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 700, color: C.ink }}>{rehearseStats.done}</p>
                <p style={{ fontFamily: SANS, fontSize: 11, color: C.inkSoft }}>Happened</p>
              </div>
            </div>
            {rehearseStats.rated > 0 && (
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13, color: C.inkMid, lineHeight: 1.5, textAlign: 'center', borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                {rehearseStats.helped} of {rehearseStats.rated} said the practice helped.
              </p>
            )}
          </div>
        </>
      )}

      {/* ── Session log ───────────────────────────────────────────────────── */}
      <SL>All Sessions</SL>
      <ProgressSessionLog sessions={sessions} completedData={completedData} rehearsals={rehearsals} />
    </div>
  )
}

// ═══════════════════════════════════════════════
// DAILY REP — INSIGHT SCREEN (full-screen, dark)
// ═══════════════════════════════════════════════
function DailyRepInsightScreen({ day, onContinue }) {
  if (!day) return null
  return (
    <div
      className="fade-in"
      onClick={onContinue}
      style={{
        height: '100dvh', background: C.blueDeep,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '48px 32px',
        cursor: 'pointer', userSelect: 'none',
      }}
    >
      {/* Phase / Day label */}
      <p style={{
        fontFamily: SANS, color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600,
        letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 36,
      }}>
        Day {day.day} · {day.phase_label}
      </p>

      {/* Insight quote */}
      <p style={{ fontFamily: SERIF, color: 'rgba(255,255,255,0.95)', fontSize: 22, lineHeight: 1.7, marginBottom: 48 }}>
        "{day.insight}"
      </p>

      {/* Focus accent */}
      <div style={{ borderLeft: `3px solid ${C.coral}`, paddingLeft: 18, marginBottom: 56 }}>
        <p style={{ fontFamily: SANS, color: 'rgba(255,255,255,0.45)', fontSize: 12, marginBottom: 4 }}>Today's focus</p>
        <p style={{ fontFamily: SANS, color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>
          {day.focus}
        </p>
      </div>

      {/* Tap hint */}
      <p style={{ fontFamily: SANS, color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', animation: 'pulse 2s ease-in-out infinite' }}>
        tap anywhere to continue
      </p>
    </div>
  )
}

// ═══════════════════════════════════════════════
// DAILY REP — BRIEFING SCREEN
// ═══════════════════════════════════════════════
function DailyRepBriefingScreen({ day, scenario, setScreen, onBegin, onChooseScenario }) {
  const [difficulty, setDifficulty] = useState(
    day?.difficulty_default || scenario?.difficulty_default || 'medium'
  )
  const isUserChoice = day?.type === 'user-choice'

  if (!day) return null

  return (
    <div className="fade-up" style={{ padding: '36px 20px calc(120px + env(safe-area-inset-bottom, 0px))' }}>

      {/* Back */}
      <button
        onClick={() => setScreen('daily-rep')}
        style={{ background: 'none', border: 'none', color: C.inkSoft, fontSize: 20, marginBottom: 20, padding: 0 }}
      >←</button>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontFamily: SANS, color: C.coral, fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          Day {day.day} · {day.phase_label}
        </p>
        <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 700, color: C.ink, marginBottom: 4 }}>
          {day.title}
        </h1>
        <p style={{ fontFamily: SANS, fontSize: 13, color: C.inkMid }}>{day.duration}</p>
      </div>

      {isUserChoice ? (
        <>
          <Card bg={C.coralBg} border={C.coralDim} style={{ marginBottom: 24 }}>
            <p style={{ fontFamily: SERIF, color: C.ink, fontSize: 15, lineHeight: 1.65 }}>
              {day.focus}. Browse the scenario library and pick the one that feels most relevant or challenging right now.
            </p>
          </Card>
          <Btn onClick={onChooseScenario} style={{ marginBottom: 10 }}>
            Choose your scenario →
          </Btn>
          <Btn variant="ghost" onClick={() => setScreen('home')}>Back to home</Btn>
        </>
      ) : scenario ? (
        <>
          {/* Scenario context */}
          <Card bg={C.surfaceSubtle} border={C.border} style={{ marginBottom: 18 }}>
            <p style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: C.inkFaint, letterSpacing: '.07em', marginBottom: 8, textTransform: 'uppercase' }}>
              The situation
            </p>
            <p style={{ fontFamily: SERIF, color: C.ink, fontSize: 15, lineHeight: 1.65 }}>
              {scenario.context}
            </p>
          </Card>

          {/* Coaching focus */}
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontFamily: SANS, color: C.blueDeep, fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 10 }}>
              What you'll practice
            </p>
            {(scenario.coaching_focus || []).map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
                <span style={{ color: C.coral, fontSize: 12, marginTop: 2, flexShrink: 0 }}>◆</span>
                <p style={{ fontFamily: SERIF, color: C.inkMid, fontSize: 14, lineHeight: 1.5 }}>{f}</p>
              </div>
            ))}
          </div>

          {/* Difficulty picker */}
          <p style={{ fontFamily: SANS, color: C.inkSoft, fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 8 }}>
            Difficulty
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {Object.entries(DIFFICULTY_META).map(([key, meta]) => (
              <button
                key={key}
                onClick={() => setDifficulty(key)}
                style={{
                  flex: 1, padding: '10px 8px', borderRadius: 12,
                  border: `1.5px solid ${difficulty === key ? meta.color(C) : C.border}`,
                  background: difficulty === key ? meta.bg(C) : C.surface,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  transition: 'all .15s',
                }}
              >
                <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: difficulty === key ? meta.color(C) : C.inkSoft }}>
                  {meta.label}
                </span>
                <span style={{ fontFamily: SANS, fontSize: 10, color: C.inkFaint, textAlign: 'center', lineHeight: 1.3 }}>
                  {meta.desc}
                </span>
              </button>
            ))}
          </div>

          <Btn onClick={() => onBegin(scenario, difficulty)}>Begin →</Btn>
        </>
      ) : (
        <Card style={{ textAlign: 'center', padding: '28px' }}>
          <p style={{ fontFamily: SERIF, color: C.inkSoft, fontSize: 15 }}>Scenario not found. Try a different day.</p>
        </Card>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════
// DAILY REP — DEBRIEF SCREEN (post-simulation)
// ═══════════════════════════════════════════════
function DailyRepDebriefScreen({ day, setScreen, onComplete }) {
  const [reflection, setReflection] = useState('')
  const [saved,      setSaved]      = useState(false)

  const save = () => {
    onComplete(reflection)
    setSaved(true)
  }

  if (!day) return null

  return (
    <div className="fade-up" style={{ padding: '36px 20px calc(120px + env(safe-area-inset-bottom, 0px))' }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.teal, marginBottom: 8 }}>
          Rep complete ✓
        </p>
        <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 700, color: C.ink }}>
          Day {day.day} done
        </h1>
      </div>

      {/* Insight to carry forward */}
      <Card bg={C.coralBg} border={C.coralDim} style={{ marginBottom: 24 }}>
        <p style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: C.coral, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8 }}>
          Today's insight
        </p>
        <p style={{ fontFamily: SERIF, color: C.ink, fontSize: 15, lineHeight: 1.65, fontStyle: 'italic' }}>
          "{day.insight}"
        </p>
      </Card>

      {/* Reflection */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: C.inkMid, marginBottom: 12 }}>
          What's one thing you noticed about how you showed up in that conversation?
        </p>
        <VoiceTextarea
          value={reflection}
          onChange={setReflection}
          placeholder="Your own words…"
          minHeight={100}
        />
      </div>

      {saved ? (
        <>
          <div style={{ textAlign: 'center', padding: '16px', borderRadius: 14, background: C.tealBg, marginBottom: 20 }}>
            <p style={{ fontFamily: SANS, color: C.teal, fontWeight: 700, fontSize: 15 }}>
              ✓ Day {day.day} complete
            </p>
          </div>
          <Btn onClick={() => setScreen('home')}>Back to home →</Btn>
        </>
      ) : (
        <Btn onClick={save}>
          {reflection.trim() ? 'Save reflection →' : 'Complete day →'}
        </Btn>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════
// DAILY REP — PROGRAM SCREEN (full 30-day view)
// ═══════════════════════════════════════════════
function DailyRepScreen({ dailyRep, setScreen, onStartDay }) {
  const currentDay    = dailyRep.currentDay || 1
  const completedDays = dailyRep.completedDays || []
  const streak        = dailyRep.streak || 0

  const PHASES = [
    { phase: 1, label: 'Foundation',  range: [1, 7]   },
    { phase: 2, label: 'Escalation',  range: [8, 14]  },
    { phase: 3, label: 'Advanced',    range: [15, 22] },
    { phase: 4, label: 'Mastery',     range: [23, 30] },
  ]

  return (
    <div className="fade-up" style={{ padding: '28px 20px calc(120px + env(safe-area-inset-bottom, 0px))' }}>

      {/* Header */}
      <div style={{ marginBottom: 6 }}>
        <p style={{ fontFamily: SANS, color: C.inkSoft, fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 6 }}>
          Daily Practice
        </p>
        <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Daily Rep</h1>
        <p style={{ color: C.inkSoft, fontSize: 14, lineHeight: 1.6 }}>
          30 days. 30 real conversations. Identify the habits holding you back.
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 20, marginBottom: 20 }}>
        {[
          { val: streak,              label: 'Day streak',  color: C.coral },
          { val: completedDays.length, label: 'Days done',  color: C.blue  },
          { val: 30 - completedDays.length, label: 'Remaining', color: C.teal  },
        ].map((s) => (
          <Card key={s.label} style={{ textAlign: 'center', padding: '14px 8px' }}>
            <p style={{ fontFamily: SERIF, color: s.color, fontSize: 26, fontWeight: 600, lineHeight: 1, marginBottom: 4 }}>{s.val}</p>
            <p style={{ fontFamily: SANS, color: C.inkSoft, fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', lineHeight: 1.3 }}>
              {s.label}
            </p>
          </Card>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: SANS, color: C.inkSoft, fontSize: 12 }}>Day {currentDay} of 30</span>
          <span style={{ fontFamily: SANS, color: C.coral, fontSize: 12, fontWeight: 700 }}>
            {Math.round((completedDays.length / 30) * 100)}% complete
          </span>
        </div>
        <div style={{ height: 5, background: C.border, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(completedDays.length / 30) * 100}%`, background: C.coral, borderRadius: 4, transition: 'width .4s' }} />
        </div>
      </div>

      {/* Phases */}
      {PHASES.map(({ phase, label, range }) => {
        const phaseDays = DAILY_REP_PROGRAM.filter((d) => d.phase === phase)
        return (
          <div key={phase} style={{ marginBottom: 28 }}>
            {/* Phase divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ height: 1, flex: 1, background: C.border }} />
              <p style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: C.blueDeep, flexShrink: 0 }}>
                Phase {phase} — {label}
              </p>
              <div style={{ height: 1, flex: 1, background: C.border }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {phaseDays.map((d) => {
                const isDone   = completedDays.includes(d.day)
                const isActive = d.day === currentDay && !isDone
                const isLocked = d.day > currentDay && !isDone
                return (
                  <div
                    key={d.day}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px', borderRadius: 14,
                      border: `1px solid ${isActive ? C.coral : C.border}`,
                      background: isActive ? C.coralBg : isDone ? C.bg : C.surface,
                      opacity: isLocked ? 0.45 : 1, transition: 'all .15s',
                    }}
                  >
                    {/* Circle */}
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isDone ? C.teal : isActive ? C.coral : C.border,
                      color: isDone || isActive ? '#fff' : C.inkSoft,
                      fontSize: isDone ? 14 : 13, fontWeight: 700, fontFamily: SANS,
                    }}>
                      {isDone ? '✓' : d.day}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                        <p style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: isActive ? C.coral : isDone ? C.inkMid : isLocked ? C.inkFaint : C.ink }}>
                          {d.title}
                        </p>
                        {d.type === 'user-choice' && !isDone && (
                          <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: C.blue, background: C.blueBg, padding: '1px 7px', borderRadius: 20 }}>
                            YOUR CHOICE
                          </span>
                        )}
                      </div>
                      {!isLocked ? (
                        <p style={{ fontFamily: SERIF, color: C.inkSoft, fontSize: 12, fontStyle: 'italic', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {d.focus}
                        </p>
                      ) : (
                        <p style={{ fontFamily: SANS, color: C.inkFaint, fontSize: 12 }}>Complete Day {d.day - 1} first</p>
                      )}
                    </div>

                    {isActive && (
                      <button
                        onClick={() => onStartDay(d)}
                        style={{ background: C.coral, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, fontFamily: SANS, flexShrink: 0 }}
                      >
                        Go →
                      </button>
                    )}
                    {isDone && (
                      <span style={{ fontFamily: SANS, fontSize: 11, color: C.teal, fontWeight: 700, flexShrink: 0 }}>✓ Done</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════
// STORYLAB SCREEN (archived — kept in codebase)
// ═══════════════════════════════════════════════
function StorylabScreen({ storylab, setStorylab, setScreen, onStartMission }) {
  const currentDay = storylab.currentDay || 1
  const completed  = storylab.completedDays || []

  return (
    <div className="fade-up" style={{ padding: '28px 20px calc(120px + env(safe-area-inset-bottom, 0px))' }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontFamily: SANS, color: C.inkSoft, fontSize: 11, fontWeight: 700, letterSpacing: '.07em', marginBottom: 6 }}>
          BUILT INTO FABLE
        </p>
        <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Storylab</h1>
        <p style={{ color: C.inkSoft, fontSize: 14, lineHeight: 1.6 }}>
          30 days of daily storytelling practice. Each session takes 10–15 minutes.
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: SANS, color: C.inkSoft, fontSize: 12 }}>Day {currentDay} of 30</span>
          <span style={{ fontFamily: SANS, color: C.coral, fontSize: 12, fontWeight: 700 }}>
            {completed.length} done
          </span>
        </div>
        <div style={{ height: 5, background: C.border, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${(completed.length / 30) * 100}%`,
            background: C.coral, borderRadius: 4, transition: 'width .4s',
          }} />
        </div>
      </div>

      {/* Mission list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {MISSIONS.map((m) => {
          const isDone   = completed.includes(m.day)
          const isActive = m.day === currentDay
          const isLocked = m.locked

          return (
            <div key={m.day} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
              borderRadius: 14, border: `1px solid ${isActive ? C.coral : C.border}`,
              background: isActive ? C.coralBg : isDone ? C.bg : C.surface,
              opacity: isLocked ? 0.45 : 1, transition: 'all .15s',
            }}>
              {/* Day circle */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isDone ? C.teal : isActive ? C.coral : C.border,
                color: isDone || isActive ? '#fff' : C.inkSoft,
                fontSize: isDone ? 14 : 13, fontWeight: 700, fontFamily: SANS,
              }}>
                {isDone ? '✓' : m.day}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontFamily: SANS, fontSize: 14, fontWeight: 700,
                  color: isDone ? C.inkMid : isActive ? C.coral : isLocked ? C.inkFaint : C.ink,
                  marginBottom: 2,
                }}>
                  {isLocked ? `Day ${m.day}` : m.title}
                </p>
                {!isLocked && m.prompt && (
                  <p style={{
                    fontFamily: SERIF, color: C.inkSoft, fontSize: 12,
                    fontStyle: 'italic', lineHeight: 1.4,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {m.prompt}
                  </p>
                )}
                {isLocked && (
                  <p style={{ fontFamily: SANS, color: C.inkFaint, fontSize: 12 }}>Coming soon</p>
                )}
              </div>

              {isActive && (
                <button
                  onClick={() => onStartMission(m)}
                  style={{
                    background: C.coral, color: '#fff', border: 'none',
                    borderRadius: 10, padding: '8px 14px',
                    fontSize: 13, fontWeight: 700, fontFamily: SANS, flexShrink: 0,
                  }}
                >
                  Go →
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Quote */}
      <Card style={{ marginTop: 24, borderLeft: `3px solid ${C.coral}`, background: C.coralBg, border: 'none' }}>
        <p style={{ fontFamily: SERIF, color: C.inkMid, fontSize: 15, lineHeight: 1.75, fontStyle: 'italic' }}>
          "The most powerful person in the world is the storyteller."
        </p>
        <p style={{ fontFamily: SANS, color: C.inkFaint, fontSize: 12, marginTop: 8 }}>— Steve Jobs</p>
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════
// SCENARIOS SCREEN (track list)
// ═══════════════════════════════════════════════
function ScenariosScreen({ setScreen, setActiveTrack, user }) {
  // Surface the user's recommended track first
  const recommendedId = ROLES.find((r) => r.id === user?.role)?.recommended_track
  const sorted = [...ALL_TRACKS].sort((a, b) => {
    if (a.id === recommendedId) return -1
    if (b.id === recommendedId) return 1
    return 0
  })

  return (
    <div className="fade-up" style={{ padding: '28px 20px calc(120px + env(safe-area-inset-bottom, 0px))' }}>
      <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: C.ink, marginBottom: 6 }}>Scenarios</h1>
      <p style={{ color: C.inkSoft, fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>
        Pick a track and start your rep. Every scenario is a real conversation — not a drill.
      </p>

      {/* Track cards */}
      {sorted.map((track) => (
        <button
          key={track.id}
          onClick={() => { setActiveTrack(track); setScreen('track-scenarios') }}
          style={{
            width: '100%', textAlign: 'left', marginBottom: 14, padding: '20px',
            borderRadius: 16, border: `1.5px solid ${C.border}`,
            background: C.surface, display: 'flex', alignItems: 'flex-start', gap: 16,
            transition: 'border-color .15s, box-shadow .15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.coral; e.currentTarget.style.boxShadow = '0 2px 12px rgba(232,100,74,.1)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none' }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: C.coralBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <LineIcon id={track.id} color={C.coral} size={24} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <p style={{ fontFamily: SERIF, fontWeight: 600, color: C.blue, fontSize: 17 }}>
                {track.title}
              </p>
              {track.id === recommendedId && (
                <span style={{
                  fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: '.05em',
                  color: C.teal, background: C.tealBg, padding: '2px 8px', borderRadius: 20,
                }}>FOR YOU</span>
              )}
            </div>
            <p style={{ fontFamily: SANS, color: C.inkSoft, fontSize: 14, lineHeight: 1.55, marginBottom: 10 }}>
              {track.description}
            </p>
            <span style={{
              display: 'inline-block', fontFamily: SANS, fontSize: 11, fontWeight: 700,
              color: C.coral, background: C.coralBg, padding: '3px 10px', borderRadius: 20,
              letterSpacing: '.04em',
            }}>
              {track.scenarios.length} SCENARIOS
            </span>
          </div>
          <span style={{ color: C.inkFaint, fontSize: 18, flexShrink: 0, alignSelf: 'center' }}>›</span>
        </button>
      ))}

      {/* Daily Rep link */}
      <button
        onClick={() => setScreen('daily-rep')}
        style={{
          width: '100%', textAlign: 'left', padding: '20px',
          borderRadius: 16, border: `1.5px solid ${C.border}`,
          background: C.surface, display: 'flex', alignItems: 'flex-start', gap: 16,
          transition: 'border-color .15s, box-shadow .15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.coral; e.currentTarget.style.boxShadow = '0 2px 12px rgba(232,100,74,.1)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none' }}
      >
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: `linear-gradient(135deg, ${C.coral}, ${C.coralLight})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}><LineIcon id="target" color="#fff" size={24} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: SERIF, fontWeight: 600, color: C.blue, fontSize: 17, marginBottom: 4 }}>Daily Rep</p>
          <p style={{ fontFamily: SANS, color: C.inkSoft, fontSize: 14, lineHeight: 1.55, marginBottom: 10 }}>
            30 days of professional conversation practice. One rep a day builds mastery.
          </p>
          <span style={{
            display: 'inline-block', fontFamily: SANS, fontSize: 11, fontWeight: 700,
            color: C.coral, background: C.coralBg, padding: '3px 10px', borderRadius: 20,
            letterSpacing: '.04em',
          }}>
            30 DAYS
          </span>
        </div>
        <span style={{ color: C.inkFaint, fontSize: 18, flexShrink: 0, alignSelf: 'center' }}>›</span>
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════
// TRACK SCENARIOS SCREEN (scenario list + difficulty picker)
// ═══════════════════════════════════════════════
const DIFFICULTY_META = {
  easy:   { label: 'Easy',   color: C => C.teal,   bg: C => C.tealBg,   desc: 'Cooperative, open to dialogue'         },
  medium: { label: 'Medium', color: C => C.blue,   bg: C => C.blueBg,   desc: 'Mild resistance, needs convincing'     },
  hard:   { label: 'Hard',   color: C => C.coral,  bg: C => C.coralBg,  desc: 'Defensive, will push back hard'        },
}

function TrackScenariosScreen({ track, setScreen, onStartScenario, onViewBriefing, currentSession, completedScenarios = [], user }) {
  const [selected, setSelected] = useState(null)
  const isFreeTier = TIER_GATING_ENABLED && user?.tier === 'free'

  if (!track) { setScreen('scenarios'); return null }

  const handleSelect = (scenario) => {
    setSelected(scenario === selected ? null : scenario)
  }

  return (
    <div className="fade-up" style={{ padding: '28px 20px calc(120px + env(safe-area-inset-bottom, 0px))' }}>
      <SubHeader title={track.title} onBack={() => setScreen('scenarios')} />

      <p style={{ color: C.inkSoft, fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
        {track.description}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {track.scenarios.map((scenario) => {
          const isSelected = selected?.id === scenario.id
          const diffDefault = DIFFICULTY_META[scenario.difficulty_default] || DIFFICULTY_META.medium
          const isDone = completedScenarios.includes(scenario.id)
          // Check if there's a saved (resumable) conversation for this scenario
          const isResumable = currentSession?.scenario === scenario.id &&
            (currentSession?.messages?.length || 0) > 1
          const scenarioIndex = track.scenarios.findIndex(s => s.id === scenario.id)
          const isLocked = isFreeTier && scenarioIndex > 0

          return (
            <div
              key={scenario.id}
              style={{
                borderRadius: 16, border: `1.5px solid ${isSelected ? C.coral : C.border}`,
                background: isSelected ? C.coralBg : C.surface,
                overflow: 'hidden', transition: 'border-color .2s, background .2s',
              }}
            >
              {/* Scenario header — always visible */}
              <button
                onClick={() => handleSelect(scenario)}
                style={{
                  width: '100%', textAlign: 'left', padding: '18px 20px',
                  background: 'transparent', border: 'none', display: 'flex', gap: 14, alignItems: 'flex-start',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <p style={{ fontFamily: SANS, fontWeight: 700, color: isSelected ? C.coral : C.ink, fontSize: 15 }}>
                      {scenario.title}
                    </p>
                    <span style={{
                      fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: '.05em',
                      padding: '2px 8px', borderRadius: 20,
                      color: diffDefault.color(C), background: diffDefault.bg(C),
                    }}>
                      {diffDefault.label.toUpperCase()}
                    </span>
                    {isDone && (
                      <span style={{
                        fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: '.05em',
                        color: C.teal, background: C.tealBg, padding: '2px 8px', borderRadius: 20,
                      }}>✓ Done</span>
                    )}
                    {isResumable && !isDone && (
                      <span style={{
                        fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: '.05em',
                        color: C.blue, background: C.blueBg, padding: '2px 8px', borderRadius: 20,
                      }}>IN PROGRESS</span>
                    )}
                    {isLocked && (
                      <span style={{
                        fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: '.05em',
                        color: C.inkSoft, background: C.surfaceSubtle, padding: '2px 8px', borderRadius: 20,
                      }}>Members only</span>
                    )}
                  </div>
                  <p style={{
                    fontFamily: SERIF, color: C.inkSoft, fontSize: 13, lineHeight: 1.55,
                    display: '-webkit-box', WebkitLineClamp: isSelected ? 100 : 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {scenario.card_blurb || scenario.context_short || scenario.context}
                  </p>
                </div>
                <span style={{ color: C.inkFaint, fontSize: 16, flexShrink: 0, marginTop: 2, transform: isSelected ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>›</span>
              </button>

              {/* Expanded: coaching focus + start */}
              {isSelected && (
                <div className="fade-in" style={{ padding: '0 20px 20px' }}>
                  {/* Coaching focus */}
                  <div style={{ marginBottom: 18 }}>
                    <p style={{ fontFamily: SANS, color: C.inkSoft, fontSize: 11, fontWeight: 700, letterSpacing: '.07em', marginBottom: 8 }}>
                      WHAT YOU'LL PRACTISE
                    </p>
                    {scenario.coaching_focus.map((f, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5, alignItems: 'flex-start' }}>
                        <span style={{ color: C.coral, fontSize: 12, marginTop: 1, flexShrink: 0 }}>◆</span>
                        <p style={{ fontFamily: SERIF, color: C.inkMid, fontSize: 13, lineHeight: 1.5 }}>{f}</p>
                      </div>
                    ))}
                  </div>

                  {/* Resume or Briefing — depends on whether there's a saved conversation */}
                  {isLocked ? (
                    <div style={{ background: C.coralBg, border: `1px solid ${C.coralDim}`, borderRadius: 12, padding: '16px', textAlign: 'center' }}>
                      <p style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: C.coral, marginBottom: 6 }}>Founding Members only</p>
                      <p style={{ fontFamily: SERIF, fontSize: 13, color: C.inkMid, lineHeight: 1.5, marginBottom: 12 }}>
                        This scenario is part of the full Fable library. Founding members get all 30+ scenarios at a rate locked for life.
                      </p>
                      <a href="https://www.scenariolab.quest#pricing" style={{ display: 'block', padding: '11px', borderRadius: 12, background: C.coral, color: '#fff', fontFamily: SANS, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                        See founding access →
                      </a>
                    </div>
                  ) : isResumable ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <Btn onClick={() => setScreen('simulation')}>Resume conversation →</Btn>
                      <Btn variant="secondary" onClick={() => onViewBriefing(scenario)}>Start fresh</Btn>
                    </div>
                  ) : (
                    <Btn onClick={() => onViewBriefing(scenario)}>
                      {isDone ? 'Practice again →' : 'Start scenario →'}
                    </Btn>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// SCENARIO BRIEFING SCREEN
// ═══════════════════════════════════════════════
function ScenarioBriefingScreen({ scenario, initialDifficulty = 'medium', onStart, onBack }) {
  const [difficulty, setDifficulty] = useState(initialDifficulty || scenario?.difficulty_default || 'medium')
  // Default voice on; remembers last choice across sessions
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    const prefs = lsGet(LS.prefs, {})
    return prefs.voiceEnabled !== false  // default true if never set
  })
  const saveVoicePref = (val) => {
    setVoiceEnabled(val)
    const prefs = lsGet(LS.prefs, {})
    lsSet(LS.prefs, { ...prefs, voiceEnabled: val })
  }

  if (!scenario) return null

  return (
    <div className="fade-up" style={{ padding: '28px 20px calc(120px + env(safe-area-inset-bottom, 0px))' }}>
      {/* Back */}
      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', color: C.inkSoft, fontSize: 20, marginBottom: 20, padding: 0 }}
      >←</button>

      {/* Title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 700, color: C.ink, marginBottom: 8, lineHeight: 1.25 }}>
          {scenario.title}
        </h1>
      </div>

      {/* Role cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <div style={{ background: C.coralBg, borderRadius: 14, padding: '14px', border: `1px solid ${C.coralDim}` }}>
          <p style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: C.coral, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 5 }}>
            You play
          </p>
          <p style={{ fontFamily: SERIF, color: C.ink, fontSize: 13, lineHeight: 1.45 }}>
            {scenario.userRole}
          </p>
        </div>
        <div style={{ background: C.surfaceSubtle, borderRadius: 14, padding: '14px', border: `1px solid ${C.border}` }}>
          <p style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: C.inkSoft, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 5 }}>
            Speaking with
          </p>
          <p style={{ fontFamily: SERIF, color: C.ink, fontSize: 13, lineHeight: 1.45 }}>
            {scenario.counterpartRole}
          </p>
        </div>
      </div>

      {/* The situation */}
      <Card bg={C.surfaceSubtle} border={C.border} style={{ marginBottom: 14 }}>
        <p style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: C.inkFaint, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 8 }}>
          The situation
        </p>
        <p style={{ fontFamily: SERIF, color: C.ink, fontSize: 15, lineHeight: 1.65 }}>
          {scenario.context_short || scenario.context}
        </p>
      </Card>

      {/* Good outcome */}
      {scenario.good_outcome && (
        <Card bg={C.tealBg} border="#A7F3D0" style={{ marginBottom: 14 }}>
          <p style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: C.teal, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 8 }}>
            What good looks like
          </p>
          <p style={{ fontFamily: SERIF, color: C.ink, fontSize: 14, lineHeight: 1.65 }}>
            {scenario.good_outcome}
          </p>
        </Card>
      )}

      {/* Watch out for */}
      {scenario.watch_out_for?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: C.inkFaint, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 10 }}>
            Watch out for
          </p>
          {scenario.watch_out_for.map((w, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7, alignItems: 'flex-start' }}>
              <span style={{ color: C.coral, fontSize: 13, flexShrink: 0, marginTop: 1 }}>⚠</span>
              <p style={{ fontFamily: SERIF, color: C.inkMid, fontSize: 13, lineHeight: 1.5 }}>{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* Difficulty picker */}
      <p style={{ fontFamily: SANS, color: C.inkSoft, fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 8 }}>
        Difficulty
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {Object.entries(DIFFICULTY_META).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => setDifficulty(key)}
            style={{
              flex: 1, padding: '10px 8px', borderRadius: 12,
              border: `1.5px solid ${difficulty === key ? meta.color(C) : C.border}`,
              background: difficulty === key ? meta.bg(C) : C.surface,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              transition: 'all .15s',
            }}
          >
            <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: difficulty === key ? meta.color(C) : C.inkSoft }}>
              {meta.label}
            </span>
            <span style={{ fontFamily: SANS, fontSize: 10, color: C.inkFaint, textAlign: 'center', lineHeight: 1.3 }}>
              {meta.desc}
            </span>
          </button>
        ))}
      </div>

      {/* Practice mode picker */}
      <p style={{ fontFamily: SANS, color: C.inkSoft, fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 8 }}>
        How do you want to practice?
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[
          { id: true,  icon: 'mic',  label: 'Voice',     desc: 'Speak & listen — most realistic' },
          { id: false, icon: 'chat', label: 'Text only', desc: 'Type — quieter environments' },
        ].map((opt) => (
          <button
            key={String(opt.id)}
            onClick={() => saveVoicePref(opt.id)}
            style={{
              flex: 1, padding: '10px 8px', borderRadius: 12,
              border: `1.5px solid ${voiceEnabled === opt.id ? C.blue : C.border}`,
              background: voiceEnabled === opt.id ? C.blueBg : C.surface,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              transition: 'all .15s',
            }}
          >
            <span style={{ display: 'flex' }}><LineIcon id={opt.icon} color={voiceEnabled === opt.id ? C.blue : C.inkSoft} size={17} /></span>
            <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: voiceEnabled === opt.id ? C.blue : C.inkSoft }}>
              {opt.label}
            </span>
            <span style={{ fontFamily: SANS, fontSize: 10, color: C.inkFaint, textAlign: 'center', lineHeight: 1.3 }}>
              {opt.desc}
            </span>
          </button>
        ))}
      </div>

      <Btn onClick={() => onStart(scenario, difficulty, voiceEnabled)}>Start Simulation →</Btn>
    </div>
  )
}

// ═══════════════════════════════════════════════
// SCENARIO DEBRIEF SCREEN
// ═══════════════════════════════════════════════
function ScenarioDebriefScreen({ session, onBack, onTryAgain, onMarkComplete, completedScenarios = [], rehearsal = null, onRehearseAgain, onRehearseReady }) {
  const [debrief, setDebrief]       = useState(null)
  const [regenerating, setRegenerating] = useState(false)
  const [loading, setLoading]       = useState(true)
  const [reflection, setReflection] = useState('')
  const [saved, setSaved]           = useState(false)

  const scenario = session?.scenarioData
  const messages = session?.messages || []

  useEffect(() => {
    if (!scenario || messages.length < 2) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetch('/api/coaching', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'scenario-debrief',
        conversationHistory: messages,
        scenario: { title: scenario.title, challenge: scenario.challenge || '', coaching_focus: scenario.coaching_focus || [] },
      }),
    })
      .then((r) => r.json())
      .then((d) => setDebrief(d))
      .catch(() => {
        const focusScores = {}
        ;(scenario.coaching_focus || []).forEach((f) => { focusScores[f] = 3 })
        setDebrief({
          overall_rating: 3,
          overall_summary: 'You completed the simulation. Review the conversation above to identify your strongest and weakest moments.',
          what_landed: { observation: 'You engaged with the scenario and kept the conversation going.', quote: '', why_it_works: 'Staying present in a difficult conversation is the foundation of everything else.' },
          what_created_friction: { observation: 'Some responses could have been sharper and more direct.', quote: '', impact: 'Vague language gives the counterpart room to dismiss your points.' },
          the_pattern: 'Review the transcript for a habit that repeated across your exchanges.',
          try_this_instead: 'Focus on one specific improvement for your next attempt.',
          the_principle: 'Precision earns credibility.',
          focus_scores: focusScores,
          speech_observations: { filler_phrases: [], hedging_language: [], strong_moments: [] },
          next_challenge: 'Try the next difficulty level.',
        })
      })
      .finally(() => setLoading(false))
  }, [])

  const DIFFICULTIES = ['easy', 'medium', 'hard']
  const currentDiff  = session?.difficulty || 'medium'
  const nextDiff     = DIFFICULTIES[Math.min(DIFFICULTIES.indexOf(currentDiff) + 1, DIFFICULTIES.length - 1)]
  const nextDiffMeta = DIFFICULTY_META[nextDiff]

  const Stars = ({ rating }) => (
    <div style={{ display: 'flex', gap: 4, margin: '12px 0' }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ fontSize: 24, color: s <= rating ? C.coral : C.border }}>★</span>
      ))}
    </div>
  )

  const SectionCard = ({ label, content, bg = C.surface, border = C.border, labelColor = C.inkSoft }) => (
    <Card bg={bg} border={border} style={{ marginBottom: 12 }}>
      <p style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: labelColor, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </p>
      <p style={{ fontFamily: SERIF, color: C.ink, fontSize: 14, lineHeight: 1.65 }}>{content}</p>
    </Card>
  )

  return (
    <div className="fade-up" style={{ padding: '28px 20px calc(120px + env(safe-area-inset-bottom, 0px))' }}>
      {/* Header */}
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.inkSoft, fontSize: 20, marginBottom: 20, padding: 0 }}>←</button>
      <p style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: C.teal, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>
        {rehearsal ? 'Good work. You showed up.' : 'Session complete ✓'}
      </p>
      <h1 style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 700, color: C.ink, marginBottom: 4, lineHeight: 1.25 }}>
        {scenario?.title || 'Debrief'}
      </h1>

      {loading ? (
        <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Dots />
          <p style={{ fontFamily: SANS, color: C.inkSoft, fontSize: 14 }}>Reading your conversation…</p>
        </div>
      ) : debrief ? (
        <>
          {/* Rating */}
          <Stars rating={debrief.overall_rating} />
          <p style={{ fontFamily: SERIF, color: C.inkMid, fontSize: 15, lineHeight: 1.65, marginBottom: 20 }}>
            {debrief.overall_summary}
          </p>

          {/* What landed */}
          <Card bg={C.tealBg} border="#A7F3D0" style={{ marginBottom: 12 }}>
            <p style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: C.teal, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 8 }}>What landed</p>
            <p style={{ fontFamily: SERIF, color: C.ink, fontSize: 14, lineHeight: 1.65 }}>
              {typeof debrief.what_landed === 'string' ? debrief.what_landed : debrief.what_landed?.observation}
            </p>
            {debrief.what_landed?.quote && (
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: C.inkMid, borderLeft: `3px solid ${C.teal}`, paddingLeft: 12, margin: '10px 0' }}>
                "{debrief.what_landed.quote}"
              </p>
            )}
            {debrief.what_landed?.why_it_works && (
              <p style={{ fontFamily: SANS, color: C.inkSoft, fontSize: 12, lineHeight: 1.5, marginTop: 6 }}>{debrief.what_landed.why_it_works}</p>
            )}
          </Card>

          {/* What created friction */}
          <Card bg={C.coralBg} border={C.coralDim} style={{ marginBottom: 12 }}>
            <p style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: C.coral, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 8 }}>What created friction</p>
            <p style={{ fontFamily: SERIF, color: C.ink, fontSize: 14, lineHeight: 1.65 }}>
              {typeof debrief.what_created_friction === 'string' ? debrief.what_created_friction : debrief.what_created_friction?.observation}
            </p>
            {debrief.what_created_friction?.quote && (
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: C.inkMid, borderLeft: `3px solid ${C.coral}`, paddingLeft: 12, margin: '10px 0' }}>
                "{debrief.what_created_friction.quote}"
              </p>
            )}
            {debrief.what_created_friction?.impact && (
              <p style={{ fontFamily: SANS, color: C.inkSoft, fontSize: 12, lineHeight: 1.5, marginTop: 6 }}>{debrief.what_created_friction.impact}</p>
            )}
          </Card>

          {/* The pattern */}
          {debrief.the_pattern && (
            <Card bg={C.blueBg} border={C.blueDim} style={{ marginBottom: 12 }}>
              <p style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: C.blue, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 8 }}>The Pattern</p>
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, color: C.blueDeep, lineHeight: 1.65 }}>"{debrief.the_pattern}"</p>
            </Card>
          )}

          {/* Try this instead */}
          <SectionCard label="Try this instead" content={debrief.try_this_instead} bg={C.surface} border={C.border} labelColor={C.inkSoft} />

          {/* Speech observations */}
          {debrief.speech_observations && (
            (() => {
              const so = debrief.speech_observations
              const hasFillers  = so.filler_phrases?.length > 0
              const hasHedging  = so.hedging_language?.length > 0
              const hasStrong   = so.strong_moments?.length > 0
              if (!hasFillers && !hasHedging && !hasStrong) return null
              return (
                <Card bg={C.surface} border={C.border} style={{ marginBottom: 12 }}>
                  <p style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: C.inkFaint, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 12 }}>Speech Patterns</p>
                  {hasFillers && (
                    <div style={{ marginBottom: 10 }}>
                      <p style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: C.coral, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>Filler phrases detected</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {so.filler_phrases.map((p, i) => (
                          <span key={i} style={{ fontFamily: SANS, fontSize: 12, padding: '4px 10px', borderRadius: 20, background: C.coralBg, color: C.coral }}>"{p}"</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {hasHedging && (
                    <div style={{ marginBottom: 10 }}>
                      <p style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: C.coral, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>Hedging language</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {so.hedging_language.map((p, i) => (
                          <span key={i} style={{ fontFamily: SANS, fontSize: 12, padding: '4px 10px', borderRadius: 20, background: C.coralBg, color: C.coral }}>"{p}"</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {hasStrong && (
                    <div>
                      <p style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: C.teal, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>Strong moments</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {so.strong_moments.map((p, i) => (
                          <span key={i} style={{ fontFamily: SANS, fontSize: 12, padding: '4px 10px', borderRadius: 20, background: C.tealBg, color: C.teal }}>"{p}"</span>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              )
            })()
          )}

          {/* The principle */}
          {debrief.the_principle && (
            <div style={{ background: C.ink, borderRadius: 16, padding: '20px', marginBottom: 12 }}>
              <p style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: C.inkFaint, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 8 }}>
                The Principle
              </p>
              <p style={{ fontFamily: SERIF, color: '#F8FAFC', fontSize: 16, lineHeight: 1.65, fontStyle: 'italic' }}>
                "{debrief.the_principle}"
              </p>
            </div>
          )}

          {/* Focus area bars */}
          {scenario?.coaching_focus?.length > 0 && debrief.focus_scores && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: C.inkFaint, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 12 }}>
                Focus areas
              </p>
              {scenario.coaching_focus.map((f, i) => {
                const score = debrief.focus_scores?.[f] || 3
                const pct   = Math.round((score / 5) * 100)
                const barColor = score >= 4 ? C.teal : score >= 3 ? C.blue : C.coral
                return (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <p style={{ fontFamily: SERIF, color: C.inkMid, fontSize: 13, lineHeight: 1.4, flex: 1, marginRight: 8 }}>{f}</p>
                      <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 12, color: barColor }}>{score}/5</span>
                    </div>
                    <div style={{ height: 6, background: C.border, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 4, transition: 'width .5s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Reflection */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: C.inkMid, marginBottom: 12 }}>
              What's one thing you want to carry into the real conversation?
            </p>
            <VoiceTextarea
              value={reflection}
              onChange={setReflection}
              placeholder="Your own words…"
              minHeight={100}
            />
          </div>

          {/* Actions */}
          {rehearsal ? (
            (() => {
              // warmup → realistic → worstcase
              const order = ['warmup', 'realistic', 'worstcase']
              const idx   = order.indexOf(rehearsal.difficulty)
              const harder = order[Math.min(idx + 1, order.length - 1)]
              const canHarder = harder !== rehearsal.difficulty
              if (regenerating) {
                return (
                  <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                    <div style={{ fontSize: 32, color: C.coral, animation: 'pulse 1.6s ease-in-out infinite' }}>✦</div>
                    <p style={{ fontFamily: SANS, fontSize: 13, color: C.inkSoft }}>Rebuilding the counterpart…</p>
                  </div>
                )
              }
              return (
                <div>
                  <p style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: C.blueDeep, marginBottom: 12 }}>Rehearse again</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {canHarder && (
                      <Btn variant="secondary" onClick={() => { setRegenerating(true); onRehearseAgain?.(harder, '') }}>
                        Same scenario, harder →
                      </Btn>
                    )}
                    <Btn variant="secondary" onClick={() => { setRegenerating(true); onRehearseAgain?.(rehearsal.difficulty, "The counterpart is in a particularly bad mood today — they are less patient than usual and quicker to challenge.") }}>
                      Different mood — they're angry
                    </Btn>
                    <Btn variant="secondary" onClick={() => { setRegenerating(true); onRehearseAgain?.('worstcase', 'Everything that can go wrong does. Maximum pressure throughout.') }}>
                      Worst case — everything wrong
                    </Btn>
                    <Btn onClick={() => { onMarkComplete(scenario?.id, reflection, debrief); onRehearseReady?.() }}>
                      I'm ready — mark as practiced ✓
                    </Btn>
                  </div>
                </div>
              )
            })()
          ) : saved ? (
            <>
              <div style={{ borderRadius: 14, background: C.tealBg, padding: '16px 18px', marginBottom: 16 }}>
                <p style={{ fontFamily: SANS, color: C.teal, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>✓ Rep saved.</p>
                <p style={{ fontFamily: SERIF, color: C.teal, fontSize: 13, fontStyle: 'italic', lineHeight: 1.5 }}>
                  One more conversation you won't be walking into unprepared.
                </p>
              </div>
              {nextDiff !== currentDiff && (
                <Btn
                  variant="secondary"
                  onClick={() => onTryAgain(scenario, nextDiff)}
                  style={{ marginBottom: 10 }}
                >
                  Go harder →
                </Btn>
              )}
              <Btn variant="ghost" onClick={onBack}>Back to track</Btn>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Btn onClick={() => { onMarkComplete(scenario?.id, reflection, debrief); setSaved(true) }}>
                Save & Mark Complete ✓
              </Btn>
              {nextDiff !== currentDiff && (
                <Btn variant="secondary" onClick={() => onTryAgain(scenario, nextDiff)}>
                  Go harder →
                </Btn>
              )}
              <Btn variant="ghost" onClick={onBack}>Back to track</Btn>
            </div>
          )}
        </>
      ) : (
        <Card style={{ textAlign: 'center', padding: '28px' }}>
          <p style={{ fontFamily: SERIF, color: C.inkSoft, fontSize: 15, fontStyle: 'italic' }}>
            Debrief unavailable — try again in a moment.
          </p>
          <Btn onClick={onBack} style={{ marginTop: 16 }}>Back to track</Btn>
        </Card>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════
// REHEARSE — personal conversation preparation
// ═══════════════════════════════════════════════

const REHEARSE_DIFF = [
  { id: 'warmup',    label: 'Warm up',    desc: 'Cooperative — build confidence' },
  { id: 'realistic', label: 'Realistic',  desc: 'They push back the way they probably will' },
  { id: 'worstcase', label: 'Worst case', desc: 'Everything goes wrong — are you ready?' },
]

// ── Entry screen — empty + active states ─────────────────────────────────────
function RehearseScreen({ user, rehearsals, onNew, onRehearse, onReflect, goToScenarios }) {
  const upcoming = rehearsals.filter((r) => r.status !== 'done')
  const past     = rehearsals.filter((r) => r.status === 'done')

  // ── Free tier: Rehearse is a Founding Members feature ──
  if (TIER_GATING_ENABLED && user?.tier === 'free') {
    return (
      <div className="fade-up" style={{ padding: '36px 24px calc(120px + env(safe-area-inset-bottom, 0px))' }}>
        <h1 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 700, color: C.ink, marginBottom: 6 }}>Rehearse</h1>
        <p style={{ fontFamily: SANS, fontSize: 15, color: C.inkMid, lineHeight: 1.5, marginBottom: 28 }}>
          For the conversations that actually matter.
        </p>

        <div style={{ background: C.coralBg, border: `1px solid ${C.coralDim}`, borderRadius: 18, padding: '28px 22px', marginBottom: 24, textAlign: 'center' }}>
          <p style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><LineIcon id="lock" color={C.coral} size={30} /></p>
          <p style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: C.coral, marginBottom: 10 }}>Founding Members only</p>
          <p style={{ fontFamily: SERIF, fontSize: 16, color: C.inkMid, lineHeight: 1.6, marginBottom: 18 }}>
            Rehearse builds a simulation <strong style={{ color: C.coral }}>personalized to you</strong> — your exact situation, the real person you're facing, and what you're worried about. It's part of the full Fable membership.
          </p>
          <a href="https://www.scenariolab.quest#pricing" style={{ display: 'block', padding: '13px', borderRadius: 12, background: C.coral, color: '#fff', fontFamily: SANS, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            See founding access →
          </a>
        </div>

        <button onClick={goToScenarios} style={{ display: 'block', margin: '0 auto', background: 'none', border: 'none', color: C.coral, fontFamily: SANS, fontSize: 14, fontWeight: 600 }}>
          Browse the Scenarios library →
        </button>
      </div>
    )
  }

  // ── Empty state ──
  if (rehearsals.length === 0) {
    return (
      <div className="fade-up" style={{ padding: '36px 24px calc(120px + env(safe-area-inset-bottom, 0px))' }}>
        <h1 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 700, color: C.ink, marginBottom: 6 }}>Rehearse</h1>
        <p style={{ fontFamily: SANS, fontSize: 15, color: C.inkMid, lineHeight: 1.5, marginBottom: 28 }}>
          For the conversations that actually matter.
        </p>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: '24px 22px', marginBottom: 24 }}>
          <p style={{ fontFamily: SERIF, fontSize: 19, color: C.ink, lineHeight: 1.5, marginBottom: 16 }}>
            Have a difficult conversation coming up?
          </p>
          <p style={{ fontFamily: SERIF, fontSize: 16, color: C.inkMid, lineHeight: 1.6, marginBottom: 16 }}>
            This is your space to build a simulation <strong style={{ color: C.coral }}>personalized to you</strong> — your exact situation, the real person you're facing, and what you're worried about.
          </p>
          <p style={{ fontFamily: SANS, fontSize: 14, color: C.inkSoft, lineHeight: 1.6 }}>
            Tell Fable about it in a few steps, and we'll custom-build the conversation so you can rehearse it — before it's real.
          </p>
        </div>

        <Btn onClick={onNew}>What conversation is coming up?</Btn>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0 16px' }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontFamily: SANS, fontSize: 11, color: C.inkFaint, letterSpacing: '.06em' }}>or explore</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>
        <p style={{ fontFamily: SANS, fontSize: 14, color: C.inkSoft, lineHeight: 1.6, textAlign: 'center', marginBottom: 6 }}>
          Not sure where to start?
        </p>
        <button onClick={goToScenarios} style={{ display: 'block', margin: '0 auto', background: 'none', border: 'none', color: C.coral, fontFamily: SANS, fontSize: 14, fontWeight: 600 }}>
          Browse the Scenarios library →
        </button>
      </div>
    )
  }

  // ── Active state ──
  return (
    <div className="fade-up" style={{ padding: '36px 20px calc(120px + env(safe-area-inset-bottom, 0px))' }}>
      <h1 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Rehearse</h1>
      <p style={{ fontFamily: SANS, fontSize: 14, color: C.inkMid, lineHeight: 1.5, marginBottom: 28 }}>
        For the conversations that matter
      </p>

      {upcoming.length > 0 && (
        <>
          <p style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: C.blueDeep, marginBottom: 12 }}>Coming up</p>
          {upcoming.map((r) => (
            <RehearseCard key={r.id} r={r} onRehearse={onRehearse} onReflect={onReflect} />
          ))}
        </>
      )}

      {past.length > 0 && (
        <>
          <p style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: C.blueDeep, margin: '28px 0 12px' }}>Past conversations</p>
          {past.map((r) => (
            <RehearseCard key={r.id} r={r} onRehearse={onRehearse} onReflect={onReflect} done />
          ))}
        </>
      )}

      <div style={{ marginTop: 24 }}>
        <Btn onClick={onNew}>+ New rehearsal</Btn>
      </div>
    </div>
  )
}

function RehearseCard({ r, onRehearse, onReflect, done }) {
  const diffLabel = (REHEARSE_DIFF.find((d) => d.id === r.difficulty) || {}).label || 'Realistic'
  const practiced = r.practiceCount || 0

  if (done) {
    return (
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.border}`,
        borderRadius: 16, padding: '18px 20px', marginBottom: 12, opacity: 0.85,
      }}>
        <p style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 600, color: C.ink, marginBottom: 4 }}>{r.title}</p>
        <p style={{ fontFamily: SANS, fontSize: 12, color: C.inkFaint, marginBottom: 10 }}>
          {r.realOutcomeDate ? new Date(r.realOutcomeDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Done'}  ·  Done
        </p>
        {r.realOutcome && (
          <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: C.inkMid, lineHeight: 1.5, marginBottom: 8 }}>
            "{r.realOutcome.length > 90 ? r.realOutcome.slice(0, 90) + '…' : r.realOutcome}"
          </p>
        )}
        <button onClick={() => onReflect(r)} style={{ background: 'none', border: 'none', color: C.inkSoft, fontFamily: SANS, fontSize: 13, fontWeight: 600, padding: 0 }}>
          View reflection →
        </button>
      </div>
    )
  }

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.coral}`,
      borderRadius: 16, padding: '20px', marginBottom: 12,
    }}>
      <p style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, color: C.ink, marginBottom: 4 }}>{r.title}</p>
      <p style={{ fontFamily: SANS, fontSize: 12, color: C.inkFaint, marginBottom: 12 }}>
        {r.createdAt ? `Created ${relativeTime(r.createdAt)}` : ''}
        {practiced > 0 ? `  ·  Practiced ${practiced} time${practiced === 1 ? '' : 's'}` : ''}
        {`  ·  ${diffLabel}`}
      </p>
      {r.noteToSelf && (
        <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: C.inkMid, lineHeight: 1.5, marginBottom: 14, borderLeft: `3px solid ${C.coralDim}`, paddingLeft: 12 }}>
          "{r.noteToSelf}"
        </p>
      )}
      <Btn onClick={() => onRehearse(r)} style={{ marginBottom: practiced > 0 ? 8 : 0 }}>
        {practiced > 0 ? 'Rehearse again →' : 'Start rehearsing →'}
      </Btn>
      {practiced > 0 && (
        <button onClick={() => onReflect(r)} style={{ display: 'block', width: '100%', textAlign: 'center', background: 'none', border: 'none', color: C.inkSoft, fontFamily: SANS, fontSize: 13, fontWeight: 600, padding: '8px 0 0' }}>
          It already happened — how did it go? →
        </button>
      )}
    </div>
  )
}

// ── Build flow — 4 steps + AI generation loading ────────────────────────────
const BUILD_MESSAGES = [
  'Reading your situation…',
  'Building the counterpart…',
  'Preparing the pressure points…',
  'Almost ready…',
]

function RehearseBuildScreen({ onCancel, onBuilt, initialSituation = '' }) {
  const [step, setStep]               = useState(1)
  const [situation, setSituation]     = useState(initialSituation)
  const [persona, setPersona]         = useState('')
  const [worry, setWorry]             = useState('')
  const [successLooks, setSuccess]    = useState('')
  const [difficulty, setDifficulty]   = useState('realistic')
  const [building, setBuilding]       = useState(false)
  const [buildMsg, setBuildMsg]       = useState(0)
  const [error, setError]             = useState(false)

  // Cycle the loading copy while the AI generates.
  useEffect(() => {
    if (!building) return
    const t = setInterval(() => setBuildMsg((m) => (m + 1) % BUILD_MESSAGES.length), 2000)
    return () => clearInterval(t)
  }, [building])

  const build = async () => {
    setError(false)
    setBuilding(true)
    setBuildMsg(0)
    const rehearsal = {
      id: newRehearsalId(),
      title: 'New rehearsal',
      createdAt: new Date().toISOString(),
      status: 'upcoming',
      situation, persona, worry, successLooks,
      difficulty,
      practiceCount: 0,
      lastPracticed: null,
      noteToSelf: null,
      realOutcome: null,
      realOutcomeDate: null,
      practiceHelpedRating: null,
      generatedScenario: null,
    }
    try {
      const res = await fetch('/api/coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'generate-scenario', rehearsal }),
      })
      if (!res.ok) throw new Error('generate failed')
      const data = await res.json()
      const scenario = data.scenario
      if (!scenario || !scenario.opening_line) throw new Error('bad scenario')
      // Attach an id so completion tracking works like a normal scenario.
      scenario.id = rehearsal.id
      scenario._rehearsalId = rehearsal.id
      const finished = { ...rehearsal, generatedScenario: scenario, title: scenario.title || rehearsal.title }
      saveRehearsal(finished)
      onBuilt(finished, scenario)
    } catch {
      setBuilding(false)
      setError(true)
    }
  }

  // ── Loading state ──
  if (building) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', padding: '0 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, color: C.coral, marginBottom: 24, animation: 'pulse 1.6s ease-in-out infinite' }}>✦</div>
        <p style={{ fontFamily: SERIF, fontSize: 20, fontStyle: 'italic', color: C.ink, marginBottom: 14 }}>Building your scenario…</p>
        <p style={{ fontFamily: SANS, fontSize: 14, color: C.inkSoft }}>{BUILD_MESSAGES[buildMsg]}</p>
      </div>
    )
  }

  const steps = [
    {
      n: 1,
      title: 'What conversation are you preparing for?',
      help: "Describe the situation as if you're telling a trusted friend. The more detail, the more realistic the simulation.",
      value: situation, set: setSituation,
      placeholder: 'e.g. "I\'m presenting our Q3 audit findings to the board next Tuesday. We found a significant gap in controls that the CFO doesn\'t know about yet…"',
      min: 30,
    },
    {
      n: 2,
      title: "Tell me about the person you're talking to.",
      help: 'Their role, their personality, and how they typically react under pressure.',
      note: 'This is how Fable will play the other person in your simulation.',
      value: persona, set: setPersona,
      placeholder: 'e.g. "The CFO — very senior, data-driven, hates surprises. Gets defensive when challenged publicly. Tends to ask sharp follow-up questions…"',
      min: 20,
    },
    {
      n: 3,
      title: 'What are you most worried about?',
      help: "What's the part of this conversation that keeps you up at night?",
      value: worry, set: setWorry,
      placeholder: 'e.g. "That they\'ll question my findings and I won\'t be able to defend them under pressure. Or that the conversation will turn political…"',
      min: 20,
    },
    {
      n: 4,
      title: 'What does a good outcome look like?',
      help: 'When you walk out of this conversation — what would make you feel it went well?',
      value: successLooks, set: setSuccess,
      placeholder: 'e.g. "They accept the findings without a major dispute. I leave with a clear remediation plan agreed, and the relationship intact…"',
      min: 20,
      last: true,
    },
  ]
  const cur = steps[step - 1]
  const canNext = (cur.value || '').trim().length >= cur.min

  return (
    <div className="fade-up" style={{ padding: '20px 20px 40px', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Header: back + step counter + dots */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <button
          onClick={() => (step === 1 ? onCancel() : setStep(step - 1))}
          style={{ background: 'none', border: 'none', color: C.inkSoft, fontFamily: SANS, fontSize: 14, padding: '4px 0' }}
        >← Back</button>
        <span style={{ fontFamily: SANS, fontSize: 12, color: C.inkFaint, fontWeight: 600 }}>Step {step} of 4</span>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
        {[1, 2, 3, 4].map((s) => (
          <div key={s} style={{ width: s === step ? 22 : 8, height: 8, borderRadius: 4, background: s <= step ? C.coral : C.coralDim, transition: 'all .3s' }} />
        ))}
      </div>

      <h1 style={{ fontFamily: SERIF, fontSize: 25, fontWeight: 700, color: C.ink, lineHeight: 1.3, marginBottom: 12 }}>{cur.title}</h1>
      <p style={{ fontFamily: SANS, fontSize: 14, color: C.inkMid, lineHeight: 1.6, marginBottom: 20 }}>{cur.help}</p>

      <VoiceTextarea value={cur.value} onChange={cur.set} placeholder={cur.placeholder} minHeight={150} />

      {cur.note && (
        <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13, color: C.inkSoft, lineHeight: 1.55, marginTop: 14 }}>{cur.note}</p>
      )}

      {cur.last && (
        <div style={{ marginTop: 24 }}>
          <p style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: C.inkSoft, marginBottom: 12 }}>
            How do you want to prepare?
          </p>
          {REHEARSE_DIFF.map((d) => {
            const sel = difficulty === d.id
            return (
              <button
                key={d.id}
                onClick={() => setDifficulty(d.id)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: sel ? C.coralBg : C.surface,
                  border: `1.5px solid ${sel ? C.coral : C.border}`,
                  borderRadius: 12, padding: '13px 16px', marginBottom: 10,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${sel ? C.coral : C.border}`,
                    background: sel ? C.coral : 'transparent',
                    boxShadow: sel ? `inset 0 0 0 2px ${C.surface}` : 'none',
                  }} />
                  <span>
                    <span style={{ display: 'block', fontFamily: SANS, fontSize: 14, fontWeight: 700, color: sel ? C.coral : C.ink }}>{d.label}</span>
                    <span style={{ display: 'block', fontFamily: SANS, fontSize: 12, color: C.inkSoft, lineHeight: 1.4, marginTop: 2 }}>{d.desc}</span>
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}

      {error && (
        <p style={{ fontFamily: SANS, fontSize: 13, color: C.coral, marginTop: 16, textAlign: 'center' }}>
          Couldn't build your scenario — tap to try again.
        </p>
      )}

      <div style={{ marginTop: 24 }}>
        {cur.last ? (
          <Btn onClick={build} disabled={!canNext}>Build my scenario →</Btn>
        ) : (
          <Btn onClick={() => canNext && setStep(step + 1)} disabled={!canNext}>Next →</Btn>
        )}
      </div>
    </div>
  )
}

// ── Note to self — shown after marking practiced ────────────────────────────
function RehearseNoteScreen({ rehearsal, onSave, onSkip }) {
  const [note, setNote] = useState(rehearsal?.noteToSelf || '')
  return (
    <div className="fade-up" style={{ padding: '48px 24px 40px', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <h1 style={{ fontFamily: SERIF, fontSize: 25, fontWeight: 700, color: C.ink, lineHeight: 1.3, marginBottom: 14 }}>
        One thing to remember when you walk in.
      </h1>
      <p style={{ fontFamily: SANS, fontSize: 15, color: C.inkMid, lineHeight: 1.6, marginBottom: 24 }}>
        What do you want to carry into this conversation?
      </p>
      <VoiceTextarea value={note} onChange={setNote} placeholder="Write one sentence…" minHeight={110} />
      <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13, color: C.inkSoft, lineHeight: 1.55, marginTop: 14, marginBottom: 28 }}>
        This will appear at the top of your rehearsal when you open it again.
      </p>
      <Btn onClick={() => onSave(note.trim())} disabled={!note.trim()}>Save my note</Btn>
      <button onClick={onSkip} style={{ background: 'none', border: 'none', color: C.inkSoft, fontFamily: SANS, fontSize: 14, marginTop: 14, padding: '8px 0' }}>
        Skip for now
      </button>
    </div>
  )
}

// ── Post-conversation reflection ────────────────────────────────────────────
const HELPED_OPTIONS = [
  { id: 'yes',      label: 'Yes — I felt more prepared' },
  { id: 'somewhat', label: 'Somewhat — parts of it helped' },
  { id: 'no',       label: 'Not really — it went differently' },
]

function RehearseReflectionScreen({ rehearsal, onSave, onBack }) {
  const alreadyDone = rehearsal?.status === 'done'
  const [outcome, setOutcome] = useState(rehearsal?.realOutcome || '')
  const [rating, setRating]   = useState(rehearsal?.practiceHelpedRating || null)

  return (
    <div className="fade-up" style={{ padding: '40px 24px 40px', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.inkSoft, fontSize: 20, marginBottom: 18, padding: 0, alignSelf: 'flex-start' }}>←</button>
      <h1 style={{ fontFamily: SERIF, fontSize: 25, fontWeight: 700, color: C.ink, lineHeight: 1.3, marginBottom: 12 }}>
        How did it actually go?
      </h1>
      <p style={{ fontFamily: SANS, fontSize: 15, color: C.inkMid, lineHeight: 1.6, marginBottom: 24 }}>
        You practiced. You showed up. What happened?
      </p>
      <VoiceTextarea value={outcome} onChange={setOutcome} placeholder="Write a few lines…" minHeight={130} />

      <p style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: C.inkMid, margin: '24px 0 12px' }}>
        Did the practice help?
      </p>
      {HELPED_OPTIONS.map((o) => {
        const sel = rating === o.id
        return (
          <button
            key={o.id}
            onClick={() => setRating(o.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
              background: sel ? C.blueBg : C.surface,
              border: `1.5px solid ${sel ? C.blue : C.border}`,
              borderRadius: 12, padding: '13px 16px', marginBottom: 10,
            }}
          >
            <span style={{
              width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
              border: `2px solid ${sel ? C.blue : C.border}`,
              background: sel ? C.blue : 'transparent',
              boxShadow: sel ? `inset 0 0 0 2px ${C.surface}` : 'none',
            }} />
            <span style={{ fontFamily: SANS, fontSize: 14, color: sel ? C.blue : C.ink, fontWeight: sel ? 700 : 500 }}>{o.label}</span>
          </button>
        )
      })}

      <div style={{ marginTop: 20 }}>
        <Btn onClick={() => onSave(outcome.trim(), rating)} disabled={!outcome.trim()}>
          {alreadyDone ? 'Update reflection' : 'Save reflection'}
        </Btn>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════
export default function App() {
  const [screen,    setScreen]    = useState('loading')
  const [activeTab, setActiveTab] = useState('home')
  const [user,      setUser]      = useState(null)
  const [sessions,  setSessions]  = useState([])
  const [storylab,  setStorylab]  = useState({ currentDay: 1, completedDays: [] })

  // Daily Rep state
  const DAILY_REP_DEFAULTS = { currentDay: 1, streak: 0, longestStreak: 0, completedDays: [], reflections: {}, startDate: null, lastCompletedDate: null }
  const [dailyRep,         setDailyRep]         = useState(DAILY_REP_DEFAULTS)
  const [activeDailyRepDay, setActiveDailyRepDay] = useState(null)   // the day object currently being worked on
  const [pendingDailyRepDay, setPendingDailyRepDay] = useState(null) // set when user-choice day sends user to scenario picker

  // Onboarding state
  const [obName, setObName] = useState('')
  const [obRole, setObRole] = useState('')

  // Session state
  const [currentSession, setCurrentSession] = useState(null)

  // Scenario track state
  const [activeTrack, setActiveTrack] = useState(null)

  // Scenario briefing state
  const [activeBriefingScenario, setActiveBriefingScenario] = useState(null)
  const [pendingBriefingDifficulty, setPendingBriefingDifficulty] = useState(null)

  // Completed scenarios (from LS key 'completedScenarios')
  const [completedScenarios, setCompletedScenarios] = useState([])

  // Rich per-scenario debrief data (focus scores, overall rating, etc.)
  const [completedData, setCompletedData] = useState({})

  // Coach session state
  const [coachSession, setCoachSession] = useState(null)

  // Rehearse state
  const [rehearsals,      setRehearsals]      = useState([])
  const [activeRehearsal, setActiveRehearsal] = useState(null)
  // Pre-fills step 1 of the Rehearse build (e.g. from the onboarding question).
  const [pendingBuildSituation, setPendingBuildSituation] = useState('')
  // Where the briefing / debrief "back" arrow returns to (tracks vs rehearse).
  const [briefingBackTarget, setBriefingBackTarget] = useState('track-scenarios')
  const [debriefBackTarget,  setDebriefBackTarget]  = useState('track-scenarios')
  const [pendingTier, setPendingTier] = useState(null)

  const refreshRehearsals = () => setRehearsals(getRehearsals())

  // Load from localStorage on mount
  useEffect(() => {
    const savedUser          = lsGet(LS.user, null)
    const savedSessions      = lsGet(LS.sessions, [])
    const savedStorylab      = lsGet(LS.storylab, { currentDay: 1, completedDays: [] })
    const savedDailyRep      = lsGet(LS.dailyRep, DAILY_REP_DEFAULTS)
    const savedCompleted     = lsGet(LS.completed, [])
    const savedCompletedData = lsGet(LS.completedData, {})

    setSessions(savedSessions)
    setStorylab(savedStorylab)
    setDailyRep(savedDailyRep)
    setCompletedScenarios(savedCompleted)
    setCompletedData(savedCompletedData)
    setRehearsals(getRehearsals())

    if (typeof window !== 'undefined') {
      const urlPlan = new URLSearchParams(window.location.search).get('plan')
      if (urlPlan === 'free' || urlPlan === 'full') {
        setPendingTier(urlPlan)
        if (savedUser) { savedUser.tier = urlPlan; lsSet(LS.user, savedUser) }
      }
    }

    if (savedUser?.onboarded) {
      setUser(savedUser)
      setScreen('home')
    } else {
      setScreen('onboard1')
    }
  }, [])

  // Navigation
  const goTab = (tab) => {
    setActiveTab(tab)
    setScreen(tab)
  }

  // Onboarding flow
  const finishOnboarding = (upcomingMoment) => {
    const u = { name: obName, role: obRole, upcomingMoment, onboarded: true, tier: pendingTier || 'full' }
    lsSet(LS.user, u)
    setUser(u)
    // If they named a conversation to prepare for, take them straight into the
    // Rehearse build with it pre-filled — don't make them re-type it.
    // (Rehearse is a paid feature, so free-tier users go home instead.)
    if ((!TIER_GATING_ENABLED || u.tier !== 'free') && upcomingMoment && upcomingMoment.trim()) {
      setPendingBuildSituation(upcomingMoment.trim())
      setActiveTab('rehearse')
      setScreen('rehearse-build')
    } else {
      setScreen('home')
      setActiveTab('home')
    }
  }

  // Start a session from coach screen
  const startSession = ({ scenario, context, difficulty = 'medium' }) => {
    setCurrentSession({ scenario, context, userMessage: '', feedback: null, difficulty })
  }

  // Receive feedback from practice screen
  const receiveFeedback = ({ feedback, userMessage }) => {
    setCurrentSession((prev) => ({ ...prev, userMessage, feedback }))
  }

  // Start a structured scenario (from a track)
  // Also handles user-choice Daily Rep days — checks pendingDailyRepDay
  const startScenario = (scenarioData, difficulty, voiceEnabled = true) => {
    const isForDailyRep = !!pendingDailyRepDay
    setCurrentSession({
      scenario: scenarioData.id,
      context: scenarioData.context,
      userMessage: '',
      feedback: null,
      difficulty: difficulty || scenarioData.difficulty_default || 'medium',
      scenarioData,
      userRole: user?.role || 'all',
      isDailyRep: isForDailyRep,
      dailyRepDay: isForDailyRep ? pendingDailyRepDay.day : undefined,
      rehearsalId: scenarioData._rehearsalId || null,
      voiceEnabled,
    })
    if (isForDailyRep) setPendingDailyRepDay(null)
    setScreen('simulation')
  }

  // ── Rehearse handlers ──────────────────────────────────────────────────────
  const startNewRehearsal = () => {
    if (TIER_GATING_ENABLED && user?.tier === 'free') { setActiveTab('rehearse'); setScreen('rehearse'); return }
    setPendingBuildSituation(''); setScreen('rehearse-build')
  }

  // After AI builds the scenario → route through the standard briefing screen.
  const onRehearsalBuilt = (rehearsal, scenario) => {
    refreshRehearsals()
    setActiveRehearsal(rehearsal)
    setActiveBriefingScenario(scenario)
    setPendingBriefingDifficulty(rehearseDifficultyToSystem(rehearsal.difficulty))
    setBriefingBackTarget('rehearse')
    setDebriefBackTarget('rehearse')
    setScreen('scenario-briefing')
  }

  // Re-practice an existing rehearsal (from its card).
  const rehearseExisting = (rehearsal) => {
    if (!rehearsal?.generatedScenario) return
    setActiveRehearsal(rehearsal)
    setActiveBriefingScenario(rehearsal.generatedScenario)
    setPendingBriefingDifficulty(rehearseDifficultyToSystem(rehearsal.difficulty))
    setBriefingBackTarget('rehearse')
    setDebriefBackTarget('rehearse')
    setScreen('scenario-briefing')
  }

  // Regenerate a rehearsal's counterpart at a new intensity / mood (from debrief).
  const rehearseAgainVariation = async (rehearsalId, newDifficulty, extraInstruction) => {
    const rehearsal = getRehearsals().find((r) => r.id === rehearsalId)
    if (!rehearsal) return
    try {
      const res = await fetch('/api/coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'generate-scenario',
          rehearsal: { ...rehearsal, difficulty: newDifficulty || rehearsal.difficulty },
          extraInstruction: extraInstruction || '',
        }),
      })
      if (!res.ok) throw new Error('regen failed')
      const data = await res.json()
      const scenario = data.scenario
      scenario.id = rehearsal.id
      scenario._rehearsalId = rehearsal.id
      updateRehearsal(rehearsal.id, { difficulty: newDifficulty || rehearsal.difficulty, generatedScenario: scenario })
      refreshRehearsals()
      const updated = { ...rehearsal, difficulty: newDifficulty || rehearsal.difficulty, generatedScenario: scenario }
      setActiveRehearsal(updated)
      setActiveBriefingScenario(scenario)
      setPendingBriefingDifficulty(rehearseDifficultyToSystem(newDifficulty || rehearsal.difficulty))
      setBriefingBackTarget('rehearse')
      setDebriefBackTarget('rehearse')
      setScreen('scenario-briefing')
    } catch {
      // Fall back to re-running the existing scenario unchanged.
      rehearseExisting(getRehearsals().find((r) => r.id === rehearsalId))
    }
  }

  // Count a completed rehearsal simulation.
  const incrementRehearsalPractice = (rehearsalId) => {
    if (!rehearsalId) return
    const r = getRehearsals().find((x) => x.id === rehearsalId)
    if (!r) return
    updateRehearsal(rehearsalId, {
      practiceCount: (r.practiceCount || 0) + 1,
      lastPracticed: new Date().toISOString(),
      status: r.status === 'done' ? 'done' : 'practiced',
    })
    refreshRehearsals()
  }

  const saveRehearsalNote = (rehearsalId, note) => {
    updateRehearsal(rehearsalId, { noteToSelf: note || null })
    refreshRehearsals()
  }

  const saveRehearsalReflection = (rehearsalId, outcome, rating) => {
    updateRehearsal(rehearsalId, {
      realOutcome: outcome || null,
      realOutcomeDate: new Date().toISOString(),
      practiceHelpedRating: rating || null,
      status: 'done',
    })
    refreshRehearsals()
  }

  // Open the briefing screen for a scenario
  // Central tier gate: free-tier users can only access the first scenario of
  // each track. Daily reps / rehearsals (no track match) are never locked.
  const isScenarioLockedForUser = (scenario) => {
    if (!TIER_GATING_ENABLED) return false
    if (user?.tier !== 'free') return false
    if (!scenario?.id) return false
    const match = findTrackScenario(scenario.id)
    if (!match) return false
    return match.track.scenarios.findIndex((s) => s.id === scenario.id) > 0
  }

  const openBriefing = (scenario, initialDifficulty = null) => {
    // Block locked scenarios from every entry point (Home, Progress, track list,
    // next-challenge card) — route to the track list where the upgrade prompt shows.
    if (isScenarioLockedForUser(scenario)) {
      const match = findTrackScenario(scenario.id)
      if (match) { setActiveTrack(match.track); setScreen('track-scenarios'); setActiveTab('scenarios') }
      return
    }
    setActiveBriefingScenario(scenario)
    setPendingBriefingDifficulty(initialDifficulty || scenario.difficulty_default || 'medium')
    setScreen('scenario-briefing')
  }

  // Mark a scenario as completed and save reflection + debrief data
  const markScenarioComplete = (scenarioId, reflection, debrief) => {
    if (!scenarioId) return
    const updated = completedScenarios.includes(scenarioId)
      ? completedScenarios
      : [...completedScenarios, scenarioId]
    setCompletedScenarios(updated)
    lsSet(LS.completed, updated)

    if (debrief) {
      const updatedData = {
        ...completedData,
        [scenarioId]: { completedAt: Date.now(), reflection, debrief },
      }
      setCompletedData(updatedData)
      lsSet(LS.completedData, updatedData)
    }
  }

  // Start a Daily Rep scenario (mini or track — not user-choice)
  const startDailyRepScenario = (scenarioData, difficulty, dayNumber) => {
    setCurrentSession({
      scenario: scenarioData.id,
      context: scenarioData.context,
      userMessage: '',
      feedback: null,
      difficulty: difficulty || scenarioData.difficulty_default || 'medium',
      scenarioData,
      userRole: user?.role || 'all',
      isDailyRep: true,
      dailyRepDay: dayNumber,
    })
    setScreen('simulation')
  }

  // Navigate to insight → briefing for a Daily Rep day
  const startDailyRep = (day) => {
    setActiveDailyRepDay(day)
    setScreen('daily-rep-insight')
  }

  // Mark a Daily Rep day complete, update streak, save reflection
  const completeDailyRep = (dayNumber, reflection) => {
    const today       = new Date().toDateString()
    const yesterday   = new Date(Date.now() - 86400000).toDateString()
    const last        = dailyRep.lastCompletedDate
    const alreadyDone = (dailyRep.completedDays || []).includes(dayNumber)

    if (alreadyDone) {
      setScreen('home')
      setActiveTab('home')
      return
    }

    let newStreak = dailyRep.streak || 0
    if (last === yesterday) {
      newStreak = newStreak + 1
    } else if (last === today) {
      // already counted today
    } else {
      newStreak = 1
    }

    const newLongest     = Math.max(dailyRep.longestStreak || 0, newStreak)
    const completedDays  = [...(dailyRep.completedDays || []), dayNumber]
    const nextDay        = Math.min(dayNumber + 1, 30)
    const newDailyRep    = {
      ...dailyRep,
      currentDay: nextDay,
      completedDays,
      streak: newStreak,
      longestStreak: newLongest,
      lastCompletedDate: today,
      reflections: { ...(dailyRep.reflections || {}), [dayNumber]: reflection },
      startDate: dailyRep.startDate || today,
    }
    setDailyRep(newDailyRep)
    lsSet(LS.dailyRep, newDailyRep)
  }

  // Start a Storylab mission (archived — kept for backward compatibility)
  const startMission = (mission) => {
    setCurrentSession({ scenario: 'storylab', context: mission.prompt, userMessage: '', feedback: null, difficulty: 'medium', userRole: user?.role || 'all' })
    setActiveTab('coach')
    setScreen('practice')
  }

  const SUB_SCREENS = ['practice', 'feedback', 'simulation', 'share', 'track-scenarios', 'storylab', 'daily-rep', 'daily-rep-briefing', 'daily-rep-debrief', 'scenario-briefing', 'scenario-debrief']
  const showNav = !['loading', 'onboard1', 'onboard2', 'onboard3', 'simulation', 'coach-conversation', 'daily-rep-insight', 'rehearse-build', 'rehearse-note', 'rehearse-reflect'].includes(screen)

  const renderScreen = () => {
    switch (screen) {
      case 'loading':
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <Dots />
          </div>
        )

      case 'onboard1':
        return <Onboard1 onNext={(name) => { setObName(name); setScreen('onboard2') }} />

      case 'onboard2':
        return <Onboard2 name={obName} onNext={(r) => { setObRole(r); setScreen('onboard3') }} />

      case 'onboard3':
        return (
          <Onboard3
            onNext={(moment) => finishOnboarding(moment)}
            onSkip={() => finishOnboarding('')}
          />
        )

      case 'home':
        return (
          <HomeScreen
            user={user}
            sessions={sessions}
            rehearsals={rehearsals}
            dailyRep={dailyRep}
            setScreen={(s) => { setScreen(s); if (['coach','progress','daily-rep'].includes(s)) setActiveTab(s === 'daily-rep' ? 'home' : s) }}
            setActiveTrack={setActiveTrack}
            onStartDay={startDailyRep}
            onResumeSession={(s) => {
              setCurrentSession(s)
              if (s.feedback) {
                setScreen('feedback')
                setActiveTab('coach')
              } else {
                const found = findTrackScenario(s.scenario)
                if (found) {
                  setActiveTrack(found.track)
                  setScreen('track-scenarios')
                  setActiveTab('scenarios')
                } else {
                  setScreen('coach')
                  setActiveTab('coach')
                }
              }
            }}
          />
        )

      case 'coach':
        return (
          <CoachScreen
            sessions={sessions}
            setScreen={setScreen}
            onStartMode={(mode) => {
              setCoachSession({ mode, lifeArea: null, guidedAnswers: null, freeformText: '', messages: [], situationLabel: '' })
              setScreen(mode === 'specific' ? 'coach-area' : 'coach-freeform')
            }}
          />
        )

      case 'coach-area':
        return (
          <CoachAreaScreen
            setScreen={setScreen}
            onSelectArea={(lifeArea) => {
              setCoachSession((prev) => ({ ...prev, lifeArea }))
              setScreen('coach-guided')
            }}
          />
        )

      case 'coach-guided':
        return (
          <CoachGuidedScreen
            lifeArea={coachSession?.lifeArea}
            setScreen={setScreen}
            onComplete={(guidedAnswers) => {
              const words = guidedAnswers.situation.trim().split(/\s+/).slice(0, 5).join(' ')
              const label = words.length < guidedAnswers.situation.trim().length ? words + '…' : words
              setCoachSession((prev) => ({ ...prev, guidedAnswers, situationLabel: label }))
              setScreen('coach-conversation')
            }}
          />
        )

      case 'coach-freeform':
        return (
          <CoachFreeformScreen
            setScreen={setScreen}
            onStart={(freeformText) => {
              const words = freeformText.trim().split(/\s+/).slice(0, 5).join(' ')
              setCoachSession((prev) => ({ ...prev, freeformText, situationLabel: words + '…' }))
              setScreen('coach-conversation')
            }}
          />
        )

      case 'coach-conversation':
        return (
          <CoachConversationScreen
            coachSession={coachSession}
            setScreen={setScreen}
            onWrapUp={(messages) => {
              setCoachSession((prev) => ({ ...prev, messages }))
              setScreen('coach-debrief')
            }}
          />
        )

      case 'coach-debrief':
        return (
          <CoachDebriefScreen
            coachSession={coachSession}
            setScreen={(s) => { setScreen(s); if (s === 'coach') setActiveTab('coach'); if (s === 'home') setActiveTab('home') }}
            sessions={sessions}
            setSessions={setSessions}
          />
        )

      case 'practice':
        return (
          <PracticeScreen
            session={currentSession}
            setScreen={setScreen}
            onFeedback={receiveFeedback}
            user={user}
          />
        )

      case 'feedback':
        return (
          <FeedbackScreen
            session={currentSession}
            setScreen={setScreen}
            sessions={sessions}
            setSessions={setSessions}
            storylab={storylab}
            setStorylab={(sl) => { setStorylab(sl); lsSet(LS.storylab, sl) }}
          />
        )

      case 'simulation':
        return (
          <SimulationScreen
            session={currentSession}
            setScreen={setScreen}
            sessions={sessions}
            setSessions={setSessions}
            onSaveMessages={(msgs) => setCurrentSession((prev) => prev ? { ...prev, messages: msgs } : prev)}
            onComplete={() => { if (currentSession?.rehearsalId) incrementRehearsalPractice(currentSession.rehearsalId) }}
          />
        )

      case 'scenario-briefing':
        return (
          <ScenarioBriefingScreen
            scenario={activeBriefingScenario}
            initialDifficulty={pendingBriefingDifficulty}
            onStart={(scenario, difficulty, voiceEnabled) => startScenario(scenario, difficulty, voiceEnabled)}
            onBack={() => { setScreen(briefingBackTarget); if (briefingBackTarget === 'rehearse') setActiveTab('rehearse') }}
          />
        )

      case 'scenario-debrief':
        return (
          <ScenarioDebriefScreen
            session={currentSession}
            completedScenarios={completedScenarios}
            rehearsal={currentSession?.rehearsalId ? rehearsals.find((r) => r.id === currentSession.rehearsalId) : null}
            onBack={() => { setScreen(debriefBackTarget); if (debriefBackTarget === 'rehearse') setActiveTab('rehearse') }}
            onTryAgain={(scenario, nextDiff) => openBriefing(scenario, nextDiff)}
            onMarkComplete={(scenarioId, reflection, debrief) => markScenarioComplete(scenarioId, reflection, debrief)}
            onRehearseAgain={(newDiff, extra) => rehearseAgainVariation(currentSession?.rehearsalId, newDiff, extra)}
            onRehearseReady={() => { setActiveRehearsal(rehearsals.find((r) => r.id === currentSession?.rehearsalId) || activeRehearsal); setScreen('rehearse-note') }}
          />
        )

      case 'rehearse':
        return (
          <RehearseScreen
            user={user}
            rehearsals={rehearsals}
            onNew={startNewRehearsal}
            onRehearse={rehearseExisting}
            onReflect={(r) => { setActiveRehearsal(r); setScreen('rehearse-reflect') }}
            goToScenarios={() => goTab('scenarios')}
          />
        )

      case 'rehearse-build':
        return (
          <RehearseBuildScreen
            initialSituation={pendingBuildSituation}
            onCancel={() => { setScreen('rehearse'); setActiveTab('rehearse') }}
            onBuilt={onRehearsalBuilt}
          />
        )

      case 'rehearse-note':
        return (
          <RehearseNoteScreen
            rehearsal={activeRehearsal}
            onSave={(note) => { saveRehearsalNote(activeRehearsal?.id, note); setScreen('rehearse'); setActiveTab('rehearse') }}
            onSkip={() => { setScreen('rehearse'); setActiveTab('rehearse') }}
          />
        )

      case 'rehearse-reflect':
        return (
          <RehearseReflectionScreen
            rehearsal={activeRehearsal}
            onSave={(outcome, rating) => { saveRehearsalReflection(activeRehearsal?.id, outcome, rating); setScreen('rehearse'); setActiveTab('rehearse') }}
            onBack={() => { setScreen('rehearse'); setActiveTab('rehearse') }}
          />
        )

      case 'share':
        return <ShareScreen session={currentSession} setScreen={setScreen} />

      case 'progress':
        return (
          <ProgressScreen
            sessions={sessions}
            setScreen={setScreen}
            dailyRep={dailyRep}
            completedData={completedData}
            openBriefing={openBriefing}
            setActiveTrack={setActiveTrack}
            rehearsals={rehearsals}
          />
        )

      case 'daily-rep':
        return (
          <DailyRepScreen
            dailyRep={dailyRep}
            setScreen={setScreen}
            onStartDay={startDailyRep}
          />
        )

      case 'daily-rep-insight':
        return (
          <DailyRepInsightScreen
            day={activeDailyRepDay}
            onContinue={() => setScreen('daily-rep-briefing')}
          />
        )

      case 'daily-rep-briefing': {
        const bScenario = getDailyRepScenario(activeDailyRepDay)
        return (
          <DailyRepBriefingScreen
            day={activeDailyRepDay}
            scenario={bScenario}
            setScreen={setScreen}
            onBegin={(scenarioData, difficulty) => {
              startDailyRepScenario(scenarioData, difficulty, activeDailyRepDay?.day)
            }}
            onChooseScenario={() => {
              // User-choice day: send to scenario picker, tag session as Daily Rep
              setPendingDailyRepDay(activeDailyRepDay)
              setActiveTab('scenarios')
              setScreen('scenarios')
            }}
          />
        )
      }

      case 'daily-rep-debrief': {
        // Find the day data for the session that just completed
        const debriefDay = activeDailyRepDay ||
          DAILY_REP_PROGRAM.find((d) => d.day === currentSession?.dailyRepDay) ||
          DAILY_REP_PROGRAM[Math.min((dailyRep.currentDay || 1) - 1, 29)]
        return (
          <DailyRepDebriefScreen
            day={debriefDay}
            setScreen={(s) => { setScreen(s); if (s === 'home') setActiveTab('home') }}
            onComplete={(reflection) => {
              completeDailyRep(debriefDay?.day || dailyRep.currentDay, reflection)
            }}
          />
        )
      }

      case 'storylab':
        return (
          <StorylabScreen
            storylab={storylab}
            setStorylab={(sl) => { setStorylab(sl); lsSet(LS.storylab, sl) }}
            setScreen={setScreen}
            onStartMission={startMission}
          />
        )

      case 'scenarios':
        return (
          <ScenariosScreen
            setScreen={setScreen}
            setActiveTrack={setActiveTrack}
            user={user}
          />
        )

      case 'track-scenarios':
        return (
          <TrackScenariosScreen
            track={activeTrack}
            setScreen={setScreen}
            onStartScenario={startScenario}
            onViewBriefing={(scenario) => openBriefing(scenario)}
            completedScenarios={completedScenarios}
            currentSession={currentSession}
            user={user}
          />
        )

      default:
        return null
    }
  }

  return (
    <>
      <Head>
        <title>Fable — Practice the conversations that matter</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <div style={{
        maxWidth: 420, margin: '0 auto', minHeight: '100dvh',
        background: C.bg, position: 'relative',
      }}>
        <div style={{ minHeight: '100dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {renderScreen()}
        </div>
        {showNav && <BottomNav active={activeTab} onChange={goTab} />}
      </div>
    </>
  )
}
