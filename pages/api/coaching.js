import Anthropic from '@anthropic-ai/sdk'
import { buildCoachingFeedbackSystem, buildScenarioPrompt, PATTERN_SYSTEM, buildCoachPrompt } from '../../lib/coachPrompt'

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
    sessionHistory,   // full conversation history [{role, content}, ...]
    mode,
    insights,
    userName,
    userRole = 'all', // auditor | consultant | manager | all
    difficulty = 'medium',
  } = req.body

  try {

    // ── Personal Coach conversation ───────────────────────────────────────
    if (mode === 'coach') {
      const { coachMode, lifeArea, guidedAnswers, userMessage, sessionHistory } = req.body

      const history = (sessionHistory || []).map((m) => ({
        role: m.role === 'coach' ? 'assistant' : 'user',
        content: m.content,
      }))
      history.push({ role: 'user', content: userMessage || 'Hello.' })

      const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 500,
        system: buildCoachPrompt(coachMode, lifeArea, guidedAnswers),
        messages: history,
      })

      return res.json({ reply: response.content[0].text })
    }

    // ── Coach debrief — generates insight + next step from conversation ───
    if (mode === 'coach-debrief') {
      const { sessionHistory } = req.body
      const conversationText = (sessionHistory || [])
        .map((m) => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
        .join('\n\n')

      const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 300,
        system: `You are reflecting on a completed coaching conversation and generating a warm, specific debrief. Return valid JSON only — no markdown, no preamble.`,
        messages: [{
          role: 'user',
          content: `Coaching conversation:\n\n${conversationText}\n\nGenerate a JSON debrief:\n- "insight": One thing that stood out or shifted in this conversation. 2 sentences, warm, specific to what was actually discussed.\n- "nextStep": One small, concrete next step or intention. 1 sentence, action-oriented.\n\nReturn only: {"insight": "...", "nextStep": "..."}`,
        }],
      })

      const raw     = response.content[0].text.trim()
      const cleaned = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '')
      return res.json(JSON.parse(cleaned))
    }

    // ── Simulation: role-play as the counterpart ──────────────────────────
    if (mode === 'simulation') {
      // `scenario` may be a full structured object (from scenario tracks)
      // or a plain context string (from custom coach sessions)
      const history = (sessionHistory || []).map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }))
      history.push({ role: 'user', content: userMessage })

      const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 600,
        system: buildScenarioPrompt(scenario, difficulty, userRole),
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
      userName ? `User's name: ${userName}` : '',
      `Scenario: ${scenario}`,
      `\nWhat they want to say:\n${userMessage}`,
    ].filter(Boolean).join('\n')

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 900,
      system: buildCoachingFeedbackSystem(userRole),
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
