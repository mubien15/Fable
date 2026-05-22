import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── System prompts ────────────────────────────────────────────────────────

const COACHING_SYSTEM = `You are a warm, honest communication coach inside an app called Fable. The user has just written or spoken something they want to say in a real situation — a job interview, a difficult conversation with a friend, expressing feelings. Your job is to give them specific, human feedback like a smart friend who actually listened, not a teacher grading them.

Respond ONLY in valid JSON. No preamble. No markdown. Exactly this structure:
{
  "strengths": [
    { "label": "short label", "note": "one specific sentence about what worked and why — reference something they actually said" },
    { "label": "short label", "note": "one specific sentence about what worked and why" }
  ],
  "sharpen": {
    "label": "short label",
    "note": "one specific, actionable sentence — what to change and why it matters"
  },
  "rewrite": "A full rewrite of their message applying your suggestion. Match their voice. 2-4 sentences. Make it feel like them, but sharper.",
  "coachNote": "One sentence the coach wants them to carry into the simulation — what to watch for."
}

Rules:
- Always reference something specific the user actually said
- Never say 'great job' without saying exactly what was great
- Warm but honest tone — like a smart friend, not a teacher
- The rewrite must sound like the user's voice, not yours
- Keep all fields under 60 words each`

const simulationSystem = (scenario) =>
  `You are playing the role of the other person in this real-life scenario: "${scenario}".

The user is practising a genuine conversation. Respond naturally and realistically as that person would — be human, slightly imperfect, not a pushover but not hostile either.

Keep every response to 1–3 sentences. No coaching, no meta-commentary.

After the user's 4th message, end your reply with a new line starting exactly with:
[COACH]: one warm sentence observing what the user did well in this conversation.

Plain text only. No JSON.`

const PATTERN_SYSTEM = `You are a warm communication coach reviewing patterns across someone's recent practice sessions.

Given a few session insights, give ONE direct, specific observation about what you notice in their communication patterns. Under 40 words. Speak to them directly ("I notice you..." or "You tend to..."). Warm but honest. No list. One sentence or two short ones.

Plain text only.`

// ─── Fallback response when API fails ──────────────────────────────────────

const FALLBACK = {
  strengths: [
    { label: 'You showed up', note: 'Practising the conversation before it happens already puts you ahead of most people.' },
    { label: 'Clear intent', note: 'Your message has a clear purpose — that gives us a solid foundation to build on.' },
  ],
  sharpen: {
    label: 'Try again shortly',
    note: 'The coach is temporarily unavailable — give it a moment and resubmit. Your story deserves real feedback.',
  },
  rewrite: "Let's pick this back up in a moment. I want to give your words the attention they deserve.",
  coachNote: 'Connection hiccup. Keep going — showing up to practise is already the hard part.',
}

// ─── Handler ───────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { scenario, userMessage, sessionHistory, mode, insights } = req.body

  try {
    // ── Simulation: role-play as the other person ──
    if (mode === 'simulation') {
      const history = (sessionHistory || []).map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }))
      history.push({ role: 'user', content: userMessage })

      const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 200,
        system: simulationSystem(scenario),
        messages: history,
      })

      return res.json({ reply: response.content[0].text })
    }

    // ── Pattern: analyse sessions ──
    if (mode === 'pattern') {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 80,
        system: PATTERN_SYSTEM,
        messages: [
          {
            role: 'user',
            content: `Recent session insights:\n${(insights || []).join('\n')}`,
          },
        ],
      })

      return res.json({ pattern: response.content[0].text })
    }

    // ── Default: coaching feedback ──
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 600,
      system: COACHING_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Scenario: ${scenario}\n\nWhat the user wants to say:\n${userMessage}`,
        },
      ],
    })

    const raw = response.content[0].text.trim()
    const cleaned = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '')
    return res.json(JSON.parse(cleaned))
  } catch (error) {
    console.error('[coaching] API error:', error?.message || error)

    // Return friendly fallback so the UI never breaks
    if (mode === 'simulation') return res.json({ reply: "Let's pick this up again in a moment." })
    if (mode === 'pattern') return res.json({ pattern: 'Keep practising — patterns emerge over time.' })
    return res.status(200).json(FALLBACK)
  }
}
