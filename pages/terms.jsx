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

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>Terms of Service — Fable</title>
        <meta name="description" content="Fable terms of service." />
      </Head>
      <div style={s.page}>
        <div style={s.inner}>
          <Link href="/" style={s.back}>← Back to Fable</Link>

          <div style={s.logo}>
            <span style={s.logoF}>F</span>.able
          </div>
          <p style={s.label}>Terms of Service</p>

          <h1 style={s.h1}>Terms of Service</h1>
          <p style={s.updated}>Last updated: June 23, 2026</p>

          <p style={s.p}>
            By using Fable ("the Service"), you agree to these terms. Please read them — they're short and written in plain English.
          </p>

          <hr style={s.divider} />

          <h2 style={s.h2}>What Fable is</h2>
          <p style={s.p}>
            Fable is an AI-powered communication practice tool. It simulates professional conversations and provides coaching feedback to help you prepare for real-world interactions. It is not a substitute for professional coaching, legal advice, HR guidance, or therapy.
          </p>

          <h2 style={s.h2}>Your account</h2>
          <ul style={s.ul}>
            <li style={s.li}>You must be 18 or older to use Fable.</li>
            <li style={s.li}>You are responsible for keeping your login credentials secure.</li>
            <li style={s.li}>One account per person. Do not share accounts.</li>
            <li style={s.li}>You may not use Fable for any unlawful purpose.</li>
          </ul>

          <h2 style={s.h2}>Subscriptions and billing</h2>
          <ul style={s.ul}>
            <li style={s.li}><strong>Free tier</strong> — access to 4 scenarios (one per track), no credit card required, no time limit.</li>
            <li style={s.li}><strong>Monthly ($19/mo)</strong> — billed monthly, cancel anytime. Access ends at the end of the billing period.</li>
            <li style={s.li}><strong>Annual founding ($99/yr)</strong> — available to the first 50 members only. Rate is locked for life as long as the subscription stays active. After 50 founding members, annual pricing moves to $199/yr.</li>
            <li style={s.li}>All payments are processed by Stripe. We do not store your card details.</li>
            <li style={s.li}>No refunds for partial billing periods, but you can cancel before your next renewal at any time.</li>
          </ul>

          <h2 style={s.h2}>Cancellation</h2>
          <p style={s.p}>
            You can cancel your subscription at any time from your account settings. Your access continues until the end of the current billing period. To cancel or request a refund outside of normal flow, email <a href="mailto:mubien.ahsan@gmail.com" style={s.email}>mubien.ahsan@gmail.com</a>.
          </p>

          <h2 style={s.h2}>Acceptable use</h2>
          <p style={s.p}>You agree not to:</p>
          <ul style={s.ul}>
            <li style={s.li}>Attempt to reverse-engineer, scrape, or abuse the AI system.</li>
            <li style={s.li}>Use the service to generate harmful, harassing, or illegal content.</li>
            <li style={s.li}>Resell or sublicense access to Fable.</li>
            <li style={s.li}>Circumvent usage limits through automated means.</li>
          </ul>

          <h2 style={s.h2}>No guarantees of outcomes</h2>
          <p style={s.p}>
            Fable helps you practice — it does not guarantee results. Conversations are simulated by AI and may not perfectly reflect how a real person would respond. The coaching feedback is meant to be useful, not definitive. Use your own judgment in real situations.
          </p>

          <h2 style={s.h2}>Intellectual property</h2>
          <p style={s.p}>
            Fable's scenarios, coaching prompts, and software are owned by Fable. Your conversation transcripts remain yours. We do not claim ownership over what you type or say in practice sessions.
          </p>

          <h2 style={s.h2}>Limitation of liability</h2>
          <p style={s.p}>
            Fable is provided "as is." We are not liable for any indirect, incidental, or consequential damages arising from your use of the service. Our total liability to you will not exceed the amount you paid us in the 12 months prior to the claim.
          </p>

          <h2 style={s.h2}>Changes to these terms</h2>
          <p style={s.p}>
            If we make material changes, we'll email you before they take effect. Continued use after that date constitutes acceptance.
          </p>

          <h2 style={s.h2}>Governing law</h2>
          <p style={s.p}>
            These terms are governed by the laws of Canada. Any disputes will be resolved in the courts of Canada.
          </p>

          <h2 style={s.h2}>Contact</h2>
          <p style={s.p}>
            Questions? Email <a href="mailto:mubien.ahsan@gmail.com" style={s.email}>mubien.ahsan@gmail.com</a>.
          </p>

          <hr style={s.divider} />
          <p style={{ ...s.p, fontSize: 13 }}>
            <Link href="/privacy" style={s.email}>Privacy Policy</Link>
            {' · '}
            <Link href="/" style={{ color: C.inkFaint, textDecoration: 'none' }}>Back to Fable</Link>
          </p>
        </div>
      </div>
    </>
  )
}
