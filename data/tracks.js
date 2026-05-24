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
    tagline: 'Deliver findings with confidence. Hold your position under pressure. Stay calm when the regulator is in the room.',
    description: 'The conversations that separate a credible auditor from a capable one. Practise holding findings, managing senior pushback, and staying composed under scrutiny.',
    icon: '🔍',
    scenarios: [...AUDIT_SCENARIOS, ...extAudit],
  },
  {
    id: 'consulting',
    title: 'Consulting & Client Work',
    tagline: 'Turn difficult client moments into trust. Win pitches on value, not price. Protect your team without losing the room.',
    description: 'The conversations that define professional services careers. Practise owning mistakes, holding scope, and winning on value rather than discount.',
    icon: '💼',
    scenarios: [...CONSULTING_SCENARIOS, ...extConsulting],
  },
  {
    id: 'leadership',
    title: 'People Leadership',
    tagline: 'Have the conversations most managers avoid. Give feedback that actually changes behaviour. Handle redundancy with dignity.',
    description: 'The conversations that define whether someone is a manager or a leader. Practise underperformance, redundancy, and the feedback that actually lands.',
    icon: '🤝',
    scenarios: [...LEADERSHIP_SCENARIOS, ...extLeadership],
  },
]
