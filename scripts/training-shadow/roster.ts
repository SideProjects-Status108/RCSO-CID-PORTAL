/**
 * Shadow-environment roster.
 *
 * Real RCSO CID personnel (names, badges, unit roles) but with
 * MailSlurp-provisioned fake emails and a single shared dev password
 * so the whole training workflow can be tested end-to-end without
 * ever touching a real inbox.
 *
 * Roster last edited: 2026-04-18.
 */

export type TrainingRole =
  | 'admin'
  | 'supervision_admin'
  | 'supervision'
  | 'fto_coordinator'
  | 'fto'
  | 'detective'
  | 'dit'

export type ShadowPerson = {
  /** Stable short key used as the MailSlurp inbox name + seed idempotency key. */
  key: string
  full_name: string
  badge_number: string
  rank_title: string
  role: TrainingRole
  /** Holds the training_supervisor seat (McPherson). */
  training_supervisor?: boolean
  unit?: string
  /** Optional 7-char hex; if unset the seeder assigns a default palette color. */
  fto_color?: string
}

export type ShadowDit = {
  /** References ShadowPerson.key */
  person_key: string
  start_date: string // ISO date
  /** 'active' | 'on_hold' */
  status: 'active' | 'on_hold'
  /** person_key of the currently-paired FTO (null when un-paired) */
  current_fto_key: string | null
}

export const SHADOW_ROSTER: ShadowPerson[] = [
  {
    key: 'sparks_capt',
    full_name: 'Todd Sparks',
    badge_number: '500',
    rank_title: 'Captain',
    role: 'supervision_admin',
    unit: 'CID',
  },
  {
    key: 'craig_lt',
    full_name: 'Steve Craig',
    badge_number: '501',
    rank_title: 'Lieutenant',
    role: 'supervision_admin',
    unit: 'CID',
  },
  {
    key: 'mcpherson_ts',
    full_name: 'Amanda McPherson',
    badge_number: '523',
    rank_title: 'Sergeant',
    role: 'supervision_admin',
    training_supervisor: true,
    unit: 'CID',
  },
  {
    key: 'burnett_sgt',
    full_name: 'Thomas Burnett',
    badge_number: '506',
    rank_title: 'Sergeant',
    role: 'supervision',
    unit: 'CID',
  },
  {
    key: 'murdock_coord',
    full_name: 'Jeremy Murdock',
    badge_number: '525',
    rank_title: 'Detective',
    role: 'fto_coordinator',
    unit: 'CID',
    fto_color: '#2563eb', // blue
  },
  {
    key: 'verbruggen_fto',
    full_name: 'Jeffery VerBruggen',
    badge_number: '518',
    rank_title: 'Detective',
    role: 'fto',
    unit: 'CID',
    fto_color: '#16a34a', // green
  },
  {
    key: 'overton_fto',
    full_name: 'Christina Overton',
    badge_number: '524',
    rank_title: 'Detective',
    role: 'fto',
    unit: 'CID',
    fto_color: '#c026d3', // fuchsia
  },
  {
    key: 'mccullough_fto',
    full_name: 'Derrick McCullough',
    badge_number: '519',
    rank_title: 'Detective',
    role: 'fto',
    unit: 'CID',
    fto_color: '#ea580c', // orange
  },
  {
    key: 'quintal_fto',
    full_name: 'Grant Quintal',
    badge_number: '522',
    rank_title: 'Detective',
    role: 'fto',
    unit: 'CID',
    fto_color: '#0d9488', // teal
  },
  {
    key: 'copeland_det',
    full_name: 'Breanna Copeland',
    badge_number: '505',
    rank_title: 'Detective',
    role: 'detective',
    unit: 'CID',
  },
  {
    key: 'mcgee_dit',
    full_name: 'Daniel McGee',
    badge_number: '520',
    rank_title: 'Detective',
    role: 'dit',
    unit: 'CID',
  },
  {
    key: 'arrington_dit',
    full_name: 'Matthew Arrington',
    badge_number: '514',
    rank_title: 'Detective',
    role: 'dit',
    unit: 'CID',
  },
  {
    key: 'olson_dit',
    full_name: 'Anna Olson',
    badge_number: '541',
    rank_title: 'Deputy',
    role: 'dit',
    unit: 'CID',
  },
]

export const SHADOW_DITS: ShadowDit[] = [
  // McGee: finishing the program (start + 10 weeks ≈ 2026-04-20). Paired with McCullough.
  {
    person_key: 'mcgee_dit',
    start_date: '2026-02-09',
    status: 'active',
    current_fto_key: 'mccullough_fto',
  },
  // Arrington: entering week 3 next week. Paired with Murdock (Coordinator).
  {
    person_key: 'arrington_dit',
    start_date: '2026-04-06',
    status: 'active',
    current_fto_key: 'murdock_coord',
  },
  // Olson: queued. Future start, no pairing yet.
  {
    person_key: 'olson_dit',
    start_date: '2026-05-11',
    status: 'active',
    current_fto_key: null,
  },
]

/** Resolves a person by key; throws if the key is unknown. */
export function resolveShadow(key: string): ShadowPerson {
  const p = SHADOW_ROSTER.find((x) => x.key === key)
  if (!p) throw new Error(`Unknown shadow person key: ${key}`)
  return p
}
