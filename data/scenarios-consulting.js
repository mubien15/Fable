export const CONSULTING_SCENARIOS = [

  {
    id: 'consulting-missed-deadline',
    track: 'consulting',
    title: 'The Missed Deadline Call',
    difficulty_default: 'medium',
    userRole: 'Senior Consultant or Manager at a professional services firm',
    counterpartRole: 'Client — Head of Risk at a mid-sized bank. They were expecting the deliverable yesterday. They are not furious yet, but they are losing patience.',
    context: `Your team was supposed to deliver the draft risk framework document yesterday. A key team member was sick, and the work is now 48 hours behind. The client has sent a follow-up email asking for a status update. You are calling them before they escalate to your partner.`,
    challenge: 'You need to be honest about the delay without over-explaining or making excuses, maintain the client\'s confidence in your team, and agree a new timeline that you can actually deliver on. The worst outcomes are: blaming your team member, making a promise you can\'t keep, or being so apologetic you seem incompetent.',
    card_blurb: 'Own the delay, recover the confidence, get a committed new timeline.',
    context_short: 'Your team missed a deliverable by 48 hours. The client knows. You\'re calling before they escalate.',
    good_outcome: 'The client feels heard, you\'ve owned the delay cleanly, and you leave with a specific new deadline they believe in.',
    watch_out_for: [
      'Over-explaining — one clear reason is enough, three reasons sounds like excuses',
      'Making a deadline promise you\'re not certain you can keep',
      'Ignoring the signal that this is the "second time" — that pattern matters',
    ],
    opening_line: "Hi. I was wondering when I'd hear from you.",
    coaching_focus: [
      'Owning the situation without over-apologising',
      'Not over-explaining or making excuses (one reason, not three)',
      'Offering a concrete solution immediately after acknowledging the problem',
      'Rebuilding confidence through tone and decisiveness, not just words',
    ],
    system_prompt_addition: `
## Counterpart Behaviour Guide
Play the client as follows:
- Starts measured but clearly expecting a real explanation
- If the consultant over-apologises or blames the team: become cooler, more formal ("I appreciate the explanation but I need to know when I'll have it")
- If the consultant makes a vague promise ("soon" or "as fast as we can"): push back directly ("I need a specific date and time")
- If the consultant is clear, owns it briefly, and offers a concrete new deadline: warm up, accept it, but note: "I'll need to flag this internally — it's the second time there's been a timing issue"
- This last line is important: it signals there is a history here. See how the consultant handles that.
`,
  },

  {
    id: 'consulting-unhappy-client',
    track: 'consulting',
    title: 'The Unhappy Client',
    difficulty_default: 'hard',
    userRole: 'Engagement Manager',
    counterpartRole: 'Client — CFO who is unhappy with the quality of the Phase 1 report your team delivered. She has specific complaints.',
    context: `Your team delivered a Phase 1 current-state assessment for a regulatory compliance transformation programme. The CFO has called you in for a meeting. She feels the report is too generic, doesn't reflect the specific context of their business, and reads like a template rather than bespoke analysis. She is right — at least partially. The team did rush the last section.`,
    challenge: 'You need to hear her out fully, acknowledge what is legitimate without throwing your team under the bus, and agree on a remediation path — ideally without triggering a formal complaint or fee dispute. The trap is being defensive, which will escalate things.',
    card_blurb: 'Turn a client complaint into a repaired relationship — without grovelling.',
    context_short: 'The CFO thinks your Phase 1 report is generic and templated. She\'s right — at least partially. The Phase 2 extension is at risk.',
    good_outcome: 'The CFO feels heard, you\'ve owned what\'s yours without throwing the team under the bus, and you leave with a specific remediation plan she believes in.',
    watch_out_for: [
      'Getting defensive before she\'s finished — cuts off the information you need',
      'Vague acknowledgment ("I hear your concerns") without owning the specific failure',
      'Agreeing to everything she asks without checking what\'s actually deliverable',
    ],
    opening_line: "Thanks for coming in. I'll be direct — I've read the Phase 1 report properly, and I have some real concerns about what was delivered.",
    coaching_focus: [
      'Active listening — letting the client finish before responding',
      'Distinguishing legitimate criticism from perception issues',
      'Acknowledging fault without catastrophising or grovelling',
      'Pivoting from problem to solution without dismissing the complaint',
    ],
    system_prompt_addition: `
## Counterpart Behaviour Guide
Play the CFO as follows:
- Comes in with prepared examples: "On page 14, the benchmark you used is from a 2021 report — that's not current. And the recommendations in section 4 look identical to what I've seen in other firms' reports."
- She is factually right about at least one of these points
- If the consultant interrupts or gets defensive: become more formal and colder, signals she is considering escalating
- If the consultant lets her finish and acknowledges the valid points: start to soften but still expect a concrete remediation plan
- Key test: does the consultant try to defend the template approach? If yes, push harder. If they acknowledge it and pivot to solutions, accept it — but say: "I want this resolved before we move to Phase 2."
- Do not accept vague commitments. Push for: what specifically will be improved, by when, and who will review it.
`,
  },

  {
    id: 'consulting-scope-creep',
    track: 'consulting',
    title: 'Pushing Back on Scope Creep',
    difficulty_default: 'medium',
    userRole: 'Senior Manager on a consulting engagement',
    counterpartRole: 'Client project lead — friendly, well-intentioned, but keeps adding requests as if they are small favours.',
    context: `You are three weeks into a 10-week engagement. The original scope was a gap assessment against OSFI B-20 guidelines. The client has now asked your team to also: review their model risk governance framework, produce a board-ready summary deck, and attend two additional steering committee meetings. None of this was in the original Statement of Work. Individually each request sounds small. Together they represent roughly 3 additional weeks of work.`,
    challenge: 'The client is friendly and doesn\'t think they\'re doing anything wrong — they genuinely see these as small add-ons. You need to name the pattern professionally, protect your team\'s capacity, and either get a scope change agreed or get clear agreement to deprioritise something else.',
    card_blurb: 'Name the pattern, quantify the impact, protect the engagement.',
    context_short: 'Three weeks in, the client has added what amounts to three extra weeks of work — one "small" request at a time.',
    good_outcome: 'The client understands what\'s in and out of scope, and you\'ve agreed either a change order or a clear trade-off on priorities.',
    watch_out_for: [
      'Being too indirect — naming scope creep requires naming it, not hinting',
      'Framing it purely as a commercial issue, which makes you sound transactional',
      'Agreeing to "just this one" without addressing the pattern',
    ],
    opening_line: "Oh good timing — I was actually about to message you. I've got a few more things I'd like to fold into the project while we have you. Shouldn't be too much extra.",
    coaching_focus: [
      'Naming scope creep without making the client feel accused',
      'Quantifying the impact (time, effort) rather than just saying \'it\'s out of scope\'',
      'Offering a solution: change order, or trade-off',
      'Protecting the relationship while protecting the engagement',
    ],
    system_prompt_addition: `
## Counterpart Behaviour Guide
Play the client lead as follows:
- Genuinely doesn't see the problem at first: "These are just small additions — I didn't think they'd be a big deal"
- When confronted with the cumulative picture: starts to understand but still tries to minimise ("the board deck won't take long, surely")
- If the consultant is vague about the impact: agree to everything and move on (the user failed — flag in feedback that vagueness enables scope creep)
- If the consultant quantifies clearly (e.g., "these three items together represent about 3 weeks of unplanned effort"): take it more seriously, ask what options there are
- Be open to a change order but make clear the internal approval process will take time — test whether the consultant has a short-term bridge solution
`,
  },

  {
    id: 'consulting-invoice',
    track: 'consulting',
    title: 'The Overdue Invoice Conversation',
    difficulty_default: 'medium',
    userRole: 'Engagement Manager or Senior Manager',
    counterpartRole: 'Client procurement or finance contact — not the business sponsor, the person who processes invoices. They are not hostile, just bureaucratic.',
    context: `An invoice for €85,000 is now 45 days overdue. Your payment terms are 30 days. You have sent two email reminders. The engagement is ongoing and you do not want to damage the relationship with the business sponsor. But your firm's finance team is pushing for escalation. You are calling the procurement contact to resolve this.`,
    challenge: 'This conversation feels awkward because money is involved and you don\'t want to seem aggressive. But being too soft means the invoice won\'t be paid. You need to be clear, professional, and get a committed payment date — not a vague \'we\'ll look into it.\'',
    card_blurb: 'Have the money conversation directly — and get a date, not a vague promise.',
    context_short: 'An €85,000 invoice is 45 days overdue. There\'s a vague "query" on it. You need a specific payment commitment before you leave this call.',
    good_outcome: 'You\'ve understood the actual reason for the delay, resolved it, and left with a committed payment date — not "we\'ll look into it."',
    watch_out_for: [
      'Accepting "there\'s a query on it" without finding out what the query actually is',
      'Being so polite about the money that you leave without a date',
      'Agreeing to reissue the invoice without confirming a specific payment date afterwards',
    ],
    opening_line: "Finance and procurement, Alex speaking.",
    coaching_focus: [
      'Being direct about money without being aggressive',
      'Getting a specific commitment (date, amount) not a vague promise',
      'Understanding the real reason for the delay without accepting it as an excuse',
      'Knowing when to escalate and how to signal that without threatening',
    ],
    system_prompt_addition: `
## Counterpart Behaviour Guide
Play the procurement contact as follows:
- Polite but unhelpful at first: "Let me check the system... yes, I can see it's flagged. There's a query on it from our end."
- The 'query' is vague — test whether the consultant asks what specifically the query is
- If pushed for specifics: "The cost centre code on the invoice doesn't match our current structure — it was updated in January"
- This is a fixable issue but it requires the consultant to take action (reissue the invoice with correct code)
- If the consultant asks for a committed payment date after resolving the code issue: give a date 10 business days out
- If the consultant accepts "we'll process it as soon as we can": do not give a date (vague response to vague request)
`,
  },

  {
    id: 'consulting-pitch',
    track: 'consulting',
    title: 'The RFP Pitch: Winning the Client',
    difficulty_default: 'hard',
    userRole: 'Manager or Senior Manager presenting in an oral pitch for a new mandate',
    counterpartRole: 'A panel of three: the CFO (sceptical of consulting value), the CRO (technically sharp, will test your knowledge), and the Head of Procurement (focused on price and delivery).',
    context: `You are presenting in the final round of an RFP. Your firm is competing against two others to win a 6-month regulatory transformation programme for a mid-sized Canadian bank. The scope involves OSFI guideline alignment and an internal audit transformation. Your proposal is strong but your price is 15% higher than the cheapest competitor. You have 20 minutes to present and 15 minutes of Q&A.`,
    challenge: 'You need to articulate your differentiated value clearly enough that the 15% premium feels justified. The panel will push on price, timelines, and why your firm is better than competitors. You cannot name competitors directly. You need to be confident, specific, and commercially astute.',
    card_blurb: 'Justify your premium in a room of sceptics — on value, not discount.',
    context_short: 'Final round RFP pitch. Your fee is 15% higher than the cheapest competitor. 20 minutes, a sharp three-person panel, and a price question you can\'t duck.',
    good_outcome: 'The panel feels you understood their specific problem. You differentiated on insight and experience — and held the price under pressure.',
    watch_out_for: [
      'Opening with firm credentials instead of the client\'s problem',
      'Discounting or matching competitors on price — it signals you don\'t believe in your own value',
      'Giving vague answers to sharp technical questions from the CRO',
    ],
    opening_line: "[CFO]: Good afternoon. We've reviewed your written proposal. You have twenty minutes, then we'll open it up. Whenever you're ready.",
    coaching_focus: [
      'Opening with impact — not a firm biography',
      'Differentiating on specifics, not generic claims (\'we\'re the best\')',
      'Handling the price objection without discounting',
      'Answering sharp technical questions confidently and concisely',
      'Closing with a clear ask',
    ],
    system_prompt_addition: `
## Counterpart Behaviour Guide
Play all three panel members, rotating naturally — prefix each with the speaker role in brackets:
- **[CFO]**: challenges value early ("We've had consultants before and the recommendations never get implemented — why would this be different?") and returns to price at the end
- **[CRO]**: asks a specific technical question about OSFI B-13 or OSFI E-21 guidelines to test depth of knowledge ("Can you walk me through how you'd approach a maturity assessment against E-21?")
- **[Head of Procurement]**: focuses on timeline and resource ("How many FTEs are you committing to this engagement, and what's your bench strength if someone leaves mid-project?")
If the presenter gives vague answers, the panel becomes more sceptical and asks follow-up challenges.
If the presenter is specific and confident, the panel nods along but the CFO still pushes on price at the end — this is unavoidable.
IMPORTANT: If the presenter tries to win on price (discounting or matching competitors), the [CFO] should call it out as a red flag ("If you're cutting price before the engagement starts, what does that say about how you'll manage scope?"). The correct approach is to reframe value, not discount. Reward this in feedback.
`,
  },

]
