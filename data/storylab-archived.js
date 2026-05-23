// ─── Archived: Storylab 30-Day Program ───────────────────────────────────────
// Preserved for potential future use. Replaced by Daily Rep in the active app.

export const MISSIONS = [
  { day: 1,  title: 'First Words',      prompt: 'Tell me what you do — but make me care',                                               locked: false },
  { day: 2,  title: 'The Hook',         prompt: 'Tell me about your week. Start with the most interesting moment',                       locked: false },
  { day: 3,  title: 'Show Don\'t Tell', prompt: 'Describe a place that matters to you without naming it',                                locked: false },
  { day: 4,  title: 'The Middle',       prompt: 'Tell me about a time something didn\'t go as planned',                                  locked: false },
  { day: 5,  title: 'Endings',          prompt: 'Finish this: "The thing I didn\'t expect was..."',                                      locked: false },
  { day: 6,  title: 'Your Voice',       prompt: 'Tell me something you believe that most people don\'t',                                  locked: false },
  { day: 7,  title: 'Texture',          prompt: 'Tell me about something small that happened this week — make me feel like I was there',  locked: false },
  ...Array.from({ length: 23 }, (_, i) => ({ day: i + 8, title: `Day ${i + 8}`, prompt: '', locked: true })),
]
