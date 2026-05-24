import { AUDIT_SCENARIOS } from './scenarios-audit'
import { CONSULTING_SCENARIOS } from './scenarios-consulting'
import { LEADERSHIP_SCENARIOS } from './scenarios-leadership'
import { EXTENDED_SCENARIOS } from './scenarios-extended'

const extAudit      = EXTENDED_SCENARIOS.filter((s) => s.track === 'audit')
const extConsulting  = EXTENDED_SCENARIOS.filter((s) => s.track === 'consulting')
const extLeadership  = EXTENDED_SCENARIOS.filter((s) => s.track === 'leadership')

export const ALL_TRACKS = [
  {
    id: 'audit',
    title: 'Audit & Compliance',
    tagline: 'Control failures · Regulatory exams · Stakeholder pushback',
    description: 'Deliver findings, manage pushback, and navigate regulatory conversations with senior stakeholders.',
    icon: '🔍',
    scenarios: [...AUDIT_SCENARIOS, ...extAudit],
  },
  {
    id: 'consulting',
    title: 'Consulting & Client Work',
    tagline: 'Missed deadlines · Unhappy clients · Winning pitches',
    description: 'Navigate the real conversations of a professional services career — from missed deadlines to winning pitches.',
    icon: '💼',
    scenarios: [...CONSULTING_SCENARIOS, ...extConsulting],
  },
  {
    id: 'leadership',
    title: 'People Leadership',
    tagline: 'Underperformance · Redundancy · Compensation · Team trust',
    description: 'Have the conversations that define good management — feedback, underperformance, and building trust.',
    icon: '🤝',
    scenarios: [...LEADERSHIP_SCENARIOS, ...extLeadership],
  },
]
