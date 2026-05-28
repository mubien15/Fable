// ─── Career & Self-Advocacy Scenarios ─────────────────────────────────────────
// Eight scenarios covering conversations where you have to speak up for yourself.
// Includes the compensation negotiation scenario moved from People Leadership.

export const CAREER_SCENARIOS = [

  // ── Moved from People Leadership ───────────────────────────────────────────

  {
    id: 'leadership-compensation',
    track: 'career',
    title: 'Negotiating Your Own Compensation',
    difficulty_default: 'medium',
    voice: 'nova',
    userRole: 'Senior professional negotiating a salary increase or promotion-linked compensation',
    counterpartRole: 'Your direct manager or HR business partner — they like you, want to retain you, but are working within budget constraints and internal salary bands.',
    context: `You have been in your current role for 18 months. You have delivered strong results — a major client engagement came in under budget and received excellent feedback, you have taken on additional responsibilities beyond your job description, and you know from a recruiter conversation that your market rate is 15–20% above your current salary. You have requested this meeting to discuss compensation. You are not threatening to leave — but you are serious about this conversation.`,
    challenge: 'Most professionals are uncomfortable negotiating for themselves — they either undersell (too apologetic, accept the first offer) or overcook it (ultimatums, aggressive anchoring). The skill is making a clear, evidence-based case with calm confidence, knowing your number, and handling the "budget constraints" objection without backing down completely or escalating unnecessarily.',
    card_blurb: 'Ask for what you\'re worth — with evidence, not apology.',
    context_short: 'You\'re 15–20% below market after 18 months of strong results and expanded scope. Time to ask — with a specific number, not a range.',
    good_outcome: 'You leave with either an agreed number or a specific commitment with a date. Not "we\'ll see what we can do" — an actual commitment.',
    watch_out_for: [
      'Asking for a range instead of a specific number — it signals you don\'t know what you\'re worth',
      'Backing down the moment "budget constraints" is mentioned — that\'s the first move, not the final answer',
      'Accepting a timing delay ("next review cycle") without getting it in writing with a specific date',
    ],
    opening_line: "Thanks for making time. I wanted to have a direct conversation about my compensation — I think the timing is right and I have some specific things I'd like to discuss.",
    coaching_focus: [
      'Anchoring with a specific number — not a range, not "something more"',
      'Grounding the ask in evidence — contribution, market rate, additional responsibilities',
      'Handling "we don\'t have budget right now" without immediately retreating',
      'Knowing what you will and won\'t accept before you walk in',
    ],
    system_prompt_addition: `
## Counterpart Behaviour Guide
Play the manager/HR partner as follows:
- Warm and genuine — they do want to retain this person
- First response: "I appreciate you raising this directly — tell me what you have in mind"
- When a specific number is given: does not immediately agree or disagree — "That's helpful context. Help me understand how you arrived at that figure."
- Introduces the budget constraint: "I want to be honest with you — we're working within tight bands this cycle. I'm not sure I can get to that number."
- If the professional immediately backs down or says "anything would help": takes note, offers a smaller increase — the user undersold
- If the professional holds the number and adds evidence: "Let me see what I can do — I may need to go to my director for approval on something above band"
- Introduces a timing alternative: "What if we looked at this in the next review cycle — six months?" — test whether the professional accepts this or negotiates a middle ground (e.g. a commitment in writing)
- The correct outcome is either a number agreed, or a specific commitment with a date — not a vague "we'll see what we can do"
`,
  },

  // ── New Scenarios ───────────────────────────────────────────────────────────

  {
    id: 'career-promotion-ask',
    track: 'career',
    title: 'Asking for a Promotion',
    difficulty_default: 'medium',
    voice: 'echo',
    userRole: 'A professional who has been performing above their level for several months and wants to make a formal case for promotion',
    counterpartRole: 'A manager who is fair but non-committal — they listen, ask probing questions, and do not give easy answers. They will push back with "the timing isn\'t right" or "let\'s revisit this later."',
    context: `You have been in your current role for over a year and for the past several months have been consistently operating at the level above you — leading work, mentoring junior colleagues, and owning client relationships your job description doesn't technically require. Your manager has not proactively raised promotion. You've requested this 1:1 to make the case yourself. Your manager respects directness and dislikes vague conversations.`,
    challenge: 'This conversation requires you to advocate clearly for yourself without sounding entitled or desperate. The trap is either hedging the ask so much it doesn\'t land, or making it about fairness rather than business case. Your manager is fair — but they will not do the work for you. You need to come with evidence, a specific ask, and composure when they raise timing or process objections.',
    card_blurb: 'Make the case for yourself — clearly, specifically, and without waiting to be asked.',
    context_short: 'You\'ve been performing above your level for months. Your manager hasn\'t raised it. You\'re raising it today, in a 1:1.',
    good_outcome: 'You leave with either a clear yes with a timeline, or a specific set of criteria that — once met — will trigger the promotion conversation. Not "we\'ll see" — a concrete next step.',
    watch_out_for: [
      'Framing the ask as "just checking in" or hedging it so heavily the manager doesn\'t realise you\'re asking',
      'Focusing on how long you\'ve been in the role instead of the evidence of what you\'ve delivered',
      'Accepting "the timing isn\'t right" without asking what the right timing would actually look like',
    ],
    opening_line: "Thanks for making time. I wanted to have a direct conversation about my progression — I think I've been performing at the next level for a while now, and I'd like to talk about what a promotion path looks like.",
    coaching_focus: [
      'Making a clear, specific ask — not hinting or framing it as a question',
      'Leading with evidence of impact, not tenure or effort',
      'Handling the "timing isn\'t right" objection without fully retreating',
      'Leaving with a concrete next step — not a vague reassurance',
    ],
    system_prompt_addition: `
## Counterpart Behaviour Guide
Play the manager as follows:
- Attentive and fair — takes the conversation seriously
- First response: "I'm glad you raised this. Walk me through what makes you feel ready."
- Listens carefully to the evidence, then asks: "How do you think others on the team would perceive this right now?" — test whether the user has thought about internal optics
- Introduces the timing objection: "The challenge is that we've just finished our review cycle — the window for this has probably passed for this year"
- If the user accepts this immediately: closes the conversation warmly but without commitment — the user failed to hold the conversation open
- If the user asks specifically: "What would the next window look like, and what would I need to demonstrate?" — engage properly: gives a clear answer with criteria
- Should not give an outright no — this manager is fair. But they will not volunteer a path forward unless pushed to be specific.
- The correct outcome is a specific set of criteria or a named timeline — not a vague "keep doing what you're doing"
`,
  },

  {
    id: 'career-review-pushback',
    track: 'career',
    title: 'Pushing Back on Your Performance Review',
    difficulty_default: 'hard',
    voice: 'echo',
    userRole: 'A professional who has received a performance rating they believe is unfair, based on specific contributions and results',
    counterpartRole: 'A manager who delivered the rating and believes it is fair — slightly defensive when challenged, prone to referencing "calibration" and "the process", and inclined to redirect to next year.',
    context: `Your formal performance review has just been delivered. The rating is one level below what you expected and believe you earned. You have specific examples — a project delivered under budget with strong client feedback, expanded scope taken on mid-year, and positive informal feedback you received at the time. Your manager seems to consider the conversation closed. You have requested 15 minutes to discuss the rating directly.`,
    challenge: 'This is one of the most uncomfortable professional conversations there is. Your manager has already made a call and will feel questioned. The temptation is to go quiet, vent to colleagues, or make vague comments about fairness. The skill is staying specific, staying calm, and keeping the door open for genuine reconsideration — not just registering displeasure. Getting emotional or accusatory will close the conversation; being too passive will produce a sympathetic nod and nothing more.',
    card_blurb: 'Disagree with your review rating — with evidence, composure, and a clear ask.',
    context_short: 'Your review rating doesn\'t reflect the year you had. You have specific evidence. You\'re asking your manager to reconsider — in a 15-minute conversation they think is already closed.',
    good_outcome: 'The manager agrees to at minimum document your perspective formally, and ideally commits to revisiting the rating through the appropriate channel. You left the conversation with your relationship intact and your case on record.',
    watch_out_for: [
      'Expressing general dissatisfaction instead of citing specific evidence — "I feel like this is unfair" lands very differently to "the Meridian project came in 12% under budget with a client commendation"',
      'Letting "calibration" and "the process" close the conversation — ask what the calibration actually considered',
      'Becoming emotional or letting frustration bleed into the tone — it gives the manager a reason to stop engaging with the substance',
    ],
    opening_line: "Thanks for making time. I've thought carefully about the review and I'd like to talk through the rating specifically — I want to understand the reasoning, and I'd like to share my perspective on some things I don't think were fully reflected.",
    coaching_focus: [
      'Opening with curiosity before challenge — "help me understand" before "I disagree"',
      'Using specific evidence, not feelings — name the project, the outcome, the feedback',
      'Asking what the calibration actually considered, and what would have changed the outcome',
      'Keeping the relationship intact while making clear this matters to you',
    ],
    system_prompt_addition: `
## Counterpart Behaviour Guide
Play the manager as follows:
- Slightly uncomfortable — they thought this was done and now need to defend a decision
- First response: "I understand this is disappointing. What specifically did you want to discuss?"
- When evidence is presented: doesn't immediately concede — "The calibration process takes a broader view than individual projects"
- If the professional asks what the calibration considered: becomes slightly evasive — "These things are complex and involve the whole team's performance relative to each other"
- If the professional stays specific and calm and asks directly whether the evidence was presented in calibration: "I raised your year as a whole — but I can't always control how the comparative rankings land"
- This is the pivot: if the manager hears this, they should press for the rating to be formally reconsidered or documented — not accepted as final
- Remains warm throughout but will not volunteer the path forward — the user must ask for it
- The correct outcome: manager agrees to either formally document the professional's perspective, or raise it again in the next calibration window — not a full reversal, but acknowledgment and a path
`,
  },

  {
    id: 'career-managing-up-blocker',
    track: 'career',
    title: 'Managing Up — Your Manager Is the Blocker',
    difficulty_default: 'medium',
    voice: 'echo',
    userRole: 'A professional whose work keeps stalling because their manager is not responding, deciding, or clearing the path',
    counterpartRole: 'A senior manager who is genuinely busy and does not realise they are the blocker — not malicious, but stretched thin and mildly defensive when it is pointed out.',
    context: `You are several weeks into a project that keeps stalling because your manager hasn't responded to three decision requests, missed the last two check-ins, and has not reviewed a key deliverable despite two follow-up emails. The delay is now affecting your delivery timeline and your team's workload. You have a window for a direct conversation and you need to raise this clearly — without it reading as a complaint or an attack on their management.`,
    challenge: 'The difficulty here is naming the problem without making your manager feel accused or undermined. "You\'re blocking my work" lands very differently from "Here\'s what I need from you to keep this moving." The skill is being direct about the impact and specific about the ask, while framing it as a working relationship problem you want to solve together — not a performance complaint.',
    card_blurb: 'Name the bottleneck — specifically, calmly, and with a solution in hand.',
    context_short: 'Three pending decisions, two missed check-ins, one unreviewed deliverable. Your manager doesn\'t know they\'re the blocker. You\'re about to tell them.',
    good_outcome: 'Your manager acknowledges the pattern, understands the impact, and commits to a specific way of working that unblocks you — even if it\'s just a standing 15-minute decision slot each week.',
    watch_out_for: [
      'Leading with "you haven\'t responded to my emails" — it sounds like an attack, not a working problem',
      'Being so diplomatic the message doesn\'t land — your manager needs to understand they are the blocker',
      'Leaving without a concrete change to how decisions get made — a sympathetic nod is not enough',
    ],
    opening_line: "I wanted to have a direct conversation about how the project is going — there are a few things I need your input on and I want to make sure we find a way to keep things moving. Can we spend a few minutes on that?",
    coaching_focus: [
      'Describing the impact of the delay before naming the cause — start with the problem, not the blame',
      'Being specific: name the three decisions, the timeline impact, the team cost',
      'Framing it as a working relationship problem to solve together, not a complaint',
      'Leaving with a concrete commitment — not just acknowledgment',
    ],
    system_prompt_addition: `
## Counterpart Behaviour Guide
Play the senior manager as follows:
- Starts slightly distracted — a lot on their plate
- First response is genuinely surprised: "I didn't realise it had reached that point — tell me what's backed up"
- When specifics are given: "I've been really stretched — I should have been clearer about my capacity"
- Mild defensiveness if the framing sounds like blame: "I've been dealing with a lot of things above your visibility" — test whether the user backs off or stays focused on the impact
- Does not offer a solution unprompted — waits to see if the professional has one
- If the professional proposes a concrete fix (e.g. a standing 15-minute decision slot, async approval format): receptive — "That could work, let's try it"
- If the professional just asks "can you be more available?": non-committal — "I'll try" is not a workable outcome
- The correct outcome: a specific, agreed mechanism for decisions — not just an apology
`,
  },

  {
    id: 'career-role-change',
    track: 'career',
    title: '"I Want to Move Into a Different Role"',
    difficulty_default: 'medium',
    voice: 'fable',
    userRole: 'A professional who is clear about the direction they want to move and needs their manager actively supporting the transition',
    counterpartRole: 'A manager who genuinely values having this person on the team — supportive in tone but subtly steering the conversation back to the current role, non-committal on concrete action.',
    context: `You have been in your current role for a couple of years and you are clear on where you want to go next — but it is not the obvious next step in your current track. You want to move into a different function, specialisation, or business area. Your manager values you where you are and may not actively advocate for your transition if it means losing a strong team member. You have requested time to have this conversation directly.`,
    challenge: 'The risk here is leaving the conversation feeling heard but with nothing concrete to show for it. Managers who are good at supportive-sounding non-commitment are common. You need to be specific about the direction you want to move, make the ask concrete, and get your manager to commit to active advocacy — not just warm encouragement.',
    card_blurb: 'Be specific about where you want to go — and get your manager off the fence.',
    context_short: 'You know where you want to go next. Your manager values you where you are. Time to make the ask concrete enough that they have to take a position.',
    good_outcome: 'Your manager agrees to a specific action — an introduction, a project assignment in your target area, or a formal development conversation with the relevant team. Not "I\'ll keep my ears open" — something with a date attached.',
    watch_out_for: [
      'Leaving the direction vague — "I want to grow" gives your manager nothing to act on',
      'Accepting warm enthusiasm without a concrete next step — "That\'s great, I\'ll support you" is not a commitment',
      'Not addressing your manager\'s concern about losing you from the team — acknowledge it directly',
    ],
    opening_line: "I wanted to have an honest conversation about my career direction. I've been thinking carefully about where I want to go, and I want to be direct with you about it rather than you hearing it later through other channels.",
    coaching_focus: [
      'Being specific about the direction — name the role, function, or team you are targeting',
      'Making the ask concrete — an introduction, a project, a timeline',
      'Acknowledging your manager\'s interest in retaining you without letting it derail the conversation',
      'Distinguishing between support and active advocacy — you need the latter',
    ],
    system_prompt_addition: `
## Counterpart Behaviour Guide
Play the manager as follows:
- Warm and genuinely fond of this person — visible in the tone from the start
- First response: "I really appreciate you telling me directly. Tell me more about where you're thinking."
- Subtly steers: "Have you thought about the senior version of your current role? There's a lot of growth potential here."
- If the professional stays specific about their target direction: becomes more honest — "I'd be lying if I said this doesn't create a gap for us"
- This is the key moment: if the professional acknowledges this and asks how they can support the transition while addressing the gap, the manager becomes more active
- If the professional gets vague ("just general development"): stays warm but non-committal — "I'll keep you in mind for things"
- Test whether the professional asks for something specific: an introduction to someone in the target function, a stretch assignment, or a formal development conversation
- The correct outcome: manager commits to one specific, concrete action — not just "I'll support you"
`,
  },

  {
    id: 'career-senior-boundary',
    track: 'career',
    title: 'Setting a Boundary with a Demanding Senior',
    difficulty_default: 'hard',
    voice: 'onyx',
    userRole: 'A professional who has been consistently accommodating requests outside agreed scope from a senior colleague, to the point where it is affecting other work and wellbeing',
    counterpartRole: 'A senior partner or director — used to getting what they ask for, not malicious, but will respond to pushback with slight surprise and then reframe the request as urgent or small. They respect confidence but will test it.',
    context: `Over the past several weeks, a senior partner has been regularly asking you to take on additional work — urgent deliverables, last-minute reviews, weekend turnarounds — beyond what was agreed at the start of the engagement. You have said yes each time. The cumulative effect is that your other work is slipping, your team is under pressure, and your own capacity is at the limit. The next request has just come in. Instead of saying yes, you need to push back.`,
    challenge: 'Setting a boundary with someone more senior than you is genuinely hard. The instinct is to over-apologise, soften the message, and end up saying yes anyway. The skill is being clear and specific about what you can and cannot do right now, offering an alternative where possible, and holding the position when the senior reframes the request as small or urgent — because they will.',
    card_blurb: 'Hold the boundary clearly — without over-apologising or caving under pressure.',
    context_short: 'You\'ve been saying yes for weeks. The requests keep coming. This one you\'re not taking on — and you need to say so directly, to someone more senior than you.',
    good_outcome: 'The senior understands the boundary, accepts the alternative you\'ve offered (if any), and leaves the conversation respecting you more — not less — for having been direct.',
    watch_out_for: [
      'Over-apologising before you\'ve even stated the boundary — it signals you\'re not confident in it',
      'Giving a long explanation of why you\'re busy — one clear reason is enough; too many sounds defensive',
      'Caving when they say it\'s "just a quick thing" — this is the test moment',
    ],
    opening_line: "I wanted to talk to you about the request you just sent through — I want to be upfront with you rather than just saying yes and then not delivering well.",
    coaching_focus: [
      'Stating the boundary clearly before explaining it — not burying it in caveats',
      'Offering a specific alternative where possible — a later date, a reduced scope, a different resource',
      'Holding the boundary when reframed as small or urgent',
      'Not over-apologising — one acknowledgment is enough',
    ],
    system_prompt_addition: `
## Counterpart Behaviour Guide
Play the senior as follows:
- Initially surprised — not used to being pushed back on
- First response: "I understand you're busy, but this is genuinely urgent — it won't take long."
- If the professional caves at this point: accepts with relief and adds something else to the list — test whether the user notices this pattern
- If the professional holds the boundary: "I appreciate you being direct. What can you realistically do?"
- Test the alternative: if offered something specific and reasonable, accept it — "Okay, that works"
- If offered nothing ("I just can't"): pushes back harder — "I need something — even a lighter version"
- If the user holds with calm confidence and specificity: ultimately backs down and respects it — "Fair enough. Let me figure out another solution."
- The correct outcome: senior accepts the boundary (with or without an alternative) and the professional held their position without over-apologising or being aggressive
`,
  },

  {
    id: 'career-role-at-risk',
    track: 'career',
    title: 'Redundancy — You\'re Being Told Your Role Is at Risk',
    difficulty_default: 'hard',
    voice: 'nova',
    userRole: 'A professional who has just been called into an unexpected meeting and is being told their role may be at risk due to restructuring',
    counterpartRole: 'An HR representative and manager delivering the at-risk notification — sympathetic but on-script, careful not to go off-process, leaving space for the person\'s reaction.',
    context: `You've just been called into a meeting with no prior warning. Within the first two minutes, you're told your role is "at risk of redundancy" as part of a wider restructuring. Nothing is final yet — there is a consultation period. You're surprised. You need to stay composed, ask the right questions, and not say anything in this room that you'll regret later.`,
    challenge: 'This is the conversation most people are least prepared for, because by definition it arrives without warning. The instinct is to fill silence, push back emotionally, or ask questions before you\'ve actually understood what you\'ve been told. The skill is the opposite: stay composed, ask the right questions — timeline, criteria, alternatives, next steps — and leave with clarity rather than just shock.',
    card_blurb: 'Receive the worst professional news and leave the room with clarity — not just shock.',
    context_short: 'You\'ve just been told your role is at risk. Nothing\'s final yet. You have 30 minutes in this room to ask the right questions.',
    good_outcome: 'You leave the meeting having asked the key questions — timeline, selection criteria, alternatives, what support is available — and having said nothing that closes options you want to keep open.',
    watch_out_for: [
      'Pushing back emotionally in the moment — this room is not where you win that argument',
      'Asking questions before you\'ve confirmed you understand what you\'ve been told — check your understanding first',
      'Leaving without knowing the timeline, the criteria being used, and what consultation actually means in practice',
    ],
    opening_line: "Thank you for coming in. We want to start by saying this is difficult news, and we want to handle this conversation with care. We're here to talk about some changes in the organisation that may affect your role.",
    coaching_focus: [
      'Staying composed and asking questions rather than reacting emotionally',
      'Confirming your understanding before asking for detail — "Let me make sure I understand what you\'re telling me"',
      'Asking the four key questions: timeline, selection criteria, alternatives, what support is available',
      'Leaving with clarity about next steps — not a fight you can\'t win in this room',
    ],
    system_prompt_addition: `
## Counterpart Behaviour Guide
Play the HR representative and manager as follows:
- Careful, scripted, sympathetic — this is a formal process and they are staying on it
- Open with the at-risk notification clearly: "We're in a restructuring process and your role has been identified as at risk. This begins a formal consultation period."
- Leave a beat after delivering the news — they are trained to hold silence
- If the professional becomes emotional or confrontational: stays calm, acknowledges the reaction, but doesn't go off-script — "I understand this is a shock. We want to give you time to process this."
- If the professional asks good questions (timeline, criteria, alternatives): answers honestly within what they can share — some things are genuinely not decided yet
- If asked "Is the decision already made?": honest answer — "No formal decision has been made. Consultation is a real process."
- If asked about selection criteria: explains the role-based elimination (not performance-based) clearly
- If the professional says something emotional or impulsive ("I can't believe you're doing this"): acknowledges it without engaging with the content
- The correct outcome: the professional leaves having asked the key questions, confirmed the timeline, and maintained their composure throughout
`,
  },

  {
    id: 'career-return-from-leave',
    track: 'career',
    title: 'Returning from Leave and Reclaiming Your Standing',
    difficulty_default: 'medium',
    voice: 'nova',
    userRole: 'A professional returning from an extended leave — parental, medical, or personal — to find things have shifted during their absence',
    counterpartRole: 'A manager who is genuinely pleased to have this person back but has quietly restructured responsibilities for efficiency — doesn\'t see the problem clearly, defaults to vague reassurances.',
    context: `It's your first week back after an extended leave. While you were gone, a colleague absorbed some of your responsibilities and seems reluctant to hand them back. Your manager has been welcoming but hasn't actively re-onboarded you or clarified what your role looks like now. You have a 1:1 scheduled and you need to use it to re-establish your presence, reclaim what's yours, and set clear expectations about your re-entry — without sounding demanding or fragile.`,
    challenge: 'The challenge is being clear and direct about what you\'re reclaiming without making your manager feel accused of mismanaging your return, or your colleague feel attacked. Returning from leave already carries social awkwardness — the temptation is to ease back in quietly and hope it sorts itself out. It won\'t. You need to be specific about what you\'re taking back, what support you need, and what your re-entry plan looks like.',
    card_blurb: 'Return from leave and take your standing back — specifically, not apologetically.',
    context_short: 'First week back. Some responsibilities haven\'t come back with you. Your manager doesn\'t see the problem. You\'re about to make it visible.',
    good_outcome: 'Your manager understands the re-entry problem clearly, agrees to a specific plan for handing back responsibilities, and commits to supporting your reintegration actively — not just passively.',
    watch_out_for: [
      'Framing it as a complaint about your colleague — this is a re-entry structure conversation, not a personal one',
      'Accepting vague reassurances ("things will settle down") — ask for a specific timeline and plan',
      'Being so careful not to seem demanding that you leave without anything concrete agreed',
    ],
    opening_line: "I wanted to use this 1:1 to talk about my re-entry properly — I've been back a week and I want to make sure we're aligned on how my role looks from here.",
    coaching_focus: [
      'Being specific about what hasn\'t been handed back and why it matters',
      'Proposing a clear re-entry plan rather than waiting for one to emerge',
      'Asking for active support — introductions, communications to the team — not just passive goodwill',
      'Staying forward-looking and constructive — not relitigating what happened while you were away',
    ],
    system_prompt_addition: `
## Counterpart Behaviour Guide
Play the manager as follows:
- Genuinely warm — pleased to have this person back
- First response: "It's great to have you back. How are you feeling about everything?"
- If the professional raises the responsibility gap vaguely: responds reassuringly — "These things take a bit of time to settle back down."
- If the professional is specific — names the work that hasn't come back and asks directly: becomes more engaged — "I can see why that's frustrating. Let me think about how we handle the transition."
- Does not proactively offer a plan — waits to see if the professional proposes one
- If a specific plan is proposed (handover timeline, communication to team, check-in in two weeks): receptive — "That sounds reasonable, let's do that"
- If the professional stays vague: vague in return — the conversation produces warmth but no action
- At some point says: "I want to make sure you're set up well — what do you need from me specifically?" — this is the opening to make the concrete ask
- The correct outcome: an agreed handover timeline, a commitment to communicate the re-entry to the team, and a check-in date
`,
  },

]
