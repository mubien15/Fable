import Head from 'next/head'
import { useState, useEffect, useRef, useCallback } from 'react'

// ═══════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════
const C = {
  bg: '#FFFBF5', surface: '#FFFFFF', border: '#EDE8E0',
  coral: '#FF6B3D', coralLight: '#FF8C66', coralDim: '#FFD4C5', coralBg: '#FFF0EB',
  blue: '#3B82C4', blueDim: '#C5DCF0', blueBg: '#EEF6FF',
  teal: '#2BA084', tealBg: '#E8F7F4',
  ink: '#1A1512', inkMid: '#4A4340', inkSoft: '#8A837C', inkFaint: '#C4BDB6',
}
const SERIF = "'Lora', Georgia, serif"
const SANS = 'system-ui, -apple-system, sans-serif'

// ═══════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════
const CHALLENGES = [
  { id: 'difficult', label: 'Having difficult conversations' },
  { id: 'feelings',  label: 'Expressing my feelings clearly' },
  { id: 'stories',   label: 'Telling compelling stories' },
  { id: 'connect',   label: 'Making deeper connections' },
  { id: 'confident', label: 'Being more confident speaking' },
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
// STORAGE HELPERS
// ═══════════════════════════════════════════════
const LS = {
  user:      'fable_user',
  sessions:  'fable_sessions',
  storylab:  'fable_storylab',
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
    blue:      { background: C.blue, color: '#fff' },
    secondary: { background: 'transparent', color: C.inkMid, border: `1.5px solid ${C.border}` },
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
    { id: 'home',      icon: '⌂',  label: 'Home'     },
    { id: 'coach',     icon: '◎',  label: 'Coach'    },
    { id: 'progress',  icon: '◈',  label: 'Progress' },
    { id: 'storylab',  icon: '✦',  label: 'Storylab' },
  ]
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 420,
      background: 'rgba(255,251,245,0.92)', backdropFilter: 'blur(12px)',
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
      <div style={{ marginBottom: 36, textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 14 }}>✦</div>
        <h1 style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 600, color: C.ink, margin: '0 0 10px' }}>
          Welcome to Fable
        </h1>
        <p style={{ color: C.inkSoft, fontSize: 15, lineHeight: 1.65 }}>
          Your personal coach for real-life conversations. Let's get to know you.
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
        Continue →
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
          What's your biggest challenge right now?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {CHALLENGES.map((c) => (
          <button
            key={c.id}
            onClick={() => setChoice(c.id)}
            style={{
              padding: '14px 18px', borderRadius: 14, textAlign: 'left',
              border: `1.5px solid ${choice === c.id ? C.coral : C.border}`,
              background: choice === c.id ? C.coralBg : C.surface,
              color: choice === c.id ? C.coral : C.inkMid,
              fontSize: 15, fontWeight: choice === c.id ? 600 : 400,
              transition: 'all .15s',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
      <Btn onClick={() => choice && onNext(choice)} disabled={!choice}>
        This is my focus →
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
        <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: C.ink, marginBottom: 8 }}>
          One last thing.
        </h1>
        <p style={{ color: C.inkSoft, fontSize: 15, lineHeight: 1.65 }}>
          Is there a specific moment coming up you want to prepare for?
          A hard conversation, an interview, something important?
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
        <Btn variant="ghost" onClick={onSkip}>Skip for now</Btn>
      </div>
      <PrivacyNote />
    </div>
  )
}

