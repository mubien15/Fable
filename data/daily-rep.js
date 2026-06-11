// ─── Daily Rep: 30-Day Professional Conversation Curriculum ──────────────────
// Four phases, one session per day, building from fundamentals to mastery.
// Three day types:
//   'mini'        — self-contained scenario defined here
//   'track'       — references an existing scenario by ID (from scenarios-*)
//   'user-choice' — user picks any scenario from the library

export const DAILY_REP_PROGRAM = [

  // ═══════════════════════════════════════════════
  // PHASE 1: FOUNDATION (Days 1–7)
  // Building the fundamentals — how to open, name, and close hard conversations
  // ═══════════════════════════════════════════════

  {
    day: 1,
    phase: 1,
    phase_label: 'Foundation',
    title: 'The Opening Move',
    focus: 'Starting hard conversations without hedging',
    insight: 'The first sentence sets the entire tone. Most people lose conversations before they start — by softening, over-explaining, or burying the point.',
    duration: '8 min',
    type: 'mini',
    mini_scenario: {
      title: 'The Opening Move',
      context: "You're about to address a missed project deadline with a colleague who affected the whole team. You've just sat down together for a coffee. Nothing has been said yet.",
      counterpartRole: 'colleague who missed the deadline — slightly on edge, not sure what this is about',
      userRole: 'team member who was affected and needs to address it',
      challenge: 'Opening clearly without being aggressive, and without burying the point in small talk',
      opening_line: "Hey, thanks for making time. So — what did you want to talk about?",
      coaching_focus: [
        'Name the issue in your first or second sentence',
        'Avoid softening openers like "I just wanted to check in…"',
        'Be direct without being aggressive — state the situation, not a judgment',
      ],
      difficulty_default: 'easy',
    },
  },

  {
    day: 2,
    phase: 1,
    phase_label: 'Foundation',
    title: 'Name the Issue',
    focus: 'Saying precisely what the problem is',
    insight: "Vague feedback creates vague improvement. When you can't name the exact behavior causing a problem, you're not ready to have the conversation.",
    duration: '8 min',
    type: 'mini',
    mini_scenario: {
      title: 'Name the Issue',
      context: "A junior member of your team regularly interrupts people in meetings — including clients. It's become noticeable and is affecting team dynamics. You've pulled them aside after a team call.",
      counterpartRole: 'junior team member — unaware of the habit, generally enthusiastic and well-meaning',
      userRole: 'their direct manager',
      challenge: 'Naming the specific behavior without softening it into meaninglessness or making it personal',
      opening_line: "You said you wanted a quick word? Is everything okay?",
      coaching_focus: [
        'Name the specific behavior (not "how you come across")',
        'Reference a concrete recent example without making it feel like an ambush',
        'Separate the behavior from their character — "what you did" not "who you are"',
      ],
      difficulty_default: 'easy',
    },
  },

  {
    day: 3,
    phase: 1,
    phase_label: 'Foundation',
    title: 'Stay Curious',
    focus: 'Asking questions instead of defending',
    insight: 'When someone pushes back, your first instinct is to defend. Your second instinct — the better one — is to ask a question. Curiosity disarms defensiveness.',
    duration: '8 min',
    type: 'mini',
    mini_scenario: {
      title: 'Stay Curious',
      context: "You've shared your analysis with a senior stakeholder. Instead of engaging with your findings, they've dismissed them as 'missing the bigger picture'. You disagree, but an argument won't help.",
      counterpartRole: 'senior stakeholder — confident, used to being right, slightly dismissive of junior analysis',
      userRole: 'analyst presenting your findings',
      challenge: 'Responding to dismissal with curiosity rather than defensiveness — and keeping the door open',
      opening_line: "Look, I've seen a lot of these analyzes. I think you're missing the bigger picture here.",
      coaching_focus: [
        'Respond with a question before a counter-argument',
        'Acknowledge what might be true in their view before asserting yours',
        'Avoid the phrase "But actually…" — it shuts down dialogue',
      ],
      difficulty_default: 'easy',
    },
  },

  {
    day: 4,
    phase: 1,
    phase_label: 'Foundation',
    title: 'Bad News, Clearly',
    focus: 'Delivering unwelcome information without over-softening',
    insight: "Bad news doesn't get better with hedging. The kindest thing you can do is say it clearly and then give the person space to respond.",
    duration: '8 min',
    type: 'mini',
    mini_scenario: {
      title: 'Bad News, Clearly',
      context: "You need to tell a team member that their proposed project has been cancelled due to budget cuts. They invested real effort into the proposal. You're on a call with them now.",
      counterpartRole: 'team member who worked hard on the proposal — will be disappointed, possibly frustrated',
      userRole: 'their manager delivering the decision',
      challenge: 'Being clear about what happened and why, without drowning them in caveats or excessive apology',
      opening_line: "Hi — I've been looking forward to talking through the proposal. Did you get a chance to review my final version?",
      coaching_focus: [
        'Lead with the decision, not the context — don\'t make them wait',
        'Be compassionate and be clear — not both at once',
        'Give them space to react before moving to next steps',
      ],
      difficulty_default: 'easy',
    },
  },

  {
    day: 5,
    phase: 1,
    phase_label: 'Foundation',
    title: 'Ask for What You Need',
    focus: 'Making direct requests without over-explaining',
    insight: 'Most people hint at what they need instead of asking for it. A clear request — specific, timed, owned — is harder to misunderstand and harder to ignore.',
    duration: '8 min',
    type: 'mini',
    mini_scenario: {
      title: 'Ask for What You Need',
      context: "Your workload has become unmanageable since a colleague left three months ago. You've been absorbing extra work with no acknowledgement. You've requested a meeting with your manager.",
      counterpartRole: 'manager who is stretched thin and assumes everyone is coping fine',
      userRole: 'team member who needs to ask for meaningful relief',
      challenge: 'Making a clear, specific request without framing it as a complaint or making them defensive',
      opening_line: "Good to catch up. So — what did you want to talk about?",
      coaching_focus: [
        'Name the specific change you need (not just "I need more support")',
        'Own the request rather than framing it as what the team needs',
        'Avoid pre-emptively justifying before making the ask',
      ],
      difficulty_default: 'easy',
    },
  },

  {
    day: 6,
    phase: 1,
    phase_label: 'Foundation',
    title: 'Professional Disagreement',
    focus: 'Holding your ground without creating conflict',
    insight: "Disagreeing well isn't about winning. It's about staying in the room — asserting your view clearly enough that it's heard, without making the other person wrong.",
    duration: '8 min',
    type: 'mini',
    mini_scenario: {
      title: 'Professional Disagreement',
      context: "In a meeting, a senior colleague proposes an approach you believe is wrong. You have a different view based on your analysis. Others are deferring to them.",
      counterpartRole: 'senior colleague — confident in their view, not expecting to be challenged by you',
      userRole: 'team member with a different and well-founded perspective',
      challenge: 'Asserting disagreement clearly while keeping the conversation collaborative and professional',
      opening_line: "I think we should go with the phased rollout — it's the safer option and the client will respond better to it. Does anyone see it differently?",
      coaching_focus: [
        'State your view as your view — not as the obvious truth',
        'Acknowledge their position before asserting yours',
        'Avoid softening to the point of ambiguity — be clear about what you think',
      ],
      difficulty_default: 'easy',
    },
  },

  {
    day: 7,
    phase: 1,
    phase_label: 'Foundation',
    title: 'The Clean Close',
    focus: 'Ending conversations with clarity and commitment',
    insight: "A conversation without a clean close is a conversation that will need to be had again. The last 60 seconds are as important as the first — summarise, confirm, commit.",
    duration: '8 min',
    type: 'mini',
    mini_scenario: {
      title: 'The Clean Close',
      context: "You've just had a difficult but reasonably productive conversation with a client about project delays. You've covered the causes. Now you need to close in a way that restores confidence and sets clear expectations.",
      counterpartRole: 'client — still a little frustrated, watching for whether you can pull this together',
      userRole: 'consultant or project lead responsible for delivery',
      challenge: 'Closing with confidence — summarising what was agreed, confirming next steps, ending on solid ground',
      opening_line: "Okay. So… what happens now? I want to know what I'm telling my team.",
      coaching_focus: [
        'Summarise what was agreed — not everything that was discussed',
        'Name a specific next action, a date, and who owns it',
        'End with confidence, not with another apology or hedge',
      ],
      difficulty_default: 'easy',
    },
  },

  // ═══════════════════════════════════════════════
  // PHASE 2: ESCALATION (Days 8–14)
  // Real scenarios from the tracks — pressure builds
  // ═══════════════════════════════════════════════

  {
    day: 8,
    phase: 2,
    phase_label: 'Escalation',
    title: 'First Finding',
    focus: 'Delivering an audit finding to a resistant manager',
    insight: 'Facts are not enough. A finding that lands needs to be delivered with confidence, context, and a clear ask — not just evidence.',
    duration: '10 min',
    type: 'track',
    scenario_id: 'audit-finding-pushback',
    difficulty_default: 'easy',
  },

  {
    day: 9,
    phase: 2,
    phase_label: 'Escalation',
    title: 'Performance Conversation',
    focus: 'Naming underperformance for the first time',
    insight: 'Waiting to have the performance conversation doesn\'t make it easier — it makes the eventual conversation harder and the outcome less fair for everyone.',
    duration: '10 min',
    type: 'track',
    scenario_id: 'leadership-underperformance-first',
    difficulty_default: 'easy',
  },

  {
    day: 10,
    phase: 2,
    phase_label: 'Escalation',
    title: 'Missed Deadline',
    focus: 'Owning a missed commitment to a client',
    insight: "A missed deadline isn't just a project risk — it's a trust problem. How you own it matters more than whether you can explain it.",
    duration: '10 min',
    type: 'track',
    scenario_id: 'consulting-missed-deadline',
    difficulty_default: 'easy',
  },

  {
    day: 11,
    phase: 2,
    phase_label: 'Escalation',
    title: 'Honest Feedback',
    focus: 'Giving feedback that actually creates change',
    insight: "Feedback that doesn't land isn't feedback — it's reassurance with extra steps. Be specific, be direct, be kind. In that order.",
    duration: '10 min',
    type: 'track',
    scenario_id: 'leadership-critical-feedback',
    difficulty_default: 'medium',
  },

  {
    day: 12,
    phase: 2,
    phase_label: 'Escalation',
    title: 'Control Failure',
    focus: 'Presenting a significant control gap to a defensive owner',
    insight: 'The most important audit conversations happen after the finding is drafted, not during it. Your job is to be heard — not to win.',
    duration: '10 min',
    type: 'track',
    scenario_id: 'audit-control-failure',
    difficulty_default: 'medium',
  },

  {
    day: 13,
    phase: 2,
    phase_label: 'Escalation',
    title: 'Unhappy Client',
    focus: 'Recovering a strained client relationship',
    insight: "You can't recover trust by explaining yourself. You can only recover it by listening first, owning what's yours, and being specific about what changes.",
    duration: '10 min',
    type: 'track',
    scenario_id: 'consulting-unhappy-client',
    difficulty_default: 'easy',
  },

  {
    day: 14,
    phase: 2,
    phase_label: 'Escalation',
    title: 'Scope Creep',
    focus: 'Navigating scope expansion without damaging the relationship',
    insight: 'Scope conversations feel commercial but they are relationship conversations. Get the relationship right and the numbers tend to follow.',
    duration: '10 min',
    type: 'track',
    scenario_id: 'consulting-scope-creep',
    difficulty_default: 'medium',
  },

  // ═══════════════════════════════════════════════
  // PHASE 3: ADVANCED (Days 15–22)
  // Higher stakes, more complexity, mix of mini and track
  // ═══════════════════════════════════════════════

  {
    day: 15,
    phase: 3,
    phase_label: 'Advanced',
    title: 'Regulatory Noncompliance',
    focus: 'Communicating a compliance failure to senior leadership',
    insight: 'When the stakes are regulatory, precision matters more than diplomacy. Say what it is, say what it means, say what needs to happen. Then stop talking.',
    duration: '12 min',
    type: 'track',
    scenario_id: 'audit-regulatory-noncompliance',
    difficulty_default: 'medium',
  },

  {
    day: 16,
    phase: 3,
    phase_label: 'Advanced',
    title: 'Pattern of Underperformance',
    focus: 'Having the second, harder performance conversation',
    insight: "The second performance conversation is harder than the first — because now you've both named it and nothing has changed. The stakes are higher for everyone.",
    duration: '12 min',
    type: 'track',
    scenario_id: 'leadership-underperformance-repeat',
    difficulty_default: 'medium',
  },

  {
    day: 17,
    phase: 3,
    phase_label: 'Advanced',
    title: 'The Invoice Conversation',
    focus: 'Recovering a disputed fee without losing the client',
    insight: 'Fee conversations reveal whether the client values your work. How you have the conversation reveals whether you value it.',
    duration: '12 min',
    type: 'track',
    scenario_id: 'consulting-invoice',
    difficulty_default: 'medium',
  },

  {
    day: 18,
    phase: 3,
    phase_label: 'Advanced',
    title: 'Managing Up',
    focus: 'Telling your manager they are making a mistake',
    insight: "Disagreeing upward requires precision — clear enough that they hear you, calibrated enough that they don't feel undermined.",
    duration: '12 min',
    type: 'mini',
    mini_scenario: {
      title: 'Managing Up',
      context: "Your manager has made a call on a client deliverable that you believe is wrong — it will create more work and risk client dissatisfaction. They're stretched and slightly defensive. You've requested five minutes.",
      counterpartRole: 'your manager — capable but busy, mildly defensive when challenged on decisions',
      userRole: 'senior team member who disagrees with their decision',
      challenge: 'Raising a genuine disagreement with someone above you without it becoming adversarial or being dismissed',
      opening_line: "You wanted a word? I've got five minutes before my next call.",
      coaching_focus: [
        'Lead with the consequence you\'re worried about — not the disagreement itself',
        'Be specific about what you want reconsidered and why',
        'Give them a way to update the decision without losing face',
      ],
      difficulty_default: 'medium',
    },
  },

  {
    day: 19,
    phase: 3,
    phase_label: 'Advanced',
    title: 'The Pitch',
    focus: 'Winning a competitive client conversation',
    insight: "Pitches are not presentations — they're conversations. The person who asks the best questions usually wins.",
    duration: '12 min',
    type: 'track',
    scenario_id: 'consulting-pitch',
    difficulty_default: 'medium',
  },

  {
    day: 20,
    phase: 3,
    phase_label: 'Advanced',
    title: 'Raising a Concern',
    focus: 'Surfacing an ethical issue without overstepping',
    insight: "Speaking up when something doesn't feel right is one of the hardest professional skills — and one of the most important. The words matter.",
    duration: '12 min',
    type: 'mini',
    mini_scenario: {
      title: 'Raising a Concern',
      context: "You've noticed what appears to be a significant process shortcut being taken on a project — one that could create regulatory or reputational risk. You're not certain, but you're worried. You've asked to speak with a trusted senior colleague.",
      counterpartRole: 'senior colleague — respected, ethical, but protective of the team and wary of creating alarm',
      userRole: 'team member raising a concern carefully',
      challenge: 'Raising a concern clearly and specifically without overstepping or making it feel like an accusation',
      opening_line: "Thanks for the time. You said you wanted to talk about something on the project?",
      coaching_focus: [
        'State what you observed — not what you concluded from it',
        'Be clear you are raising it, not accusing anyone',
        'Ask for guidance rather than demanding action',
      ],
      difficulty_default: 'medium',
    },
  },

  {
    day: 21,
    phase: 3,
    phase_label: 'Advanced',
    title: 'The Closing Meeting',
    focus: 'Presenting a contentious audit report under pressure',
    insight: "The closing meeting is where months of work either land or collapse. Preparation is table stakes. Presence under pressure is what determines the outcome.",
    duration: '12 min',
    type: 'track',
    scenario_id: 'audit-closing-meeting',
    difficulty_default: 'hard',
  },

  {
    day: 22,
    phase: 3,
    phase_label: 'Advanced',
    title: 'Negotiating Your Worth',
    focus: 'Asking for a raise or rate increase with confidence',
    insight: "Most people wait too long, ask too little, and explain too much. Know your number before you walk in. Say it clearly. Then stop talking.",
    duration: '10 min',
    type: 'mini',
    mini_scenario: {
      title: 'Negotiating Your Worth',
      context: "You're in a performance review with your manager. Your results this year have been strong and you're significantly underpaid against market. You've decided this is the moment to ask for a meaningful increase.",
      counterpartRole: 'your manager — values you but has budget pressure and wasn\'t expecting this ask',
      userRole: 'professional asking for a specific, justified compensation increase',
      challenge: 'Asking for a specific number confidently and holding your position when they push back',
      opening_line: "Great to sit down — I've been looking forward to this review. You've had a strong year.",
      coaching_focus: [
        'Name a specific number or percentage early — not a range',
        'Anchor on market data and contribution, not personal need',
        'Hold your position through the first pushback without immediately caving',
      ],
      difficulty_default: 'medium',
    },
  },

  // ═══════════════════════════════════════════════
  // PHASE 4: MASTERY (Days 23–30)
  // Full realism, hardest difficulty, user-choice days
  // ═══════════════════════════════════════════════

  {
    day: 23,
    phase: 4,
    phase_label: 'Mastery',
    title: 'Finding Pushback — Hard Mode',
    focus: 'Holding your position under sustained, hostile challenge',
    insight: "Conviction under pressure is a skill. It requires knowing exactly why you're right — and being willing to update only when shown evidence, not when shown emotion.",
    duration: '12 min',
    type: 'track',
    scenario_id: 'audit-finding-pushback',
    difficulty_default: 'hard',
  },

  {
    day: 24,
    phase: 4,
    phase_label: 'Mastery',
    title: 'Your Choice',
    focus: 'Pick the scenario that challenges you most right now',
    insight: "The conversation you most want to avoid is usually the one you most need to practice.",
    duration: '10–15 min',
    type: 'user-choice',
    scenario_id: 'user-choice',
  },

  {
    day: 25,
    phase: 4,
    phase_label: 'Mastery',
    title: 'The Ultimatum Conversation',
    focus: 'When improvement is no longer optional — saying it plainly',
    insight: "Some conversations have to be said plainly — not unkindly, but plainly. Clarity, in these moments, is the most honest form of care.",
    duration: '12 min',
    type: 'track',
    scenario_id: 'leadership-underperformance-repeat',
    difficulty_default: 'hard',
  },

  {
    day: 26,
    phase: 4,
    phase_label: 'Mastery',
    title: 'Saving the Relationship',
    focus: 'Recovering a client who has already decided to leave',
    insight: "A client who is leaving has already made their decision emotionally. Your job isn't to argue them back — it's to make them feel genuinely heard.",
    duration: '12 min',
    type: 'track',
    scenario_id: 'consulting-unhappy-client',
    difficulty_default: 'hard',
  },

  {
    day: 27,
    phase: 4,
    phase_label: 'Mastery',
    title: 'Your Choice',
    focus: 'Go back to a conversation you want to sharpen',
    insight: "Repetition isn't weakness — it's how something becomes yours. Elite performers practice things they're already good at.",
    duration: '10–15 min',
    type: 'user-choice',
    scenario_id: 'user-choice',
  },

  {
    day: 28,
    phase: 4,
    phase_label: 'Mastery',
    title: 'Board-Level Stakes',
    focus: 'Presenting a critical finding under board-level scrutiny',
    insight: "When the audience has power over the outcome, precision and calm matter more than persuasion. Say what needs to be said. Once.",
    duration: '12 min',
    type: 'mini',
    mini_scenario: {
      title: 'Board-Level Stakes',
      context: "You are presenting a significant audit finding to a board audit committee. The finding relates to a control failure with potential regulatory implications. One board member is visibly skeptical and challenging the basis of your work.",
      counterpartRole: 'board member — experienced, skeptical, accustomed to testing management assertions',
      userRole: 'head of internal audit presenting the findings and their implications',
      challenge: 'Maintaining authority and precision under high-stakes institutional scrutiny',
      opening_line: "Before we proceed — I want to understand the basis for this rating. In my experience, these situations are rarely as clear-cut as presented.",
      coaching_focus: [
        'Ground every claim in evidence, not opinion or instinct',
        'Maintain composure under direct, pointed challenge',
        'Know when to offer to follow up vs. answer in the room',
      ],
      difficulty_default: 'hard',
    },
  },

  {
    day: 29,
    phase: 4,
    phase_label: 'Mastery',
    title: 'Your Choice',
    focus: 'Practice the one you need most',
    insight: "You know which conversation you need. You've known the whole time.",
    duration: '10–15 min',
    type: 'user-choice',
    scenario_id: 'user-choice',
  },

  {
    day: 30,
    phase: 4,
    phase_label: 'Mastery',
    title: 'The Final Rep',
    focus: 'Your hardest professional conversation — everything you have',
    insight: "Thirty days of showing up. Whatever you said in that first session — you say it differently now. That's the whole point.",
    duration: '15 min',
    type: 'mini',
    mini_scenario: {
      title: 'The Final Rep',
      context: "You are stepping into the hardest professional conversation you've been avoiding. The stakes are real — to your career, your relationships, or your integrity. This is the practice run before the real thing.",
      counterpartRole: 'the person you most need to have this conversation with — important to you, difficult, unpredictable',
      userRole: 'yourself — fully prepared, bringing everything you have built across 30 days',
      challenge: 'Bringing together everything you have practiced: clear opening, specific language, composure under pressure, and a clean close',
      opening_line: "I've been wanting to talk to you about something. Do you have a moment?",
      coaching_focus: [
        'Open with intention — not preamble',
        'Stay curious even when challenged or dismissed',
        'Close with clarity — a specific commitment, not hope',
      ],
      difficulty_default: 'hard',
    },
  },
]
