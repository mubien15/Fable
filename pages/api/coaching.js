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
    voiceMode = false,  // true when user is in voice conversation mode
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
        max_tokens: voiceMode ? 150 : 600,
        system: buildScenarioPrompt(scenario, difficulty, userRole, voiceMode),
        messages: history,
      })

      return res.json({ reply: response.content[0].text })
    }

    // ── Simulation hint — in-the-moment coaching nudge ────────────────────
    if (mode === 'simulation-hint') {
      const { conversationHistory, scenario: scen } = req.body

      const filtered = (conversationHistory || []).filter((m) => m.role !== 'hint')
      const last5    = filtered.slice(-5)
      const convoText = last5.map((m) =>
        `${m.role === 'user' ? 'PRACTITIONER' : 'COUNTERPART'}: ${m.content}`
      ).join('\n\n')

      const hintResponse = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 120,
        system: `You are a communication coach giving a quick in-the-moment nudge during a role-play simulation. Give a direction or question — NOT a script for them to repeat verbatim. Max 2 sentences. Return valid JSON only, no markdown: {"hint": "..."}`,
        messages: [{
          role: 'user',
          content: `Scenario: ${scen?.title || 'Professional conversation'}\n\nRecent conversation:\n${convoText}\n\nGive a brief coaching hint for the practitioner's next move.`,
        }],
      })

      try {
        const hRaw     = hintResponse.content[0].text.trim()
        const hCleaned = hRaw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '')
        return res.json(JSON.parse(hCleaned))
      } catch {
        return res.json({ hint: 'Try being more specific — name exactly what you observed before drawing a conclusion.' })
      }
    }

    // ── Scenario debrief — structured AI feedback after a simulation ──────
    if (mode === 'scenario-debrief') {
      const { conversationHistory, scenario: scen } = req.body

      const filtered  = (conversationHistory || []).filter((m) => m.role !== 'hint')
      const convoText = filtered.map((m) =>
        `${m.role === 'user' ? 'PRACTITIONER' : 'COUNTERPART'}: ${m.content}`
      ).join('\n\n')

      const focusItems   = scen?.coaching_focus || []
      const focusLines   = focusItems.map((f) => `"${f}": <integer 1-5>`).join(',\n    ')

      const debriefResponse = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        system: `You are a senior communication coach reviewing a professional role-play simulation. Be specific to what actually happened — do not give generic advice. Return valid JSON only, no markdown, no preamble.`,
        messages: [{
          role: 'user',
          content: `Scenario: ${scen?.title || 'Professional conversation'}

Coaching focus areas: ${focusItems.join(', ')}

Simulation transcript:
${convoText}

Return this exact JSON structure — no extra keys, no markdown:
{
  "overall_rating": <integer 1-5>,
  "overall_summary": "<2-3 sentences on overall performance — specific to this conversation>",
  "what_landed": "<1-2 sentences on what worked — cite specific moments or approaches from the transcript>",
  "what_created_friction": "<1-2 sentences on what held them back — specific, not generic>",
  "try_this_instead": "<1-2 sentences of a concrete alternative approach they could try next time>",
  "the_principle": "<One memorable coaching principle this conversation illustrates — 1 sentence>",
  "focus_scores": {
    ${focusLines}
  },
  "next_challenge": "<One sentence suggesting what to practise next>"
}`,
        }],
      })

      try {
        const dRaw     = debriefResponse.content[0].text.trim()
        const dCleaned = dRaw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '')
        return res.json(JSON.parse(dCleaned))
      } catch {
        const focusScores = {}
        focusItems.forEach((f) => { focusScores[f] = 3 })
        return res.json({
          overall_rating: 3,
          overall_summary: 'You completed the simulation — that takes practice. Review the transcript and look for moments where more specificity or directness could have shifted the dynamic.',
          what_landed: 'You engaged with the scenario and kept the conversation moving forward.',
          what_created_friction: 'Some responses could have been more precise or evidence-based.',
          try_this_instead: 'Lead with the specific observation before your interpretation — it makes the message harder to dismiss.',
          the_principle: 'Specificity builds credibility — vague language invites vague responses.',
          focus_scores: focusScores,
          next_challenge: 'Try the same scenario at a higher difficulty level and focus on your opening move.',
        })
      }
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

    if (mode === 'coach')           return res.json({ reply: "I'm here with you. Take your time." })
    if (mode === 'coach-debrief')   return res.json({ insight: 'Something shifted in this conversation — give yourself time to sit with it.', nextStep: 'Notice what came up and let it settle before deciding what to do next.' })
    if (mode === 'simulation')      return res.json({ reply: "Let's pick this up again in a moment." })
    if (mode === 'simulation-hint') return res.json({ hint: 'Take a breath and focus on what you observed — lead with evidence, not interpretation.' })
    if (mode === 'scenario-debrief') return res.json({ overall_rating: 3, overall_summary: 'Debrief temporarily unavailable — try again in a moment.', what_landed: '', what_created_friction: '', try_this_instead: '', the_principle: '', focus_scores: {}, next_challenge: '' })
    if (mode === 'pattern')         return res.json({ pattern: 'Keep practising — patterns emerge over time.' })
    return res.status(200).json(FALLBACK)
  }
}
