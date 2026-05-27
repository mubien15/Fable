import Head from 'next/head'
import { useState, useEffect, useRef, useCallback } from 'react'
import { ALL_TRACKS } from '../data/tracks'
import { DAILY_REP_PROGRAM } from '../data/daily-rep'

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
const SERIF = "'Lora', Georgia, serif"
const SANS = "'DM Sans', system-ui, -apple-system, sans-serif"

// ═══════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════
const ROLES = [
  { id: 'auditor',    label: 'Auditor / GRC / Compliance',    icon: '🔍', recommended_track: 'audit',      description: 'Practise delivering findings, managing examiners, and holding your position.' },
  { id: 'consultant', label: 'Consultant / Advisory',          icon: '💼', recommended_track: 'consulting', description: 'Practise client conversations, pitches, and the moments that make or break an engagement.' },
  { id: 'manager',    label: 'People Manager / Team Lead',     icon: '🤝', recommended_track: 'leadership', description: 'Practise feedback, underperformance, and the conversations most managers avoid until it\'s too late.' },
  { id: 'all',        label: 'All of the above / Other',       icon: '⊞', recommended_track: null,         description: 'You wear a lot of hats. We\'ve got scenarios for all of them.' },
]

const SCENARIO_CHIPS = [
  { id: 'interview',  label: 'Job Interview', icon: '💼' },
  { id: 'friend',     label: 'Difficult Friend', icon: '🤝' },
  { id: 'feelings',   label: 'Express Feelings', icon: '💛' },
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
  user:      'fable_user',
  sessions:  'fable_sessions',
  storylab:  'fable_storylab',  // kept for migration awareness
  dailyRep:  'fable_daily_rep',
  completed: 'completedScenarios',
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
      🔒 Your sessions are private. We never share your conversations.
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

function VoiceTextarea({ value, onChange, placeholder, minHeight = 140 }) {
  const [listening, setListening] = useState(false)
  const recRef  = useRef(null)
  const finalRef = useRef('')

  useEffect(() => () => recRef.current?.stop(), [])

  const toggle = () => {
    if (listening) {
      recRef.current?.stop()
      setListening(false)
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Voice input requires Chrome or Safari 17+.'); return }

    const r = new SR()
    r.continuous = true
    r.interimResults = true
    r.lang = 'en-US'
    finalRef.current = value

    r.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalRef.current += e.results[i][0].transcript + ' '
        else interim += e.results[i][0].transcript
      }
      onChange(finalRef.current + interim)
    }
    r.onerror = () => setListening(false)
    r.start()
    recRef.current = r
    setListening(true)
  }

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', minHeight, resize: 'none', padding: '14px 52px 14px 16px',
          background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 14,
          color: C.ink, fontSize: 16, lineHeight: 1.7, fontFamily: SERIF,
          transition: 'border-color .15s',
        }}
        onFocus={(e) => (e.target.style.borderColor = C.coral)}
        onBlur={(e)  => (e.target.style.borderColor = C.border)}
      />
      <button
        onClick={toggle}
        className={listening ? 'record-btn' : ''}
        style={{
          position: 'absolute', bottom: 12, right: 12, width: 36, height: 36,
          borderRadius: '50%', border: 'none',
          background: listening ? C.coral : C.border,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: listening ? 'recordPulse 1.5s ease-in-out infinite' : 'none',
          transition: 'background .2s',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke={listening ? '#fff' : C.inkSoft} strokeWidth="2" strokeLinecap="round">
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
          <path d="M19 10v2a7 7 0 01-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </button>
      {listening && (
        <div style={{
          position: 'absolute', top: 10, left: 12,
          display: 'flex', alignItems: 'center', gap: 5,
          background: C.coralBg, padding: '3px 9px', borderRadius: 20,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.coral, animation: 'pulse 1s infinite' }} />
          <span style={{ color: C.coral, fontSize: 11, fontWeight: 700, fontFamily: SANS }}>Listening</span>
        </div>
      )}
    </div>
  )
}

