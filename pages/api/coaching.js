import Anthropic from '@anthropic-ai/sdk'
import { COACHING_FEEDBACK_SYSTEM, buildScenarioPrompt, PATTERN_SYSTEM } from '../../lib/coachPrompt'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Fallback when API fails ───────────────────────────────────────────────

const FALLBACK = {
  strengths: [
    { label: 'You showed up', note: 'Practising the conversation before it happens already puts you ahead of most people.' },
    { label: 'Clear intent',  note: 'Your message has a clear purpose — that gives us a solid foundation to work from.' },
  ],
  sharpen: {
    label: 'Try again shortly',
    note: 'The coach is temporarily unavailable — give it a moment and resubmit.',
  },
  rewrite: "Let's pick this back up in a moment. I want to give your words the attention they deserve.",
  coachNote: 'Connection hiccup. Keep going — showing up to practise is already the hard part.',
}

// ─── Handler ───────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    scenario,
    userMessage,
    sessionHistory,   // full conversation history array [{role, content}, ...]
    mode,
    insights,
    userName,
    userChallenge,
    difficulty = 'medium',
  } = req.body

  try {

    // ── Simulation: role-play as the counterpart ──────────────────────────
    if (mode === 'simulation') {
      // Rebuild the full history so the model has complete context
      const history = (sessionHistory || []).map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }))
      history.push({ role: 'user', content: userMessage })

      const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 300,
        system: buildScenarioPrompt(scenario, difficulty),
        messages: history,
      })

      return res.json({ reply: response.content[0].text })
    }

    // ── Pattern: analyse recent sessions ─────────────────────────────────
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

    // ── Default: coaching feedback (returns JSON for FeedbackScreen) ──────
    const contextLines = [
      userName        ? `User's name: ${userName}` : '',
      userChallenge   ? `Their communication focus: ${userChallenge}` : '',
      `Scenario: ${scenario}`,
      `\nWhat they want to say:\n${userMessage}`,
    ].filter(Boolean).join('\n')

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 900,
      system: COACHING_FEEDBACK_SYSTEM,
      messages: [{ role: 'user', content: contextLines }],
    })

    const raw     = response.content[0].text.trim()
    const cleaned = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '')
    return res.json(JSON.parse(cleaned))

  } catch (error) {
    console.error('[coaching] API error:', error?.message || error)

    if (mode === 'simulation') return res.json({ reply: "Let's pick this up again in a moment." })
    if (mode === 'pattern')    return res.json({ pattern: 'Keep practising — patterns emerge over time.' })
    return res.status(200).json(FALLBACK)
  }
}
