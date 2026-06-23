import Anthropic from '@anthropic-ai/sdk'
import { buildCoachingFeedbackSystem, buildScenarioPrompt, PATTERN_SYSTEM, buildCoachPrompt } from '../../lib/coachPrompt'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Fallback when API fails ───────────────────────────────────────────────

const FALLBACK = {
  strengths: [
    { label: 'You showed up', note: 'Practicing the conversation before it happens already puts you ahead of most people.' },
    { label: 'Clear intent',  note: 'Your message has a clear purpose — that gives us a solid foundation to work from.' },
  ],
  sharpen: {
    label: 'Try again shortly',
    note: 'The coach is temporarily unavailable — give it a moment and resubmit.',
  },
  rewrite: "Let's pick this back up in a moment. I want to give your words the attention they deserve.",
  coachNote: 'Connection hiccup. Keep going — showing up to practice is already the hard part.',
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

    // ── Rehearse: build a custom scenario from the user's own inputs ──────
    if (mode === 'generate-scenario') {
      const { rehearsal, extraInstruction = '' } = req.body
      const r = rehearsal || {}

      const moodNote = extraInstruction
        ? `\nAdditional direction for the counterpart: ${extraInstruction}`
        : ''

      const genPrompt = `You are building a professional conversation simulation for Fable, a conversation-training app.

A user has described a real, upcoming conversation they need to prepare for. Build a custom scenario that Fable will use to simulate this specific conversation — with a realistic AI counterpart that matches the person they described.

## The User's Inputs
Their situation:
"${r.situation || ''}"

The person they're talking to:
"${r.persona || ''}"

What they're most worried about:
"${r.worry || ''}"

What success looks like:
"${r.successLooks || ''}"

Preparation intensity: ${r.difficulty || 'realistic'}
(warmup = cooperative, build confidence; realistic = moderate, realistic resistance; worstcase = maximum pressure, everything that can go wrong does)${moodNote}

---
Build a scenario object. Return ONLY valid JSON — no preamble, no markdown:
{
  "title": "<short memorable title for this rehearsal — 4-6 words, no quotes inside>",
  "userRole": "<the user's role in this conversation, drawn from their situation>",
  "counterpartRole": "<who the AI will play — based on their persona description>",
  "context": "<2-3 sentence scene-setting the user reads before starting>",
  "context_short": "<a single tighter sentence version of the context>",
  "challenge": "<1-2 sentences on what makes this hard — drawn from their worry>",
  "opening_line": "<the first thing the counterpart says to open the conversation. Natural, in character, creates immediate tension. This is spoken BY the counterpart TO the user — never in the user's voice.>",
  "good_outcome": "<what success looks like — drawn from their successLooks input>",
  "watch_out_for": [
    "<trap 1 — specific to their situation>",
    "<trap 2 — specific to their situation>",
    "<trap 3 — specific to their situation>"
  ],
  "coaching_focus": [
    "<focus area 1 — a specific skill this conversation tests>",
    "<focus area 2>",
    "<focus area 3>"
  ],
  "counterpart_instructions": "<detailed, specific instructions for how the AI should play this exact person — personality, agenda, triggers, when they soften, when they escalate. Reference specifics the user described. 150-200 words.>",
  "voice": "onyx"
}

Make it feel written specifically for this person's situation. Do not be generic. Reference specifics from their inputs. The opening line should feel real and slightly uncomfortable — exactly how this person would actually open the conversation.`

      const genResponse = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1200,
        system: 'You are a senior communication coach and scenario designer. You return only valid JSON, no markdown, no preamble.',
        messages: [{ role: 'user', content: genPrompt }],
      })

      const gRaw     = genResponse.content[0].text.trim()
      const gCleaned = gRaw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '')
      const scenario = JSON.parse(gCleaned)

      // The simulation prompt builder expects `system_prompt_addition`; map the
      // generated counterpart instructions onto it so role-play runs identically.
      scenario.system_prompt_addition = scenario.counterpart_instructions
        ? `\n## Counterpart Behavior Guide\n${scenario.counterpart_instructions}\n`
        : ''

      return res.json({ scenario })
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

      const { archetypeSeed = null } = req.body
      const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 256,  // counterpart replies are 1-2 sentences; lower ceiling = faster
        system: buildScenarioPrompt(scenario, difficulty, userRole, archetypeSeed),
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

      const filtered     = (conversationHistory || []).filter((m) => m.role !== 'hint')
      const convoText    = filtered.map((m) =>
        `${m.role === 'user' ? 'PRACTITIONER' : 'COUNTERPART'}: ${m.content}`
      ).join('\n\n')
      const userMessages = filtered
        .filter((m) => m.role === 'user')
        .map((m, i) => `[${i + 1}] "${m.content}"`)
        .join('\n')

      const focusItems = scen?.coaching_focus || []
      const focusLines = focusItems.map((f) => `"${f}": <integer 1-5>`).join(',\n    ')

      const debriefResponse = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1500,
        system: `You are a senior communication coach reviewing a professional role-play simulation. Be specific to what actually happened — quote exact words. Return valid JSON only, no markdown, no preamble.`,
        messages: [{
          role: 'user',
          content: `Scenario: ${scen?.title || 'Professional conversation'}
What makes this hard: ${scen?.challenge || 'navigating a high-stakes professional conversation'}
Coaching focus areas: ${focusItems.join(', ')}

Full conversation:
${convoText}

Practitioner's messages (for analysis):
${userMessages}

---
Your job is to give feedback that is:
- SPECIFIC: quote exact words or phrases the practitioner used
- HONEST: do not inflate scores or soften observations to be kind
- ACTIONABLE: every piece of feedback includes something they can do differently
- PROFESSIONAL: speak as a respected senior mentor, not a motivational coach
- ADAPTIVE: judge effectiveness against THIS counterpart as they behaved in the transcript, not a single universal style. Directness and brevity suit an impatient or evidence-driven counterpart; a relationship-first or diplomatic counterpart may need warmth, rapport, and patience first. Reward the practitioner for reading the room and matching their approach to the person in front of them — do not penalise tact when tact was the right call, or bluntness when bluntness landed.

Return ONLY valid JSON in this exact structure — no extra keys, no markdown:
{
  "overall_rating": <integer 1-5>,
  "overall_summary": "<2 sentences — specific to what defined this conversation>",
  "what_landed": {
    "observation": "<what specifically worked>",
    "quote": "<exact words from their messages that demonstrate this>",
    "why_it_works": "<one sentence on why this approach is effective professionally>"
  },
  "what_created_friction": {
    "observation": "<what specifically weakened their position>",
    "quote": "<exact words from their messages that demonstrate this>",
    "impact": "<one sentence on how this would land in a real conversation>"
  },
  "the_pattern": "<one sentence naming a repeating habit noticed across multiple exchanges — good or bad>",
  "try_this_instead": "<concrete alternative — write it as actual dialogue they could have used>",
  "the_principle": "<one transferable communication principle from this session — make it memorable>",
  "focus_scores": {
    ${focusLines}
  },
  "speech_observations": {
    "filler_phrases": [<list any filler phrases: "I just wanted to", "sort of", "kind of", "basically" — empty array if none>],
    "hedging_language": [<list any hedging: "maybe", "perhaps", "I'm not sure but", "it might be" — empty array if none>],
    "strong_moments": [<list 1-2 specific phrases that were particularly effective — empty array if none>]
  },
  "next_challenge": "<specific recommendation — name the scenario type and difficulty level>"
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
          what_landed: { observation: 'You engaged with the scenario and kept the conversation moving forward.', quote: '', why_it_works: 'Staying present in a difficult conversation is the foundation of everything else.' },
          what_created_friction: { observation: 'Some responses could have been more precise or evidence-based.', quote: '', impact: 'Vague language gives the counterpart room to dismiss or deflect your points.' },
          the_pattern: 'Review the transcript for a repeating habit — it will be visible across multiple exchanges.',
          try_this_instead: 'Lead with the specific observation before your interpretation — it makes the message harder to dismiss.',
          the_principle: 'Specificity builds credibility — vague language invites vague responses.',
          focus_scores: focusScores,
          speech_observations: { filler_phrases: [], hedging_language: [], strong_moments: [] },
          next_challenge: 'Try the same scenario at a higher difficulty level and focus on your opening move.',
        })
      }
    }

    // ── Communication profile — personalized 2-3 sentence summary ────────
    if (mode === 'profile') {
      const { progressData } = req.body
      const strengths = (progressData?.strengths || []).map(s => `${s.area} (${Number(s.avg).toFixed(1)}/5)`).join(', ')
      const develop   = (progressData?.develop   || []).map(s => `${s.area} (${Number(s.avg).toFixed(1)}/5)`).join(', ')

      const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 150,
        system: `You are a communication coach writing a brief, honest, personalized profile for a professional based on their practice data. Write in second person ("You..."). Return only the profile text, no preamble.`,
        messages: [{
          role: 'user',
          content: `Practice data:
- Total sessions completed: ${progressData?.totalReps || 0}
- Average rating: ${progressData?.avgRating || 'n/a'}/5
- Strongest focus areas: ${strengths || 'not yet determined'}
- Areas to develop: ${develop || 'not yet determined'}
- Most practiced track: ${progressData?.mostPracticed || 'n/a'}
- Least practiced track: ${progressData?.leastPracticed || 'n/a'}
- Current streak: ${progressData?.streak || 0} days

Write a communication profile in MAXIMUM 3 sentences.

Rules:
- Describe only observable patterns from the data (tracks practiced,
  session counts, scores).
- NEVER speculate about motives, feelings, or what the user might be
  "avoiding". Do not use the words "avoiding", "comfort zone",
  "perhaps", "suggests you might", or any psychoanalysis.
- Tone: a respectful senior mentor stating what they see —
  not a therapist interpreting behavior.
- End with one concrete, neutral suggestion for what to practice next.

Example of the right tone:
"Three sessions in, all on the audit track — a solid start with
structured, evidence-based conversations. The consulting and
leadership tracks are still unexplored. A client-conversation
scenario would be a natural next step."`,
        }],
      })

      return res.json({ profile: response.content[0].text.trim() })
    }

    // ── Pattern: analyze recent sessions ─────────────────────────────────
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
    if (mode === 'generate-scenario') return res.status(502).json({ error: 'Could not build your scenario right now — please try again in a moment.' })
    if (mode === 'scenario-debrief') return res.json({ overall_rating: 3, overall_summary: 'Debrief temporarily unavailable — try again in a moment.', what_landed: { observation: '', quote: '', why_it_works: '' }, what_created_friction: { observation: '', quote: '', impact: '' }, the_pattern: '', try_this_instead: '', the_principle: '', focus_scores: {}, speech_observations: { filler_phrases: [], hedging_language: [], strong_moments: [] }, next_challenge: '' })
    if (mode === 'profile')         return res.json({ profile: null })
    if (mode === 'pattern')         return res.json({ pattern: 'Keep practicing — patterns emerge over time.' })
    return res.status(200).json(FALLBACK)
  }
}