function BottomNav({ active, onChange }) {
  const tabs = [
    { id: 'home',      icon: '⌂',  label: 'Home'      },
    { id: 'scenarios', icon: '⊞',  label: 'Scenarios' },
    { id: 'coach',     icon: '◎',  label: 'Coach'     },
    { id: 'progress',  icon: '◈',  label: 'Progress'  },
  ]
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 420,
      background: 'rgba(250,247,242,0.92)', backdropFilter: 'blur(12px)',
      borderTop: `1px solid ${C.border}`,
      display: 'flex', zIndex: 200,
      paddingBottom: 'max(12px, env(safe-area-inset-bottom))', paddingTop: 8,
    }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            background: 'none', border: 'none', padding: '4px 0', position: 'relative',
          }}
        >
          {active === t.id && (
            <div style={{
              position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
              width: 22, height: 2.5, borderRadius: 2, background: C.coral,
            }} />
          )}
          <span style={{ fontSize: 18, lineHeight: 1, color: active === t.id ? C.coral : C.inkFaint }}>
            {t.icon}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '.05em', fontFamily: SANS,
            color: active === t.id ? C.coral : C.inkFaint,
          }}>
            {t.label.toUpperCase()}
          </span>
        </button>
      ))}
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
          Fable helps professionals in regulated industries practise the high-stakes conversations that define careers — before they have to have them for real.
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
        Start practising →
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
          Who do you show up as at work? We'll personalise your practice to the conversations that matter most in your world.
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
            <span style={{ fontSize: 20, marginTop: 2, flexShrink: 0 }}>{r.icon}</span>
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
const TRACK_BG = { audit: C.trackAudit, consulting: C.trackConsulting, leadership: C.trackLeadership }

