import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { UserRole, type UserRoleValue } from '@/lib/auth/roles'
import {
  isMockRcsoLocalEmail,
  MOCK_ACCOUNT_SPECS,
  MOCK_PAIRING_PLAN,
} from '@/lib/admin/mock-data-definitions'
import type { MockAccountWithPassword } from '@/lib/admin/mock-data-types'

const EXPL_SAMPLE =
  'Structured coaching notes for this rating during mock CID training seed — meets minimum length.'

function personnelRoleLabel(role: UserRoleValue): string {
  switch (role) {
    case UserRole.supervision_admin:
      return 'Supervision (admin scope)'
    case UserRole.supervision:
      return 'Supervision'
    case UserRole.fto_coordinator:
      return 'FTO coordinator'
    case UserRole.fto:
      return 'Field training officer'
    case UserRole.dit:
      return 'Detective in training'
    case UserRole.detective:
      return 'Detective'
    case UserRole.admin:
      return 'Administrator'
    default:
      return role
  }
}

function randomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => chars[b % chars.length]!).join('')
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}

/** Monday (local) of the calendar week containing `d`. */
function mondayOfWeekContaining(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = x.getDay()
  const delta = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + delta)
  return x
}

const ACTIVITY_TEMPLATE_SEED: {
  activity_name: string
  category: string
  required_exposures_phase_1: number
  required_exposures_phase_2: number
  required_exposures_phase_3: number
}[] = [
  {
    activity_name: 'Death Investigation',
    category: 'Major',
    required_exposures_phase_1: 2,
    required_exposures_phase_2: 2,
    required_exposures_phase_3: 1,
  },
  {
    activity_name: 'Search Warrant Execution',
    category: 'Major',
    required_exposures_phase_1: 1,
    required_exposures_phase_2: 2,
    required_exposures_phase_3: 1,
  },
  {
    activity_name: 'Interview (Witness)',
    category: 'Core',
    required_exposures_phase_1: 3,
    required_exposures_phase_2: 3,
    required_exposures_phase_3: 2,
  },
  {
    activity_name: 'Crime Scene Photography',
    category: 'Core',
    required_exposures_phase_1: 2,
    required_exposures_phase_2: 2,
    required_exposures_phase_3: 1,
  },
  {
    activity_name: 'Felony Arrest Processing',
    category: 'Core',
    required_exposures_phase_1: 1,
    required_exposures_phase_2: 2,
    required_exposures_phase_3: 1,
  },
]

const EXPOSURE_ROLES = ['observer', 'assistant', 'lead'] as const

async function ensureActivityTemplates(svc: SupabaseClient): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  for (const row of ACTIVITY_TEMPLATE_SEED) {
    const { data: existing } = await svc
      .from('training_activity_templates')
      .select('id')
      .eq('activity_name', row.activity_name)
      .maybeSingle()
    if (existing?.id) {
      map.set(row.activity_name, String(existing.id))
      continue
    }
    const { data: ins, error } = await svc
      .from('training_activity_templates')
      .insert({
        ...row,
        description: 'Seeded for CID Portal mock training data.',
      })
      .select('id')
      .single()
    if (error || !ins) throw new Error(`Activity template insert failed: ${row.activity_name}: ${error?.message}`)
    map.set(row.activity_name, String(ins.id))
  }
  return map
}

async function listAllAuthUsers(svc: SupabaseClient) {
  const out: { id: string; email?: string }[] = []
  let page = 1
  for (;;) {
    const { data, error } = await svc.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(error.message)
    const batch = data.users ?? []
    out.push(...batch.map((u) => ({ id: u.id, email: u.email ?? undefined })))
    if (batch.length < 200) break
    page += 1
  }
  return out
}

export async function getMockDataStatus(svc: SupabaseClient): Promise<{
  seeded: boolean
  mock_user_count: number
}> {
  const users = await listAllAuthUsers(svc)
  const mock = users.filter((u) => isMockRcsoLocalEmail(u.email))
  return { seeded: mock.length > 0, mock_user_count: mock.length }
}