// ═══════════════════════════════════════════════
// HOME SCREEN
// ═══════════════════════════════════════════════
function HomeScreen({ user, sessions, storylab, setScreen, setScenario }) {
  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const challenge = CHALLENGES.find((c) => c.id === user.challenge)
  const currentMission = MISSIONS[Math.min((storylab.currentDay || 1) - 1, 29)]
  const completedCount = (storylab.completedDays || []).length

  const startCoach = (scenario) => {
    if (scenario) setScenario(scenario)
    setScreen('coach')
  }

  return (
    <div className="fade-up" style={{ padding: '28px 20px 110px' }}>
      {/* Greeting */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: C.inkSoft, fontSize: 13, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4, fontFamily: SANS }}>
          {greeting}
        </p>
        <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: C.ink, lineHeight: 1.2 }}>
          {user.name}
        </h1>
      </div>

      {/* Quick-start bar */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontFamily: SANS, color: C.inkSoft, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
          WHAT MOMENT ARE YOU PREPARING FOR?
        </p>
        <button
          onClick={() => startCoach(user.upcomingMoment || '')}
          style={{
            width: '100%', textAlign: 'left', padding: '14px 18px', borderRadius: 14,
            border: `1.5px solid ${C.border}`, background: C.surface,
            color: user.upcomingMoment ? C.inkMid : C.inkFaint,
            fontSize: 15, fontFamily: SERIF, fontStyle: user.upcomingMoment ? 'normal' : 'italic',
            lineHeight: 1.5,
          }}
        >
          {user.upcomingMoment
            ? user.upcomingMoment.length > 80 ? user.upcomingMoment.slice(0, 80) + '…' : user.upcomingMoment
            : 'Tap to describe your situation…'}
        </button>
      </div>

      {/* Mode cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { icon: '🎯', label: 'Prepare',  bg: C.coralBg, color: C.coral, scenario: 'Prepare for an important situation' },
          { icon: '💬', label: 'Express',  bg: C.blueBg,  color: C.blue,  scenario: 'Express how I feel about something' },
          { icon: '🌿', label: 'Reflect',  bg: C.tealBg,  color: C.teal,  scenario: 'Reflect on something that happened' },
        ].map((m) => (
          <button
            key={m.label}
            onClick={() => startCoach(m.scenario)}
            style={{
              background: m.bg, border: 'none', borderRadius: 14, padding: '16px 10px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              color: m.color,
            }}
          >
            <span style={{ fontSize: 22 }}>{m.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: SANS }}>{m.label.toUpperCase()}</span>
          </button>
        ))}
      </div>

      {/* Your focus card */}
      {challenge && (
        <Card bg={C.blueBg} border={C.blueDim} style={{ marginBottom: 16 }}>
          <p style={{ fontFamily: SANS, color: C.blue, fontSize: 11, fontWeight: 700, letterSpacing: '.07em', marginBottom: 5 }}>
            YOUR FOCUS
          </p>
          <p style={{ fontFamily: SERIF, color: C.ink, fontSize: 15 }}>{challenge.label}</p>
        </Card>
      )}

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontFamily: SANS, color: C.inkSoft, fontSize: 11, fontWeight: 700, letterSpacing: '.07em', marginBottom: 12 }}>
            RECENT SESSIONS
          </p>
          {sessions.slice(-3).reverse().map((s) => {
            const chip = SCENARIO_CHIPS.find((c) => c.id === s.scenario) || { icon: '💬', label: s.scenario }
            return (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
                borderBottom: `1px solid ${C.border}`,
              }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{chip.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: SANS, color: C.ink, fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{chip.label}</p>
                  {s.feedback?.coachNote && (
                    <p style={{ fontFamily: SERIF, color: C.inkSoft, fontSize: 13, fontStyle: 'italic', lineHeight: 1.4,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.feedback.coachNote}
                    </p>
                  )}
                </div>
                <button onClick={() => setScreen('coach')} style={{
                  background: 'none', border: 'none', color: C.coral, fontSize: 13, fontWeight: 700, fontFamily: SANS, flexShrink: 0,
                }}>Resume →</button>
              </div>
            )
          })}
        </div>
      )}

      {/* Storylab strip */}
      <Card style={{ background: C.surface }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 16 }}>✦</span>
          <div>
            <p style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: C.inkSoft, letterSpacing: '.07em' }}>
              STORYLAB · DAY {storylab.currentDay || 1}
            </p>
            <p style={{ fontFamily: SERIF, fontSize: 15, color: C.ink }}>{currentMission.title}</p>
          </div>
        </div>
        <div style={{ height: 4, background: C.border, borderRadius: 4, marginBottom: 14, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(completedCount / 30) * 100}%`, background: C.coral, borderRadius: 4, transition: 'width .4s' }} />
        </div>
        <Btn onClick={() => setScreen('storylab')} style={{ padding: '11px 20px', fontSize: 14 }}>
          Continue →
        </Btn>
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════
// COACH / PREPARE SCREEN
// ═══════════════════════════════════════════════
function CoachScreen({ user, initialScenario, setScreen, onStartSession }) {
  const [chip, setChip] = useState(SCENARIO_CHIPS[0].id)
  const [context, setContext] = useState(initialScenario || user.upcomingMoment || '')

  const start = () => {
    if (context.trim().length < 10) return
    onStartSession({ scenario: chip, context: context.trim() })
    setScreen('practice')
  }

  return (
    <div className="fade-up" style={{ padding: '28px 20px 120px' }}>
      <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: C.ink, marginBottom: 6 }}>Your coach</h1>
      <p style={{ color: C.inkSoft, fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>
        Describe the situation and what you want to say. Your coach will listen and give you real feedback.
      </p>

      {/* Scenario chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {SCENARIO_CHIPS.map((s) => (
          <button
            key={s.id}
            onClick={() => setChip(s.id)}
            style={{
              padding: '8px 14px', borderRadius: 30, border: `1.5px solid ${chip === s.id ? C.coral : C.border}`,
              background: chip === s.id ? C.coralBg : C.surface,
              color: chip === s.id ? C.coral : C.inkMid,
              fontSize: 14, fontWeight: chip === s.id ? 700 : 400, fontFamily: SANS,
              transition: 'all .15s',
            }}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Situation textarea */}
      <label style={{ display: 'block', fontFamily: SANS, color: C.inkMid, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        Describe your situation
      </label>
      <VoiceTextarea
        value={context}
        onChange={setContext}
        placeholder="Who's involved? What happened? What do you want to achieve?"
        minHeight={160}
      />
      <p style={{ fontFamily: SANS, color: C.inkFaint, fontSize: 12, marginTop: 6, marginBottom: 24 }}>
        {context.length} characters
      </p>

      <Btn onClick={start} disabled={context.trim().length < 10}>
        Start my session →
      </Btn>

      {/* Focus reminder */}
      {user.challenge && (
        <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 12, background: C.blueBg }}>
          <p style={{ fontFamily: SERIF, color: C.blue, fontSize: 13, fontStyle: 'italic' }}>
            Focus: {CHALLENGES.find((c) => c.id === user.challenge)?.label}
          </p>
        </div>
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
            userChallenge: CHALLENGES.find((c) => c.id === user?.challenge)?.label,
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
function SimulationScreen({ session, setScreen, setSessions, sessions }) {
  const [messages, setMessages] = useState([
    { role: 'coach', content: "Now let's make it real. I'll play the other person. Respond naturally." },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [turn, setTurn] = useState(0)
  const [done, setDone] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const scrollDown = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)

  const send = async () => {
    const text = input.trim()
    if (!text || loading || done) return

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
          scenario: session?.context,
          userMessage: text,
          sessionHistory: history.slice(0, -1),
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
        toAdd.push({ role: 'coach', content: parts[1].replace(':', '').trim() })
        setDone(true)
      } else if (newTurn >= 4) {
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

  const finish = () => {
    const newSession = {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      scenario: session?.scenario,
      context: session?.context,
      userMessage: session?.userMessage,
      feedback: session?.feedback,
      completed: true,
    }
    const updated = [...sessions, newSession]
    setSessions(updated)
    lsSet(LS.sessions, updated)
    setScreen('home')
  }

  const bgFor = (role) => {
    if (role === 'user') return C.coral
    if (role === 'coach') return C.coralBg
    return C.surface
  }
  const colorFor = (role) => (role === 'user' ? '#fff' : C.ink)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: C.bg }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', gap: 12,
        background: C.surface,
      }}>
        <button onClick={() => setScreen('feedback')} style={{ background: 'none', border: 'none', color: C.inkSoft, fontSize: 20 }}>←</button>
        <CoachAvatar size={32} />
        <div>
          <p style={{ fontFamily: SANS, fontWeight: 700, color: C.ink, fontSize: 14 }}>Role-play</p>
          <p style={{ fontFamily: SANS, color: C.inkSoft, fontSize: 12 }}>
            {SCENARIO_CHIPS.find((c) => c.id === session?.scenario)?.label || 'Practice conversation'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
            alignItems: 'flex-end', gap: 8,
          }}>
            {m.role !== 'user' && m.role === 'coach' && <CoachAvatar size={26} />}
            <div style={{
              maxWidth: '76%', padding: '12px 16px', borderRadius: 16,
              background: bgFor(m.role), color: colorFor(m.role),
              fontSize: 15, lineHeight: 1.6,
              fontFamily: SERIF,
              fontStyle: m.role === 'coach' ? 'italic' : 'normal',
              border: m.role === 'other' ? `1px solid ${C.border}` : 'none',
              borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: C.border, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Dots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, background: C.surface }}>
        {done ? (
          <Btn onClick={finish}>Complete session ✓</Btn>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Type your response…"
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 12,
                border: `1.5px solid ${C.border}`, background: C.bg,
                fontSize: 15, color: C.ink, fontFamily: SERIF,
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              style={{
                background: !input.trim() || loading ? C.coralDim : C.coral,
                color: '#fff', border: 'none', borderRadius: 12,
                padding: '0 18px', fontSize: 18, fontWeight: 700,
              }}
            >→</button>
          </div>
        )}
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
      <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: C.ink, marginBottom: 24 }}>Your progress</h1>

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
          WHAT YOUR COACH REMEMBERS
        </p>
        {sessions.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: '28px 20px' }}>
            <p style={{ fontFamily: SERIF, color: C.inkSoft, fontSize: 15, fontStyle: 'italic' }}>
              No sessions yet. Your coach is ready when you are.
            </p>
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

      <Btn onClick={() => setScreen('coach')}>Start a new session →</Btn>
    </div>
  )
}

// ═══════════════════════════════════════════════
// STORYLAB SCREEN
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
// APP ROOT
// ═══════════════════════════════════════════════
export default function App() {
  const [screen,    setScreen]    = useState('loading')
  const [activeTab, setActiveTab] = useState('home')
  const [user,      setUser]      = useState(null)
  const [sessions,  setSessions]  = useState([])
  const [storylab,  setStorylab]  = useState({ currentDay: 1, completedDays: [] })

  // Onboarding state
  const [obName,    setObName]    = useState('')
  const [obChallenge, setObChallenge] = useState('')

  // Session state
  const [currentSession, setCurrentSession] = useState(null)
  // currentSession = { scenario, context, userMessage, feedback }

  // Load from localStorage on mount
  useEffect(() => {
    const savedUser = lsGet(LS.user, null)
    const savedSessions = lsGet(LS.sessions, [])
    const savedStorylab = lsGet(LS.storylab, { currentDay: 1, completedDays: [] })

    setSessions(savedSessions)
    setStorylab(savedStorylab)

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
    const u = { name: obName, challenge: obChallenge, upcomingMoment, onboarded: true }
    lsSet(LS.user, u)
    setUser(u)
    setScreen('home')
    setActiveTab('home')
  }

  // Start a session from coach screen
  const startSession = ({ scenario, context }) => {
    setCurrentSession({ scenario, context, userMessage: '', feedback: null })
  }

  // Receive feedback from practice screen
  const receiveFeedback = ({ feedback, userMessage }) => {
    setCurrentSession((prev) => ({ ...prev, userMessage, feedback }))
  }

  // Start a Storylab mission
  const startMission = (mission) => {
    setCurrentSession({ scenario: 'storylab', context: mission.prompt, userMessage: '', feedback: null })
    setActiveTab('coach')
    setScreen('practice')
  }

  const SUB_SCREENS = ['practice', 'feedback', 'simulation', 'share']
  const showNav = !['loading', 'onboard1', 'onboard2', 'onboard3', 'simulation'].includes(screen)

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
        return <Onboard2 name={obName} onNext={(c) => { setObChallenge(c); setScreen('onboard3') }} />

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
            storylab={storylab}
            setScreen={(s) => { setScreen(s); if (['coach','progress','storylab'].includes(s)) setActiveTab(s) }}
            setScenario={(scenario) => setCurrentSession((prev) => ({ ...prev, context: scenario }))}
          />
        )

      case 'coach':
        return (
          <CoachScreen
            user={user}
            initialScenario={currentSession?.context || ''}
            setScreen={setScreen}
            onStartSession={startSession}
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
          />
        )

      case 'share':
        return <ShareScreen session={currentSession} setScreen={setScreen} />

      case 'progress':
        return <ProgressScreen sessions={sessions} setScreen={setScreen} />

      case 'storylab':
        return (
          <StorylabScreen
            storylab={storylab}
            setStorylab={(sl) => { setStorylab(sl); lsSet(LS.storylab, sl) }}
            setScreen={setScreen}
            onStartMission={startMission}
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