function HomeScreen({ user, sessions, dailyRep, setScreen, onResumeSession, setActiveTrack, onStartDay }) {
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
    <div className="fade-up" style={{ padding: '36px 20px 110px' }}>

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
          What conversation will you practise today?
        </p>
      </div>

      {/* ── Daily Practice ── */}
      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Daily Practice</SectionLabel>
        {completedCount === 0 && (
          <div style={{ background: C.ink, borderRadius: 16, padding: '16px 20px', marginBottom: 12 }}>
            <p style={{ fontFamily: SERIF, color: '#F8FAFC', fontSize: 14, lineHeight: 1.7, fontStyle: 'italic' }}>
              "30 days. 30 real conversations. Identify the habits holding you back."
            </p>
          </div>
        )}
        <Card style={{ background: C.surface }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: `linear-gradient(135deg, ${C.coral}, ${C.coralLight})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>🎯</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                <p style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: C.inkFaint, letterSpacing: '.07em', textTransform: 'uppercase' }}>
                  DAILY REP · DAY {dailyRep.currentDay || 1} · {currentDayData?.phase_label?.toUpperCase()}
                </p>
                {streak > 0 && (
                  <span style={{ fontFamily: SANS, fontSize: 10, color: C.coral, background: C.coralBg, padding: '1px 7px', borderRadius: 20, fontWeight: 700 }}>
                    🔥 {streak} streak
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
            <span style={{ fontSize: 22, marginTop: 2, flexShrink: 0 }}>{track.icon}</span>
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
            const chip = trackMatch
              ? { icon: trackMatch.track.icon, label: trackMatch.scenario.title }
              : SCENARIO_CHIPS.find((c) => c.id === s.scenario) || { icon: '💬', label: s.scenario || 'Session' }
            return (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 0', borderBottom: `1px solid ${C.border}`,
              }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{chip.icon}</span>
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
  { id: 'work',          icon: '💼', label: 'Work & Career'    },
  { id: 'relationships', icon: '🤝', label: 'Relationships'    },
  { id: 'family',        icon: '👨‍👩‍👧', label: 'Family'          },
  { id: 'clarity',       icon: '🧠', label: 'Personal Clarity' },
]
const AREA_META = { work: '💼', relationships: '🤝', family: '👨‍👩‍👧', clarity: '🧠', thinking: '💭' }

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
        <span style={{ fontSize: 26 }}>{icon}</span>
        <p style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 600, color: C.blue, lineHeight: 1.2 }}>{title}</p>
      </div>
      <p style={{ fontFamily: SANS, fontSize: 14, color: C.inkMid, lineHeight: 1.65, marginBottom: 20 }}>{desc}</p>
      <Btn onClick={() => onStartMode(mode)} style={{ borderRadius: 50 }}>{btnLabel}</Btn>
    </div>
  )

  return (
    <div className="fade-up" style={{ padding: '36px 20px 110px' }}>
      <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 700, color: C.ink, marginBottom: 6, lineHeight: 1.3 }}>
        Not every hard conversation fits a scenario.
      </h1>
      <p style={{ fontFamily: SANS, fontSize: 15, color: C.inkMid, marginBottom: 28, lineHeight: 1.55 }}>
        Use the coach for anything on your mind — work, people, decisions, or just thinking out loud.
      </p>

      <ModeCard
        icon="🎯"
        title="I have a situation to work through"
        desc="A conversation coming up, a decision you're stuck on, or something you need to prepare for. Walk through it with your coach."
        btnLabel="Let's work on it →"
        mode="specific"
      />
      <ModeCard
        icon="💭"
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
              <span style={{ fontSize: 18, flexShrink: 0 }}>{s.lifeAreaIcon || '💭'}</span>
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
    <div className="fade-up" style={{ padding: '36px 20px 110px' }}>
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
            <span style={{ fontSize: 30, display: 'block', marginBottom: 10 }}>{area.icon}</span>
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
    <div className="fade-up" style={{ padding: '36px 20px 110px' }}>
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
    <div className="fade-up" style={{ padding: '36px 20px 110px' }}>
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
  const [listening, setListening] = useState(false)
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)
  const recRef     = useRef(null)
  const finalRef   = useRef('')
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

  const toggleMic = () => {
    if (listening) { recRef.current?.stop(); setListening(false); return }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Voice input requires Chrome or Safari 17+.'); return }
    const r = new SR()
    r.continuous = true; r.interimResults = true; r.lang = 'en-US'
    finalRef.current = input
    r.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalRef.current += e.results[i][0].transcript + ' '
        else interim += e.results[i][0].transcript
      }
      setInput(finalRef.current + interim)
    }
    r.onerror = () => setListening(false)
    r.onend   = () => setListening(false)
    r.start(); recRef.current = r; setListening(true)
  }
  const stopMic = () => { if (listening) { recRef.current?.stop(); setListening(false) } }

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    stopMic()

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

  const areaIcon  = AREA_META[coachSession?.lifeArea || 'thinking'] || '💭'
  const areaLabel = coachSession?.situationLabel || (coachSession?.mode === 'thinking' ? 'Thinking out loud' : 'Personal session')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: C.bg }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, background: C.surface, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => setScreen('coach')} style={{ background: 'none', border: 'none', color: C.inkSoft, fontSize: 20 }}>←</button>
        <CoachAvatar size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: SANS, fontWeight: 700, color: C.ink, fontSize: 14 }}>Coach</p>
          <p style={{ fontFamily: SANS, color: C.inkSoft, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {areaIcon} {areaLabel}
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
              placeholder={listening ? 'Listening…' : 'Reply…'}
              style={{
                width: '100%', padding: '12px 46px 12px 16px', borderRadius: 12,
                border: `1.5px solid ${listening ? C.blue : C.border}`,
                background: listening ? C.blueBg : C.bg,
                fontSize: 15, color: C.ink, fontFamily: SERIF,
                transition: 'border-color .15s, background .15s',
              }}
            />
            <button onClick={toggleMic} style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              width: 30, height: 30, borderRadius: '50%', border: 'none',
              background: listening ? C.blue : C.border,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: listening ? 'recordPulse 1.5s ease-in-out infinite' : 'none',
              transition: 'background .2s',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke={listening ? '#fff' : C.inkSoft} strokeWidth="2" strokeLinecap="round">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                <path d="M19 10v2a7 7 0 01-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
          </div>
          <button onClick={send} disabled={!input.trim() || loading} style={{
            background: !input.trim() || loading ? C.blueDim : C.blue,
            color: '#fff', border: 'none', borderRadius: 12,
            padding: '0 18px', fontSize: 18, fontWeight: 700, height: 46, flexShrink: 0,
          }}>→</button>
        </div>
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
      lifeAreaIcon: AREA_META[coachSession?.lifeArea] || '💭',
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
    <div className="fade-up" style={{ padding: '36px 20px 110px' }}>
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
              📝 ONE THING THAT STOOD OUT
            </p>
            <p style={{ fontFamily: SERIF, color: C.ink, fontSize: 15, lineHeight: 1.65 }}>{debrief?.insight}</p>
          </Card>

          <Card bg={C.tealBg} border="transparent" style={{ marginBottom: 24 }}>
            <p style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: C.teal, letterSpacing: '.06em', marginBottom: 8 }}>
              💡 SOMETHING TO CARRY FORWARD
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

  const chip = SCENARIO_CHIPS.find((c) => c.id === session?.scenario)

  const submit = async () => {
    if (text.trim().length < 10 || loading) return
    setLoading(true)
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
      alert('Something went wrong — try again.')
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
            YOUR SCENARIO {chip ? `· ${chip.icon} ${chip.label}` : ''}
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
    <div className="fade-up" style={{ padding: '28px 20px 110px' }}>
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
function SimulationScreen({ session, setScreen, setSessions, sessions, onSaveMessages, onEnd }) {
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
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const recRef = useRef(null)
  const finalRef = useRef('')

  const toggleMic = () => {
    if (listening) {
      recRef.current?.stop()
      setListening(false)
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Voice input requires Chrome or Safari 17+.'); return }
    const r = new SR()
    r.continuous = true
    r.interimResults = true
    r.lang = 'en-US'
    finalRef.current = input
    r.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalRef.current += e.results[i][0].transcript + ' '
        else interim += e.results[i][0].transcript
      }
      setInput(finalRef.current + interim)
    }
    r.onerror = () => setListening(false)
    r.onend = () => setListening(false)
    r.start()
    recRef.current = r
    setListening(true)
  }

  // Stop mic when message is sent
  const stopMic = () => {
    if (listening) { recRef.current?.stop(); setListening(false) }
  }

  const scrollDown = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)

  const send = async () => {
    const text = input.trim()
    if (!text || loading || done) return
    stopMic()

    const userMsg = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)
    scrollDown()

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

      const toAdd = [{ role: 'other', content: parts[0].trim() }]
      if (parts[1]) {
        // AI decided to end — show coach note and mark done
        toAdd.push({ role: 'coach', content: parts[1].replace(':', '').trim() })
        setDone(true)
      } else if (newTurn >= 10) {
        // Hard safety cap — end without coach note after 10 turns
        setDone(true)
      }

      setMessages((prev) => [...prev, ...toAdd])
    } catch {
      setMessages((prev) => [...prev, { role: 'other', content: "Let's pick this up in a moment." }])
    } finally {
      setLoading(false)
      scrollDown()
      inputRef.current?.focus()
    }
  }

  const handleEnd = (msgs = messages) => {
    const newSession = {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      scenario: session?.scenario,
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
            setScreen(session?.scenarioData ? 'track-scenarios' : 'feedback')
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
                fontSize: 16, flexShrink: 0, width: 26, height: 26,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>💡</div>
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
      <div style={{ borderTop: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
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
              {hintLoading ? 'Getting hint…' : '💡 Not sure what to say? Get a hint'}
            </button>
          </div>
        )}
        <div style={{ padding: '8px 16px 12px' }}>
        {done ? (
          <Btn onClick={() => handleEnd()}>Complete session ✓</Btn>
        ) : (
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
  const [copied, setCopied] = useState(false)
  const rewrite = session?.feedback?.rewrite || ''

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(rewrite)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      alert('Copy not supported — select and copy manually.')
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
        <Btn variant="secondary" onClick={() => setScreen('feedback')}>← Back to coaching</Btn>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// PROGRESS SCREEN
// ═══════════════════════════════════════════════
function ProgressScreen({ sessions, setScreen }) {
  const [pattern, setPattern] = useState('')
  const [loadingPattern, setLoadingPattern] = useState(false)
  const scenarios = new Set(sessions.map((s) => s.scenario)).size
  const days = new Set(sessions.map((s) => s.date)).size

  useEffect(() => {
    if (sessions.length < 3 || pattern) return
    setLoadingPattern(true)
    const insights = sessions.slice(-3).map((s) => s.feedback?.coachNote).filter(Boolean)
    if (insights.length < 2) { setLoadingPattern(false); return }

    fetch('/api/coaching', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'pattern', insights }),
    })
      .then((r) => r.json())
      .then((d) => setPattern(d.pattern || ''))
      .catch(() => {})
      .finally(() => setLoadingPattern(false))
  }, [])

  return (
    <div className="fade-up" style={{ padding: '28px 20px 110px' }}>
      <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Your progress</h1>
      <p style={{ fontFamily: SANS, fontSize: 14, color: C.inkMid, marginBottom: 24, lineHeight: 1.55 }}>
        Every session, every rep, every reflection — tracked here.
      </p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Sessions', val: sessions.length },
          { label: 'Scenarios', val: scenarios },
          { label: 'Days active', val: days },
        ].map((s) => (
          <Card key={s.label} style={{ textAlign: 'center', padding: '16px 10px' }}>
            <p style={{ fontFamily: SERIF, color: C.coral, fontSize: 28, fontWeight: 600, marginBottom: 4, lineHeight: 1 }}>
              {s.val}
            </p>
            <p style={{ fontFamily: SANS, color: C.inkSoft, fontSize: 10, fontWeight: 700, letterSpacing: '.07em' }}>
              {s.label.toUpperCase()}
            </p>
          </Card>
        ))}
      </div>

      {/* Pattern observation */}
      {(pattern || loadingPattern) && (
        <Card bg={C.coralBg} border={C.coralDim} style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <CoachAvatar size={32} />
            <div>
              <p style={{ fontFamily: SANS, color: C.coral, fontSize: 11, fontWeight: 700, letterSpacing: '.06em', marginBottom: 6 }}>
                YOUR COACH NOTICES
              </p>
              {loadingPattern ? (
                <Dots />
              ) : (
                <p style={{ fontFamily: SERIF, color: C.ink, fontSize: 15, lineHeight: 1.65, fontStyle: 'italic' }}>
                  {pattern}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Session history */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontFamily: SANS, color: C.inkSoft, fontSize: 11, fontWeight: 700, letterSpacing: '.07em', marginBottom: 14 }}>
          ALL SESSIONS
        </p>
        {sessions.length === 0 ? (
          <Card style={{ padding: '28px 20px' }}>
            <p style={{ fontFamily: SERIF, color: C.ink, fontSize: 17, fontWeight: 600, marginBottom: 8, lineHeight: 1.35 }}>
              Your practice history starts here.
            </p>
            <p style={{ fontFamily: SERIF, color: C.inkSoft, fontSize: 14, lineHeight: 1.65, marginBottom: 20 }}>
              Complete your first scenario and it will appear here — along with your feedback, scores, and reflections over time.
            </p>
            <Btn onClick={() => setScreen('scenarios')}>Go to Scenarios →</Btn>
          </Card>
        ) : (
          sessions.slice().reverse().map((s) => {
            const chip = SCENARIO_CHIPS.find((c) => c.id === s.scenario) || { icon: '💬', label: s.scenario || 'Session' }
            return (
              <div key={s.id} style={{
                display: 'flex', gap: 12, padding: '14px 0', borderBottom: `1px solid ${C.border}`,
                alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{chip.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <p style={{ fontFamily: SANS, color: C.ink, fontSize: 14, fontWeight: 700 }}>{chip.label}</p>
                    <p style={{ fontFamily: SANS, color: C.inkFaint, fontSize: 12 }}>{s.date}</p>
                  </div>
                  {s.feedback?.coachNote && (
                    <p style={{ fontFamily: SERIF, color: C.inkSoft, fontSize: 13, fontStyle: 'italic', lineHeight: 1.5 }}>
                      {s.feedback.coachNote}
                    </p>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {sessions.length > 0 && <Btn onClick={() => setScreen('scenarios')}>Find your next scenario →</Btn>}
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
    <div className="fade-up" style={{ padding: '36px 20px 110px' }}>

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
              What you'll practise
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
    <div className="fade-up" style={{ padding: '36px 20px 110px' }}>
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
        <Btn onClick={save} disabled={!reflection.trim()}>
          Save reflection →
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
    <div className="fade-up" style={{ padding: '28px 20px 110px' }}>

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
                        <p style={{ fontFamily: SANS, color: C.inkFaint, fontSize: 12 }}>🔒 Complete Day {d.day - 1} first</p>
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
    <div className="fade-up" style={{ padding: '28px 20px 110px' }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontFamily: SANS, color: C.inkSoft, fontSize: 11, fontWeight: 700, letterSpacing: '.07em', marginBottom: 6 }}>
          BUILT INTO FABLE
        </p>
        <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Storylab</h1>
        <p style={{ color: C.inkSoft, fontSize: 14, lineHeight: 1.6 }}>
          30 days of daily storytelling practise. Each session takes 10–15 minutes.
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
                  <p style={{ fontFamily: SANS, color: C.inkFaint, fontSize: 12 }}>🔒 Coming soon</p>
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
    <div className="fade-up" style={{ padding: '28px 20px 110px' }}>
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
            fontSize: 22, flexShrink: 0,
          }}>
            {track.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <p style={{ fontFamily: SANS, fontWeight: 700, color: C.ink, fontSize: 16 }}>
                {track.title}
              </p>
              {track.id === recommendedId && (
                <span style={{
                  fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: '.05em',
                  color: C.teal, background: C.tealBg, padding: '2px 8px', borderRadius: 20,
                }}>FOR YOU</span>
              )}
            </div>
            <p style={{ fontFamily: SERIF, color: C.inkSoft, fontSize: 14, lineHeight: 1.55, marginBottom: 10 }}>
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
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.coral; e.currentTarget.style.boxShadow = '0 2px 12px rgba(232,87,42,.1)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none' }}
      >
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: `linear-gradient(135deg, ${C.coral}, ${C.coralLight})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0,
        }}>🎯</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: SANS, fontWeight: 700, color: C.ink, fontSize: 16, marginBottom: 4 }}>Daily Rep</p>
          <p style={{ fontFamily: SERIF, color: C.inkSoft, fontSize: 14, lineHeight: 1.55, marginBottom: 10 }}>
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

