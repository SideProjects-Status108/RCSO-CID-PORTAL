import { UserRole } from '@/lib/auth/roles'

import type { MockAccountSpec } from '@/lib/admin/mock-data-types'

/** Fixed roster: 35 accounts. Emails must stay mock-*@rcso.local for safe purge. */
export const MOCK_ACCOUNT_SPECS: MockAccountSpec[] = [
  {
    email: 'mock-captain-001@rcso.local',
    full_name: 'Captain Robert Smith',
    role: UserRole.supervision_admin,
    badge_number: '1001',
  },
  {
    email: 'mock-lt-001@rcso.local',
    full_name: 'Lieutenant David Johnson',
    role: UserRole.supervision,
    badge_number: '1002',
  },
  {
    email: 'mock-sgt-001@rcso.local',
    full_name: 'Sergeant Michael Brown',
    role: UserRole.supervision,
    badge_number: '1003',
  },
  {
    email: 'mock-sgt-002@rcso.local',
    full_name: 'Sergeant Jennifer Davis',
    role: UserRole.supervision,
    badge_number: '1004',
  },
  {
    email: 'mock-sgt-003@rcso.local',
    full_name: 'Sergeant Christopher Miller',
    role: UserRole.supervision,
    badge_number: '1005',
  },
  {
    email: 'mock-sgt-004@rcso.local',
    full_name: 'Sergeant Amanda Wilson',
    role: UserRole.supervision,
    badge_number: '1006',
  },
  {
    email: 'mock-ftoc-001@rcso.local',
    full_name: 'Jeremy Murdock',
    role: UserRole.fto_coordinator,
    badge_number: '1007',
  },
  {
    email: 'mock-ftoc-002@rcso.local',
    full_name: 'Patricia Martinez',
    role: UserRole.fto_coordinator,
    badge_number: '1008',
  },
  {
    email: 'mock-fto-001@rcso.local',
    full_name: 'Field Training Officer James Garcia',
    role: UserRole.fto,
    badge_number: '1009',
  },
  {
    email: 'mock-fto-002@rcso.local',
    full_name: 'Field Training Officer Maria Rodriguez',
    role: UserRole.fto,
    badge_number: '1010',
  },
  {
    email: 'mock-fto-003@rcso.local',
    full_name: 'Field Training Officer Anthony Taylor',
    role: UserRole.fto,
    badge_number: '1011',
  },
  {
    email: 'mock-fto-004@rcso.local',
    full_name: 'Field Training Officer Lisa Anderson',
    role: UserRole.fto,
    badge_number: '1012',
  },
  {
    email: 'mock-fto-005@rcso.local',
    full_name: 'Field Training Officer Brian Thomas',
    role: UserRole.fto,
    badge_number: '1013',
  },
  {
    email: 'mock-fto-006@rcso.local',
    full_name: 'Field Training Officer Susan Jackson',
    role: UserRole.fto,
    badge_number: '1014',
  },
  {
    email: 'mock-fto-007@rcso.local',
    full_name: 'Field Training Officer Donald White',
    role: UserRole.fto,
    badge_number: '1015',
  },
  {
    email: 'mock-dit-001@rcso.local',
    full_name: 'Detective in Training Michael Lawrence',
    role: UserRole.dit,
    badge_number: '1016',
  },
  {
    email: 'mock-dit-002@rcso.local',
    full_name: 'Detective in Training Emily Harris',
    role: UserRole.dit,
    badge_number: '1017',
  },
  {
    email: 'mock-dit-003@rcso.local',
    full_name: 'Detective in Training Christopher Martin',
    role: UserRole.dit,
    badge_number: '1018',
  },
  {
    email: 'mock-dit-004@rcso.local',
    full_name: 'Detective in Training Jessica Thompson',
    role: UserRole.dit,
    badge_number: '1019',
  },
  {
    email: 'mock-dit-005@rcso.local',
    full_name: 'Detective in Training Kevin Garcia',
    role: UserRole.dit,
    badge_number: '1020',
  },
  {
    email: 'mock-dit-006@rcso.local',
    full_name: 'Detective in Training Rachel Lee',
    role: UserRole.dit,
    badge_number: '1021',
  },
  ...Array.from({ length: 12 }, (_, i) => ({
    email: `mock-det-${String(i + 1).padStart(3, '0')}@rcso.local`,
    full_name: `Detective Mock Unit ${i + 1}`,
    role: UserRole.detective,
    badge_number: String(1022 + i),
  })),
  {
    email: 'mock-ia-001@rcso.local',
    full_name: 'Investigative Assistant John Smith',
    role: UserRole.detective,
    badge_number: '1034',
  },
  {
    email: 'mock-ia-002@rcso.local',
    full_name: 'Investigative Assistant Sarah Wilson',
    role: UserRole.detective,
    badge_number: '1035',
  },
]

/** FTO id email → DIT id emails, phase */
export const MOCK_PAIRING_PLAN: { ftoEmail: string; ditEmails: string[]; phase: number }[] = [
  { ftoEmail: 'mock-fto-001@rcso.local', ditEmails: ['mock-dit-001@rcso.local', 'mock-dit-002@rcso.local'], phase: 1 },
  { ftoEmail: 'mock-fto-002@rcso.local', ditEmails: ['mock-dit-003@rcso.local'], phase: 2 },
  { ftoEmail: 'mock-fto-003@rcso.local', ditEmails: ['mock-dit-004@rcso.local', 'mock-dit-005@rcso.local'], phase: 1 },
  { ftoEmail: 'mock-fto-004@rcso.local', ditEmails: ['mock-dit-006@rcso.local'], phase: 2 },
]

export const MOCK_EMAIL_SUFFIX = '@rcso.local'
export const MOCK_EMAIL_PREFIX = 'mock-'

export function isMockRcsoLocalEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const e = email.toLowerCase()
  return e.startsWith(MOCK_EMAIL_PREFIX) && e.endsWith(MOCK_EMAIL_SUFFIX)
}
