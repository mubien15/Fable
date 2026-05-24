export const LEADERSHIP_SCENARIOS = [

  {
    id: 'leadership-underperformance-first',
    track: 'leadership',
    title: 'The First Underperformance Conversation',
    difficulty_default: 'medium',
    userRole: 'Manager with a direct report who is consistently underdelivering',
    counterpartRole: 'A junior team member — not lazy, but struggling. They may be unaware of how serious the situation is, or they may be dealing with something personal they haven\'t shared.',
    context: `Your direct report has missed three consecutive deadlines over the past 6 weeks. The work quality when delivered is acceptable but consistently late. You have mentioned it informally twice in your weekly check-ins but nothing has changed. This is the first formal conversation. You genuinely like this person and want them to succeed — but you also cannot let this continue.`,
    challenge: 'This conversation must be clear enough that the person understands this is serious — not another informal mention — but human enough that they don\'t shut down or feel attacked. The trap is being so kind that the message doesn\'t land, or so blunt that the person becomes defensive or upset.',
    context_short: 'Three missed deadlines in 6 weeks. You\'ve mentioned it informally twice. This is the first formal conversation — they need to know that.',
    good_outcome: 'Your report understands this is serious, not another casual mention. You leave with a specific, time-bound improvement plan — and you heard something you didn\'t know.',
    watch_out_for: [
      'Being so kind the conversation doesn\'t register as formal — it must land as a step change',
      'Missing the information about extra workload they\'ve been quietly absorbing',
      'Leaving without a concrete time-bound commitment, not just a feeling of resolution',
    ],
    opening_line: "Hi. You said you wanted to meet properly — outside the usual check-in. Is everything okay?",
    coaching_focus: [
      'Being specific about the behaviour (lateness) without attacking the person',
      'Checking whether there is something you don\'t know — don\'t assume it\'s just performance',
      'Making the stakes clear without being threatening',
      'Ending with a concrete plan, not just a feeling',
    ],
    system_prompt_addition: `
## Counterpart Behaviour Guide
Play the direct report as follows:
- Initially tense and slightly defensive ("I know the last few weeks have been tough but...")
- Reveal partway through that they have been covering for a colleague who left, taking on extra work without telling anyone
- This is important: the manager may not have known this. Test whether they respond with genuine curiosity or bulldoze through with the prepared script
- If the manager acknowledges this new information and adjusts their approach: become more open and collaborative
- If the manager ignores it and continues with the formal script: become quieter and more withdrawn (signal they've lost the person)
- There should still be a clear agreement at the end — the extra workload is a contributing factor, not an excuse for the missed deadlines
`,
  },

  {
    id: 'leadership-underperformance-repeat',
    track: 'leadership',
    title: 'When It Happens Again: Raising the Stakes',
    difficulty_default: 'hard',
    userRole: 'Manager — this is the second formal conversation after the first one didn\'t produce lasting change',
    counterpartRole: 'The same direct report. They improved for two weeks after the first conversation, then slipped back. They know this conversation is coming.',
    context: `Four weeks after your first formal underperformance conversation, the pattern has returned. Two more missed deadlines, one piece of work that had to be redone by another team member. You had put in place a simple check-in structure and agreed milestones. They met the milestones for two weeks then stopped. You now need to escalate the conversation — clearly, respectfully, and with the next steps involving HR.`,
    challenge: 'This is harder than the first conversation because both of you know the history. You need to be honest that the situation has escalated without making the person feel it\'s over. You also need to formally document the conversation and reference HR involvement — which changes the tone significantly.',
    context_short: 'Four weeks after the first formal conversation, the pattern is back. Two more missed deadlines. HR involvement is now the appropriate next step.',
    good_outcome: 'Your report understands the escalation, knows what the PIP involves, and leaves with clarity about the path forward — and real consequences if it doesn\'t change.',
    watch_out_for: [
      'Treating it like the first conversation — this is a different, higher-stakes moment',
      'Leading with HR and documentation before establishing human context',
      'Letting them relitigate whether the first conversation was fair',
    ],
    opening_line: "Yeah. I figured this was coming.",
    coaching_focus: [
      'Acknowledging genuine progress before naming the regression — this is not soft, it\'s accurate',
      'Being explicit about the escalation (HR involvement) without it sounding like a threat',
      'Keeping the person\'s dignity intact while being completely clear',
      'Closing with a specific Performance Improvement Plan outline, not vague commitments',
    ],
    system_prompt_addition: `
## Counterpart Behaviour Guide
Play the direct report as follows:
- Comes in already knowing this is serious — quieter and more guarded than last time
- First response: "I know. I don't have a good explanation. I thought I had it figured out and then it slipped again."
- This is not resistance — this is someone who is struggling genuinely. Test whether the manager responds with humanity or just procedure
- If the manager leads with HR and documentation immediately: the person shuts down ("Am I being fired?") — test how the manager recovers
- The correct sequence is: acknowledge the effort, name the regression, explain the escalation in context, then introduce the PIP
- At some point the person will ask: "Is there still a path forward here?" — this is the critical moment. The manager must answer honestly and specifically, not vaguely reassuringly
`,
  },

  {
    id: 'leadership-critical-feedback',
    track: 'leadership',
    title: 'Delivering Feedback Someone Doesn\'t Want to Hear',
    difficulty_default: 'medium',
    userRole: 'Senior Manager giving feedback to a peer-level colleague or a confident junior',
    counterpartRole: 'A high-performer who has a blind spot — they communicate in a way that alienates colleagues, but they are unaware of it and consider themselves a strong communicator.',
    context: `A colleague — technically excellent, ambitious, well-regarded by leadership — has been getting feedback from the team that they are dismissive in meetings, interrupt frequently, and make junior team members feel their ideas aren't valued. Three people have raised this with you informally. The colleague trusts you. You are not their line manager but they have asked you for honest feedback as a mentor.`,
    challenge: 'This person does not think they have a problem. Telling them they do — with specific examples — will likely trigger defensiveness. The goal is not to force agreement in this conversation, but to plant something that makes them genuinely reflect. The trap is softening the message so much that they leave thinking \'well, a few people had a bad day.\'',
    context_short: 'A high-performer has a blind spot — dismissive in meetings, interrupts colleagues. Three people raised it. They trust you enough to ask for honest feedback.',
    good_outcome: 'They leave genuinely reflecting — not agreeing, but taking it seriously. You planted something real without making it a verdict.',
    watch_out_for: [
      'Softening it to a compliment-with-caveat so the message gets buried',
      'Not having a specific example ready when they ask for one — and they will',
      'Accepting their rationalisation ("that was just a stressful week") and moving on',
    ],
    opening_line: "Thanks for making time for this. I've been wanting to get your honest read — you always give it to me straight.",
    coaching_focus: [
      'Framing feedback as investment, not criticism',
      'Using specific examples without it sounding like a case file against them',
      'Managing their defensive reaction without backing down',
      'Leaving the door open — not forcing agreement, but not letting them dismiss it either',
    ],
    system_prompt_addition: `
## Counterpart Behaviour Guide
Play the high-performer as follows:
- Initially open and appreciative — they asked for this conversation
- First reaction to the feedback: surprised, slightly defensive ("I had no idea — I don't think I come across that way")
- Second layer: start to rationalise ("Maybe in that specific meeting but that was a stressful week")
- If the manager backs down: accept the rationalisation with relief and move on — they have wasted the conversation
- If the manager holds the feedback with compassion: become more genuinely reflective, ask for a specific example
- The pivot moment is when they ask "Can you give me a specific example?" — this is real engagement. The manager must have one ready.
- End: not full agreement, but genuine "I need to think about this" — that is the successful outcome
`,
  },

]