function TrackScenariosScreen({ track, setScreen, onStartScenario, onViewBriefing, currentSession, completedScenarios = [] }) {
  const [selected, setSelected] = useState(null)

  if (!track) { setScreen('scenarios'); return null }

  const handleSelect = (scenario) => {
    setSelected(scenario === selected ? null : scenario)
  }

  return (
    <div className="fade-up" style={{ padding: '28px 20px 110px' }}>
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
                  {isResumable ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <Btn onClick={() => setScreen('simulation')}>
                        Resume conversation →
                      </Btn>
                      <Btn variant="secondary" onClick={() => onViewBriefing(scenario)}>
                        Start fresh
                      </Btn>
                    </div>
                  ) : (
                    <Btn onClick={() => onViewBriefing(scenario)}>
                      {isDone ? 'Practise again →' : 'Start scenario →'}
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

  if (!scenario) return null

  return (
    <div className="fade-up" style={{ padding: '28px 20px 110px' }}>
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

      <Btn onClick={() => onStart(scenario, difficulty)}>Start Simulation →</Btn>
    </div>
  )
}

// ═══════════════════════════════════════════════
// SCENARIO DEBRIEF SCREEN
// ═══════════════════════════════════════════════
function ScenarioDebriefScreen({ session, onBack, onTryAgain, onMarkComplete, completedScenarios = [] }) {
  const [debrief, setDebrief]       = useState(null)
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
        scenario: { title: scenario.title, coaching_focus: scenario.coaching_focus || [] },
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
          what_landed: 'You engaged with the scenario.',
          what_created_friction: 'Some responses could have been sharper.',
          try_this_instead: 'Focus on one specific improvement for your next attempt.',
          the_principle: 'Precision earns credibility.',
          focus_scores: focusScores,
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
    <div className="fade-up" style={{ padding: '28px 20px 110px' }}>
      {/* Header */}
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.inkSoft, fontSize: 20, marginBottom: 20, padding: 0 }}>←</button>
      <p style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: C.teal, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>
        Session complete ✓
      </p>
      <h1 style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 700, color: C.ink, marginBottom: 4, lineHeight: 1.25 }}>
        {scenario?.title || 'Debrief'}
      </h1>

      {loading ? (
        <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Dots />
          <p style={{ fontFamily: SANS, color: C.inkSoft, fontSize: 14 }}>Analysing your conversation…</p>
        </div>
      ) : debrief ? (
        <>
          {/* Rating */}
          <Stars rating={debrief.overall_rating} />
          <p style={{ fontFamily: SERIF, color: C.inkMid, fontSize: 15, lineHeight: 1.65, marginBottom: 20 }}>
            {debrief.overall_summary}
          </p>

          {/* Section cards */}
          <SectionCard label="What landed" content={debrief.what_landed} bg={C.tealBg} border="#A7F3D0" labelColor={C.teal} />
          <SectionCard label="What created friction" content={debrief.what_created_friction} bg={C.coralBg} border={C.coralDim} labelColor={C.coral} />
          <SectionCard label="Try this instead" content={debrief.try_this_instead} bg={C.blueBg} border={C.blueDim} labelColor={C.blue} />

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
              What's one thing you want to practise differently next time?
            </p>
            <VoiceTextarea
              value={reflection}
              onChange={setReflection}
              placeholder="Your own words…"
              minHeight={100}
            />
          </div>

          {/* Actions */}
          {saved ? (
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
              <Btn onClick={() => { onMarkComplete(scenario?.id, reflection); setSaved(true) }}>
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

  // Coach session state
  const [coachSession, setCoachSession] = useState(null)

  // Load from localStorage on mount
  useEffect(() => {
    const savedUser       = lsGet(LS.user, null)
    const savedSessions   = lsGet(LS.sessions, [])
    const savedStorylab   = lsGet(LS.storylab, { currentDay: 1, completedDays: [] })
    const savedDailyRep   = lsGet(LS.dailyRep, DAILY_REP_DEFAULTS)
    const savedCompleted  = lsGet(LS.completed, [])

    setSessions(savedSessions)
    setStorylab(savedStorylab)
    setDailyRep(savedDailyRep)
    setCompletedScenarios(savedCompleted)

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
    const u = { name: obName, role: obRole, upcomingMoment, onboarded: true }
    lsSet(LS.user, u)
    setUser(u)
    setScreen('home')
    setActiveTab('home')
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
  const startScenario = (scenarioData, difficulty) => {
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
    })
    if (isForDailyRep) setPendingDailyRepDay(null)
    setScreen('simulation')
  }

  // Open the briefing screen for a scenario
  const openBriefing = (scenario, initialDifficulty = null) => {
    setActiveBriefingScenario(scenario)
    setPendingBriefingDifficulty(initialDifficulty || scenario.difficulty_default || 'medium')
    setScreen('scenario-briefing')
  }

  // Mark a scenario as completed and save reflection
  const markScenarioComplete = (scenarioId, reflection) => {
    if (!scenarioId) return
    const updated = completedScenarios.includes(scenarioId)
      ? completedScenarios
      : [...completedScenarios, scenarioId]
    setCompletedScenarios(updated)
    lsSet(LS.completed, updated)
    // Optionally store reflection alongside sessions — already done via session record
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
  const showNav = !['loading', 'onboard1', 'onboard2', 'onboard3', 'simulation', 'coach-conversation', 'daily-rep-insight'].includes(screen)

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
          />
        )

      case 'scenario-briefing':
        return (
          <ScenarioBriefingScreen
            scenario={activeBriefingScenario}
            initialDifficulty={pendingBriefingDifficulty}
            onStart={(scenario, difficulty) => startScenario(scenario, difficulty)}
            onBack={() => setScreen('track-scenarios')}
          />
        )

      case 'scenario-debrief':
        return (
          <ScenarioDebriefScreen
            session={currentSession}
            completedScenarios={completedScenarios}
            onBack={() => setScreen('track-scenarios')}
            onTryAgain={(scenario, nextDiff) => openBriefing(scenario, nextDiff)}
            onMarkComplete={(scenarioId, reflection) => markScenarioComplete(scenarioId, reflection)}
          />
        )

      case 'share':
        return <ShareScreen session={currentSession} setScreen={setScreen} />

      case 'progress':
        return <ProgressScreen sessions={sessions} setScreen={setScreen} />

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
          />
        )

      default:
        return null
    }
  }

  return (
    <>
      <Head>
        <title>Fable — Your Communication Coach</title>
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
