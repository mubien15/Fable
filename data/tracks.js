import { AUDIT_SCENARIOS } from './scenarios-audit'
import { CONSULTING_SCENARIOS } from './scenarios-consulting'

export const ALL_TRACKS = [
  {
    id: 'audit',
    title: 'Audit & Compliance',
    description: 'Deliver findings, manage pushback, and navigate regulatory conversations with senior stakeholders.',
    icon: '🔍',
    scenarios: AUDIT_SCENARIOS,
  },
  {
    id: 'consulting',
    title: 'Consulting & Client Management',
    description: 'Navigate the real conversations of a professional services career — from missed deadlines to winning pitches.',
    icon: '💼',
    scenarios: CONSULTING_SCENARIOS,
  },
  // More tracks will be added in Part 3
]