export async function seedMockTrainingData(svc: SupabaseClient): Promise<{
  accounts: MockAccountWithPassword[]
  pairings_created: number
  dit_records_created: number
  exposures_created: number
  weekly_sessions_created: number
  competency_scores_created: number
}> {
  const status = await getMockDataStatus(svc)
  if (status.mock_user_count > 0) {
    throw new Error(
      `Mock users already exist (${status.mock_user_count}). Purge mock data first, then seed again.`
    )
  }

  const accounts: MockAccountWithPassword[] = []
  const idByEmail: Record<string, string> = {}

  for (const spec of MOCK_ACCOUNT_SPECS) {
    const password = randomPassword()
    const { data: created, error } = await svc.auth.admin.createUser({
      email: spec.email,
      password,
      email_confirm: true,
      user_metadata: { mock_data: true, full_name: spec.full_name },
    })
    if (error || !created.user) {
      throw new Error(`auth.createUser failed for ${spec.email}: ${error?.message ?? 'unknown'}`)
    }
    const id = created.user.id
    idByEmail[spec.email] = id

    const phoneCell = `615-555-0${String(100 + accounts.length).slice(-3)}`
    const { error: pErr } = await svc.from('profiles').insert({
      id,
      role: spec.role,
      full_name: spec.full_name,
      badge_number: spec.badge_number,
      phone_cell: phoneCell,
      phone_office: null,
      unit: 'CID',
      is_active: true,
    })
    if (pErr) {
      await svc.auth.admin.deleteUser(id)
      throw new Error(`profiles insert failed for ${spec.email}: ${pErr.message}`)
    }

    const { error: dirErr } = await svc.from('personnel_directory').insert({
      user_id: id,
      full_name: spec.full_name,
      badge_number: spec.badge_number,
      role_label: personnelRoleLabel(spec.role),
      system_role: spec.role,
      unit: 'CID',
      assignment: null,
      phone_cell: phoneCell,
      phone_office: null,
      email: spec.email,
      photo_url: null,
      is_active: true,
      notes: 'Mock CID directory row (portal test data)',
    })
    if (dirErr) {
      await svc.from('profiles').delete().eq('id', id)
      await svc.auth.admin.deleteUser(id)
      throw new Error(`personnel_directory insert failed for ${spec.email}: ${dirErr.message}`)
    }

    accounts.push({ ...spec, password, id })
  }

  const coordinatorId = idByEmail['mock-ftoc-001@rcso.local']!
  const startDate = isoDate(addDays(new Date(), -14))

  const pairingIds: string[] = []
  const ditPhaseByEmail: Record<string, number> = {}
  for (const plan of MOCK_PAIRING_PLAN) {
    const ftoId = idByEmail[plan.ftoEmail]
    for (const ditEmail of plan.ditEmails) {
      ditPhaseByEmail[ditEmail] = plan.phase
      const ditId = idByEmail[ditEmail]
      const { data: row, error } = await svc
        .from('fto_pairings')
        .insert({
          fto_id: ftoId,
          dit_id: ditId,
          phase: plan.phase,
          start_date: startDate,
          end_date: null,
          is_active: true,
          notes: 'Mock pairing — CID Portal test data',
          created_by: coordinatorId,
        })
        .select('id')
        .single()
      if (error || !row) throw new Error(`fto_pairings insert failed: ${error?.message}`)
      pairingIds.push(String(row.id))
    }
  }

  const ditEmails = MOCK_ACCOUNT_SPECS.filter((s) => s.role === UserRole.dit).map((s) => s.email)
  const ditRecordByUserId: Record<string, string> = {}
  for (const email of ditEmails) {
    const userId = idByEmail[email]
    const phase = ditPhaseByEmail[email] ?? 1
    const { data: dr, error } = await svc
      .from('dit_records')
      .insert({
        user_id: userId,
        current_phase: phase,
        start_date: startDate,
        graduation_date: null,
        status: 'active',
        created_by: coordinatorId,
      })
      .select('id')
      .single()
    if (error || !dr) throw new Error(`dit_records insert failed for ${email}: ${error?.message}`)
    ditRecordByUserId[userId] = String(dr.id)
  }

  const tplByName = await ensureActivityTemplates(svc)
  const templateIds = [...tplByName.values()]
  let exposuresCreated = 0
  const ditUserIds = ditEmails.map((e) => idByEmail[e])
  for (const ditUserId of ditUserIds) {
    const ditRecordId = ditRecordByUserId[ditUserId]!
    const pairing = MOCK_PAIRING_PLAN.find((p) => p.ditEmails.some((e) => idByEmail[e] === ditUserId))
    const ftoId = pairing ? idByEmail[pairing.ftoEmail] : idByEmail['mock-fto-001@rcso.local']!
    const n = 3 + (ditUserId.charCodeAt(0) % 3)
    for (let i = 0; i < n; i++) {
      const tid = templateIds[(i + ditUserId.length) % templateIds.length]!
      const role = EXPOSURE_ROLES[i % EXPOSURE_ROLES.length]!
      const exposureDate = isoDate(addDays(new Date(), -10 - i * 2))
      const { error } = await svc.from('training_activity_exposures').insert({
        dit_record_id: ditRecordId,
        activity_template_id: tid,
        fto_id: ftoId,
        exposure_date: exposureDate,
        case_complaint_number: `2024-${String(1000 + exposuresCreated).padStart(4, '0')}`,
        role,
        duration_minutes: 60 + i * 15,
        fto_notes: 'Mock exposure entry for workflow testing.',
      })
      if (error) throw new Error(`training_activity_exposures insert: ${error.message}`)
      exposuresCreated += 1
    }
  }

  const { data: masters, error: mErr } = await svc
    .from('competency_masters')
    .select('key, label, category, sort_order')
    .order('sort_order', { ascending: true })
  if (mErr || !masters?.length) throw new Error(`competency_masters read failed: ${mErr?.message}`)

  const lastWeekMonday = addDays(mondayOfWeekContaining(new Date()), -7)
  const lastWeekSunday = addDays(lastWeekMonday, 6)
  const wStart = isoDate(lastWeekMonday)
  const wEnd = isoDate(lastWeekSunday)

  let weeklySessionsCreated = 0
  let competencyScoresCreated = 0

  const { data: pairingRows, error: prErr } = await svc
    .from('fto_pairings')
    .select('id, fto_id')
    .in('id', pairingIds)
  if (prErr || !pairingRows) throw new Error(`pairing reload failed: ${prErr?.message}`)

  for (const pr of pairingRows) {
    const pairingId = String((pr as { id: string }).id)
    const ftoId = String((pr as { fto_id: string }).fto_id)
    const { data: sess, error: sErr } = await svc
      .from('weekly_training_sessions')
      .insert({
        pairing_id: pairingId,
        week_start_date: wStart,
        week_end_date: wEnd,
        status: 'submitted',
        submitted_by: ftoId,
        submitted_at: new Date().toISOString(),
        approved_by: null,
        approved_at: null,
      })
      .select('id')
      .single()
    if (sErr || !sess) throw new Error(`weekly_training_sessions insert: ${sErr?.message}`)
    weeklySessionsCreated += 1
    const sessionId = String(sess.id)

    const keys = masters.map((row) => String((row as { key: string }).key))
    const skip = new Set(keys.filter((_, idx) => idx % 5 === 0).slice(0, 5))
    const scoreCycle = [4, 3, 2, 5, 1, 4, 3, 3, 4, 2, 5, 4, 3, 1, 2, 4, 3, 5, 4, 2]
    let si = pairingId.charCodeAt(0) % scoreCycle.length
    const scoreRows: Record<string, unknown>[] = []
    for (const m of masters) {
      const key = String((m as { key: string }).key)
      if (skip.has(key)) continue
      const label = String((m as { label: string }).label)
      const category = String((m as { category: string }).category)
      const score = scoreCycle[si % scoreCycle.length]!
      si += 1
      const explanation_required = score === 1 || score === 2 || score === 5
      scoreRows.push({
        session_id: sessionId,
        competency_key: key,
        competency_label: label,
        category,
        score,
        explanation: explanation_required ? EXPL_SAMPLE : null,
        explanation_required,
        prior_week_score: null,
      })
    }
    if (scoreRows.length) {
      const { error: scErr } = await svc.from('weekly_competency_scores').insert(scoreRows)
      if (scErr) throw new Error(`weekly_competency_scores insert: ${scErr.message}`)
      competencyScoresCreated += scoreRows.length
    }

    const scoredKeys = new Set(scoreRows.map((r) => String(r.competency_key)))
    const unobservedRows = masters
      .filter((m) => !scoredKeys.has(String((m as { key: string }).key)))
      .map((m) => ({
        session_id: sessionId,
        competency_key: String((m as { key: string }).key),
        competency_label: String((m as { label: string }).label),
        days_since_last_observed: null as number | null,
      }))
    if (unobservedRows.length) {
      const { error: uErr } = await svc.from('unobserved_competencies').insert(unobservedRows)
      if (uErr) throw new Error(`unobserved_competencies insert: ${uErr.message}`)
    }
  }

  console.info('[mock-data] SEED complete', new Date().toISOString(), {
    users: accounts.length,
    pairings: pairingIds.length,
    exposures: exposuresCreated,
    weeklySessions: weeklySessionsCreated,
    scores: competencyScoresCreated,
  })

  return {
    accounts,
    pairings_created: pairingIds.length,
    dit_records_created: ditEmails.length,
    exposures_created: exposuresCreated,
    weekly_sessions_created: weeklySessionsCreated,
    competency_scores_created: competencyScoresCreated,
  }
}

