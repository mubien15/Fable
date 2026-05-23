export const AUDIT_SCENARIOS = [

  {
    id: 'audit-control-failure',
    track: 'audit',
    title: 'Delivering a Control Failure Finding',
    difficulty_default: 'medium',
    userRole: 'Internal Auditor or GRC Consultant',
    counterpartRole: 'Process Owner — a mid-level manager who owns the control that failed. They are not malicious, just defensive and a bit embarrassed.',
    context: `You are in a one-on-one conversation with a Process Owner after completing fieldwork. You have identified that a key internal control — the four-eyes review on payment approvals — has not been operating for the past 6 months. Transactions above the €50,000 threshold were being approved by a single person. No fraud has occurred, but the control gap is real and must be reported.`,
    challenge: 'The Process Owner will likely minimise the issue, explain it away as a temporary gap, or push back on the severity. You need to deliver the finding clearly, maintain your objectivity, and get them to acknowledge the issue without damaging the relationship.',
    opening_line: "Hey, thanks for making time. You mentioned you had some feedback from the audit fieldwork?",
    coaching_focus: [
      "Using evidence, not judgment ('I observed X' not 'You failed to do X')",
      'Maintaining composure when pushed back on',
      'Separating the finding from the person',
      'Getting explicit acknowledgment without forcing a fight',
    ],
    system_prompt_addition: `
## Counterpart Behaviour Guide
Play the Process Owner as follows:
- Opening: slightly defensive, hoping it's not a big deal
- If the auditor is vague or soft: take advantage, minimise ("it was just a few months, nothing bad happened")
- If the auditor is accusatory or blunt: become more defensive, shut down ("I don't think that's a fair characterisation")
- If the auditor uses evidence and stays neutral: become more cooperative but still try to negotiate the severity rating
- Never immediately accept a 'High' severity finding — always push for 'Medium' first
- Occasionally introduce complexity: "We had a staff resignation that caused the gap" — test whether the auditor can acknowledge context while still maintaining the finding
`,
  },

  {
    id: 'audit-regulatory-noncompliance',
    track: 'audit',
    title: 'Regulatory Non-Compliance: Delivering the Hard News',
    difficulty_default: 'hard',
    userRole: 'GRC Manager or External Auditor',
    counterpartRole: "Head of Compliance at a bank — senior, experienced, and does not like being told their team missed something regulatory.",
    context: `During a regulatory compliance review, you have identified that the firm's transaction monitoring procedures do not meet the minimum requirements under the local AML regulation (equivalent to FINTRAC, FCA, or OSFI standards). Specifically, the lookback period for alerts is shorter than required, and there is no documented escalation path for high-risk alerts. This is a reportable gap that will likely appear in the external audit report.`,
    challenge: 'This is a senior stakeholder who may be embarrassed, dismissive, or try to reframe the finding as a \'documentation issue\' rather than a substantive compliance gap. You need to be firm, evidence-based, and clear about the consequences — without being adversarial.',
    opening_line: "I appreciate you making time today. I wanted to walk you through what we found in the transaction monitoring section before the report is finalised.",
    coaching_focus: [
      'Framing regulatory gaps without sounding accusatory',
      'Holding your position against a senior stakeholder',
      'Being clear about consequences (reportable finding) without catastrophising',
      'Inviting collaboration on remediation while not softening the finding itself',
    ],
    system_prompt_addition: `
## Counterpart Behaviour Guide
Play the Head of Compliance as follows:
- Initially professional but clearly tense — they know this conversation might not go well
- First response: try to reframe ("I think there may be a misunderstanding about how we apply the lookback period")
- If pushed: become more assertive, challenge your interpretation of the regulation
- Try at least once to suggest this is a "documentation gap" not a "substantive gap" — test whether the auditor accepts this framing
- If the auditor is very clear and evidence-based: grudgingly acknowledge but immediately pivot to remediation ("Okay, so what do we need to do to fix this before the report?")
- Do not become hostile, but maintain the persona of someone who is used to being the expert in the room
`,
  },

  {
    id: 'audit-finding-pushback',
    track: 'audit',
    title: 'Holding Your Ground: Auditee Disputes Your Finding',
    difficulty_default: 'hard',
    userRole: 'Lead Auditor',
    counterpartRole: 'CFO or Finance Director — powerful, articulate, and genuinely believes the finding is wrong.',
    context: `You have issued a draft audit finding rating a reconciliation control as 'High Risk.' The CFO has requested this meeting to challenge the rating. They believe the compensating controls in place mean the risk is actually 'Low.' You have reviewed their argument and believe they are partially right — the compensating controls do reduce the risk somewhat — but the underlying control weakness is still real and should be rated 'Medium' at minimum.`,
    challenge: 'This is a high-stakes negotiation. The CFO is senior to you in the organisation and is well-prepared. You need to demonstrate that you have genuinely considered their argument, be willing to move from High to Medium (which is defensible), but not capitulate to Low (which would misrepresent the risk).',
    opening_line: "Thank you for coming. I've reviewed your written response to the draft finding and I'd like to discuss it directly with you.",
    coaching_focus: [
      'Distinguishing genuine reconsideration from capitulation under pressure',
      'Conceding a point gracefully when the other side is partially right',
      'Holding a defensible position without appearing rigid',
      'Managing power dynamics — staying professional when someone senior challenges you',
    ],
    system_prompt_addition: `
## Counterpart Behaviour Guide
Play the CFO as follows:
- Well-prepared, cites specific compensating controls, speaks with authority
- Not hostile — this is professional disagreement, not a personal attack
- Will use phrases like "I think you may have missed..." or "In our view, the risk profile is..."
- If the auditor immediately backs down to 'Low': accept quickly and end the conversation — in the [COACH] line, tell them they capitulated under pressure and that this would not survive scrutiny
- If the auditor holds 'High' rigidly without engaging with the compensating controls argument: escalate, become more forceful
- If the auditor genuinely engages, acknowledges partial validity, and offers 'Medium' with clear rationale: accept 'Medium' professionally
- The correct outcome is Medium — reward the auditor who gets there with reasoning, not pressure
`,
  },

  {
    id: 'audit-closing-meeting',
    track: 'audit',
    title: 'Closing Meeting: Presenting Findings to Senior Stakeholders',
    difficulty_default: 'medium',
    userRole: 'Audit Lead presenting at closing meeting',
    counterpartRole: 'A room of three people: a defensive Process Owner, a neutral CFO, and a supportive Internal Audit Director. You will play all three.',
    context: `You are running the closing meeting for a completed internal audit. You have 4 findings: one High, two Mediums, one Low. The High finding relates to a control failure in the procurement process. The Process Owner in the room owns that finding and has already pushed back in writing. The CFO is neutral but busy. The Audit Director is supportive of your work.`,
    challenge: "You need to present all findings clearly and professionally, manage the Process Owner's defensiveness in a group setting, and close the meeting with agreed management actions — all without losing the room or getting drawn into a debate.",
    opening_line: "Good afternoon everyone. Thanks for joining the closing meeting for the Procurement Audit. I'll take about 20 minutes to walk through the findings, and then we'll confirm the management responses before we close.",
    coaching_focus: [
      'Presenting findings confidently to a mixed audience',
      'Managing a defensive stakeholder in a group setting without embarrassing them',
      'Keeping the meeting on track and outcome-focused',
      'Language that invites agreement on next steps without sounding weak',
    ],
    system_prompt_addition: `
## Counterpart Behaviour Guide
Play all three stakeholders, switching clearly between them — prefix each response with the speaker name in brackets e.g. [Process Owner]:
- **[Process Owner]**: interjects when their High finding comes up, tries to relitigate it in the room ("I'd like to note that we disagree with the severity rating")
- **[CFO]**: asks one sharp question about business impact ("What's the financial exposure here?") then stays quiet
- **[Audit Director]**: supportive but doesn't rescue the auditor — lets them handle the Process Owner's pushback themselves, may add a brief affirming comment at the end
Rotate between these voices naturally. The goal is to simulate a real closing meeting dynamic.
`,
  },

]
