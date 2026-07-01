import Head from 'next/head'
import Link from 'next/link'

const C = {
  bg: '#FAF7F2',
  surface: '#FFFFFF',
  border: '#E7DECF',
  ink: '#1C2B4A',
  inkSoft: '#8C7B6B',
  inkFaint: '#A89B8C',
  coral: '#E8644A',
  navy: '#1C2B4A',
}
const SANS = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
const SERIF = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

const s = {
  page:    { minHeight: '100dvh', background: C.bg, fontFamily: SANS, padding: '48px 24px 80px' },
  inner:   { maxWidth: 680, margin: '0 auto' },
  back:    { display: 'inline-flex', alignItems: 'center', gap: 6, color: C.inkSoft, fontSize: 13, textDecoration: 'none', marginBottom: 40 },
  logo:    { fontFamily: SERIF, fontSize: 28, fontWeight: 700, color: C.ink, marginBottom: 4 },
  logoF:   { color: C.coral },
  label:   { fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: C.coral, marginBottom: 32 },
  h1:      { fontFamily: SERIF, fontSize: 32, fontWeight: 700, color: C.ink, lineHeight: 1.2, marginBottom: 8 },
  updated: { fontFamily: SANS, fontSize: 13, color: C.inkFaint, marginBottom: 48 },
  h2:      { fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: C.ink, marginTop: 40, marginBottom: 12 },
  p:       { fontFamily: SANS, fontSize: 15, color: C.inkSoft, lineHeight: 1.75, marginBottom: 16 },
  ul:      { paddingLeft: 20, marginBottom: 16 },
  li:      { fontFamily: SANS, fontSize: 15, color: C.inkSoft, lineHeight: 1.75, marginBottom: 8 },
  divider: { border: 'none', borderTop: `1px solid ${C.border}`, margin: '40px 0' },
  email:   { color: C.coral, textDecoration: 'none' },
}

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>Privacy Policy — Fable</title>
        <meta name="description" content="How Fable handles your data." />
      </Head>
      <div style={s.page}>
        <div style={s.inner}>
          <Link href="/" style={s.back}>← Back to Fable</Link>

          <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 4 }}>
            <span style={{ fontFamily: SANS, fontSize: 28, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.03em', color: C.coral }}>F</span>
            <svg width="13" height="12" viewBox="0 0 24 22" style={{ display: 'block', margin: '0 0 2.5px -0.8px' }}>
              <rect x="2" y="2" width="20" height="14" rx="5" fill={C.coral} />
              <polygon points="5,15 4,21 11,15" fill={C.coral} />
            </svg>
            <span style={{ fontFamily: SANS, fontSize: 28, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.03em', color: C.navy, marginLeft: -0.6 }}>able</span>
          </div>
          <p style={s.label}>Privacy Policy</p>

          <h1 style={s.h1}>Your data, handled with care.</h1>
          <p style={s.updated}>Last updated: July 1, 2026</p>

          <p style={s.p}>
            Fable is built for professionals who practice sensitive conversations — performance reviews, audit findings, difficult client moments. We take data seriously. This policy explains exactly what we collect, how we use it, and what we never do with it.
          </p>

          <hr style={s.divider} />

          <h2 style={s.h2}>What we collect</h2>
          <ul style={s.ul}>
            <li style={s.li}><strong>Email address</strong> — when you create an account.</li>
            <li style={s.li}><strong>Conversation transcripts</strong> — the text of your practice sessions, used to generate AI coaching feedback.</li>
            <li style={s.li}><strong>Session metadata</strong> — timestamps, scenario type, difficulty level, and session ratings.</li>
            <li style={s.li}><strong>Usage data</strong> — pages visited, features used, session duration. Standard analytics to understand how the product is working.</li>
          </ul>

          <h2 style={s.h2}>What we never do</h2>
          <ul style={s.ul}>
            <li style={s.li}><strong>We do not sell your data.</strong> Ever. To anyone.</li>
            <li style={s.li}><strong>We do not use your conversations to train AI models.</strong> Your transcripts are processed by Anthropic's Claude API solely to generate your coaching feedback. Anthropic's API terms prohibit using API data for model training.</li>
            <li style={s.li}><strong>We do not share your data with third parties</strong> except the processors listed below, which are necessary to run the service.</li>
          </ul>

          <h2 style={s.h2}>Third-party processors</h2>
          <ul style={s.ul}>
            <li style={s.li}><strong>Anthropic</strong> — processes your conversation transcripts to generate AI coaching feedback. Data is transmitted securely and not retained beyond the session.</li>
            <li style={s.li}><strong>OpenAI</strong> — processes your voice audio when you use voice mode, to transcribe what you say and generate the counterpart's spoken replies. Audio is not retained beyond generating the response.</li>
            <li style={s.li}><strong>Vercel</strong> — hosts the Fable web application.</li>
            <li style={s.li}><strong>Supabase</strong> — stores your account data and session history, and sends account emails (like password resets).</li>
            <li style={s.li}><strong>Stripe</strong> — processes subscription payments. We never see or store your full card details.</li>
          </ul>

          <h2 style={s.h2}>Data retention</h2>
          <p style={s.p}>
            Your session data and transcripts are stored for as long as your account is active. You can request deletion of all your data at any time by emailing <a href="mailto:mubien.ahsan@gmail.com" style={s.email}>mubien.ahsan@gmail.com</a> — we'll action it within 7 days.
          </p>

          <h2 style={s.h2}>Security</h2>
          <p style={s.p}>
            All data is transmitted over HTTPS. Our AI API keys are never exposed to the browser — all AI calls route through our server-side API. We follow industry-standard security practices and update dependencies regularly.
          </p>

          <h2 style={s.h2}>Cookies</h2>
          <p style={s.p}>
            Fable uses minimal browser storage (localStorage) to remember your session and preferences. We use no advertising cookies or cross-site trackers.
          </p>

          <h2 style={s.h2}>Your rights</h2>
          <p style={s.p}>
            You have the right to access, correct, or delete your personal data at any time. To exercise any of these rights, contact us at <a href="mailto:mubien.ahsan@gmail.com" style={s.email}>mubien.ahsan@gmail.com</a>.
          </p>

          <h2 style={s.h2}>Changes to this policy</h2>
          <p style={s.p}>
            If we make material changes, we'll email registered users before the change takes effect. The "last updated" date at the top of this page always reflects the current version.
          </p>

          <h2 style={s.h2}>Contact</h2>
          <p style={s.p}>
            Questions about this policy? Email <a href="mailto:mubien.ahsan@gmail.com" style={s.email}>mubien.ahsan@gmail.com</a>.
          </p>

          <hr style={s.divider} />
          <p style={{ ...s.p, fontSize: 13 }}>
            <Link href="/terms" style={s.email}>Terms of Service</Link>
            {' · '}
            <Link href="/" style={{ color: C.inkFaint, textDecoration: 'none' }}>Back to Fable</Link>
          </p>
        </div>
      </div>
    </>
  )
}
