// ─── mubienahsan.com — newsletter subscribe (double opt-in) ─────────────────
//
// Vercel serverless function. Deploy at /api/subscribe.
//
// Flow (CASL-compliant express consent):
//   1. Visitor submits email  ->  this endpoint
//   2. Brevo sends a confirmation email (double opt-in template)
//   3. Visitor clicks confirm ->  Brevo adds them to the list, then
//                                redirects to CONFIRM_REDIRECT_URL
//   4. The thank-you page + the Brevo welcome automation both hand over
//      the lead-magnet PDF.
//
// The contact is NOT added to the list until they confirm. That is the whole
// point of double opt-in: it is the consent record CASL expects, and it keeps
// the PDF away from typo'd and hostile addresses.
//
// Required environment variables (set in Vercel -> Settings -> Env Vars):
//   BREVO_API_KEY          v3 API key
//   BREVO_LIST_ID          numeric list id for THIS site (NOT 3 - that is Fable's)
//   BREVO_DOI_TEMPLATE_ID  numeric id of the double opt-in template in Brevo
//   CONFIRM_REDIRECT_URL   e.g. https://mubienahsan.com/thank-you.html
//   ALLOWED_ORIGINS        comma-separated, e.g. https://mubienahsan.com,https://www.mubienahsan.com

const BREVO_DOI_ENDPOINT = 'https://api.brevo.com/v3/contacts/doubleOptinConfirmation'

// Deliberately permissive but structural: catches empty/misshapen input without
// rejecting the many legitimately odd real-world addresses a stricter regex eats.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const parseOrigins = () =>
  (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

// Unlike the Fable endpoint (which is open to '*'), this one is pinned to the
// site's own origins. Nothing else needs to post to it.
function applyCors(req, res) {
  const allowed = parseOrigins()
  const origin = req.headers.origin
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  } else if (allowed.length === 0) {
    // No allowlist configured yet - fall back to same-origin only, which is
    // what a plain <script> on the site itself already gets.
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export default async function handler(req, res) {
  applyCors(req, res)

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body || {}
  const email = String(body.email || '').trim().toLowerCase()
  const source = String(body.source || 'unknown').slice(0, 40)

  // Honeypot: the widget renders a hidden field bots love to fill. Anything in
  // it means automation, so we return the success shape without doing work -
  // telling a bot it failed just invites a retry with the field cleared.
  if (body.website) return res.status(200).json({ success: true })

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ success: false, error: 'Please enter a valid email address.' })
  }

  const { BREVO_API_KEY, BREVO_LIST_ID, BREVO_DOI_TEMPLATE_ID, CONFIRM_REDIRECT_URL } = process.env

  if (!BREVO_API_KEY || !BREVO_LIST_ID || !BREVO_DOI_TEMPLATE_ID || !CONFIRM_REDIRECT_URL) {
    // Misconfiguration is ours, not the visitor's - log loudly, stay vague to them.
    console.error('subscribe: missing required environment variables')
    return res.status(500).json({ success: false, error: 'Signup is temporarily unavailable.' })
  }

  try {
    const response = await fetch(BREVO_DOI_ENDPOINT, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        email,
        includeListIds: [Number(BREVO_LIST_ID)],
        templateId: Number(BREVO_DOI_TEMPLATE_ID),
        redirectionUrl: CONFIRM_REDIRECT_URL,
        attributes: { SIGNUP_SOURCE: source },
        updateEnabled: true,
      }),
    })

    // 201/204 both mean "confirmation email on its way".
    if (response.status === 201 || response.status === 204) {
      return res.status(200).json({ success: true })
    }

    const data = await response.json().catch(() => ({}))

    // Already on the list. Say the same thing we say to everyone else: never
    // confirm or deny list membership to an anonymous caller.
    if (data.code === 'duplicate_parameter') {
      return res.status(200).json({ success: true })
    }

    console.error('subscribe: brevo rejected request', response.status, data)
    return res.status(400).json({ success: false, error: 'We could not sign you up. Please try again.' })
  } catch (err) {
    console.error('subscribe: request failed', err)
    return res.status(500).json({ success: false, error: 'Something went wrong. Please try again.' })
  }
}

function safeParse(raw) {
  try { return JSON.parse(raw) } catch { return {} }
}