export async function purgeMockTrainingData(svc: SupabaseClient): Promise<{
  users_deleted: number
  pairings_deleted: number
}> {
  const users = await listAllAuthUsers(svc)
  const mockUsers = users.filter((u) => isMockRcsoLocalEmail(u.email))
  const ids = mockUsers.map((u) => u.id)
  if (ids.length === 0) {
    return { users_deleted: 0, pairings_deleted: 0 }
  }

  const orFilter = `fto_id.in.(${ids.join(',')}),dit_id.in.(${ids.join(',')})`
  const { data: pairings, error: pListErr } = await svc.from('fto_pairings').select('id').or(orFilter)
  if (pListErr) throw new Error(`list pairings: ${pListErr.message}`)
  const pairingIds = (pairings ?? []).map((r) => String((r as { id: string }).id))

  if (pairingIds.length) {
    const { error: delP } = await svc.from('fto_pairings').delete().in('id', pairingIds)
    if (delP) throw new Error(`delete pairings: ${delP.message}`)
  }

  const { error: delPd } = await svc.from('personnel_directory').delete().in('user_id', ids)
  if (delPd) throw new Error(`delete personnel_directory: ${delPd.message}`)
  const { error: delPdEmail } = await svc
    .from('personnel_directory')
    .delete()
    .ilike('email', 'mock-%@rcso.local')
  if (delPdEmail) throw new Error(`delete personnel_directory by email: ${delPdEmail.message}`)

  const { error: delDr } = await svc.from('dit_records').delete().in('user_id', ids)
  if (delDr) throw new Error(`delete dit_records: ${delDr.message}`)

  let deleted = 0
  for (const id of ids) {
    const { error } = await svc.auth.admin.deleteUser(id)
    if (error) {
      console.error('[mock-data] deleteUser failed', id, error.message)
    } else {
      deleted += 1
    }
  }

  console.info('[mock-data] PURGE complete', new Date().toISOString(), {
    users_deleted: deleted,
    pairings_deleted: pairingIds.length,
  })

  return { users_deleted: deleted, pairings_deleted: pairingIds.length }
}
