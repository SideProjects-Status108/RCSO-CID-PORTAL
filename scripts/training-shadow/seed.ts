/**
 * Seed the training-module shadow environment.
 *
 * Idempotent. Safe to run as many times as you want — every step
 * upserts on a stable key. Never touches a profile it didn't create
 * (every shadow profile is tagged via an app_metadata marker on the
 * auth user: { shadow: true, shadow_key: '<roster.key>' }).
 *
 * Usage:
 *   npm run training:seed-shadow
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL      = your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY     = service role key
 *   MAILSLURP_API_KEY             = MailSlurp API key
 *   TRAINING_SHADOW_PASSWORD      = shared dev password (default: RCSOCID964!)
 *
 * Output:
 *   .shadow-roster.local.json     gitignored file with
 *                                 { key, full_name, role, email, password,
 *                                   user_id, inbox_id, signup_url }
 *                                 so you can copy-paste creds for role-swap
 *                                 testing.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

import { config as loadEnv } from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { ensureInbox } from '../../src/lib/email/mailslurp'
import {
  SHADOW_DITS,
  SHADOW_ROSTER,
  resolveShadow,
  type ShadowPerson,
} from './roster'

loadEnv({ path: path.resolve(process.cwd(), '.env.local') })

const DEFAULT_PASSWORD = 'RCSOCID964!'
const PASSWORD = process.env.TRAINING_SHADOW_PASSWORD?.trim() || DEFAULT_PASSWORD
const ROSTER_OUTPUT = path.resolve(process.cwd(), '.shadow-roster.local.json')

type Credential = {
  key: string
  full_name: string
  role: string
  rank_title: string
  badge_number: string
  email: string
  password: string
  user_id: string
  inbox_id: string
  is_training_supervisor: boolean
}

function supa(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local',
    )
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * Find an existing shadow auth user for this roster key, or return null.
 * Matches on app_metadata.shadow_key which we set at creation time so
 * we never collide with real personnel records.
 */
async function findShadowUserByKey(
  client: SupabaseClient,
  key: string,
): Promise<{ id: string; email: string } | null> {
  // admin.listUsers paginates; we iterate until we find the key.
  let page = 1
  // PostgREST caps perPage at 1000 for the admin API.
  const perPage = 200
  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`listUsers failed: ${error.message}`)
    for (const u of data.users ?? []) {
      const meta = (u.app_metadata ?? {}) as Record<string, unknown>
      if (meta.shadow === true && meta.shadow_key === key) {
        return { id: u.id, email: u.email ?? '' }
      }
    }
    if (!data.users || data.users.length < perPage) return null
    page += 1
    if (page > 50) return null // safety net
  }
}

async function ensureShadowAuthUser(
  client: SupabaseClient,
  person: ShadowPerson,
  email: string,
): Promise<{ id: string; email: string; created: boolean }> {
  const existing = await findShadowUserByKey(client, person.key)
  if (existing) {
    // Keep the password and marker in sync on every run so we never
    // drift from what the seeder promises.
    const { error } = await client.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email,
      email_confirm: true,
      app_metadata: {
        shadow: true,
        shadow_key: person.key,
        roles_summary: [person.role],
      },
      user_metadata: {
        full_name: person.full_name,
        badge_number: person.badge_number,
      },
    })
    if (error) throw new Error(`updateUser ${person.key}: ${error.message}`)
    return { id: existing.id, email, created: false }
  }

  const { data, error } = await client.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    app_metadata: {
      shadow: true,
      shadow_key: person.key,
      roles_summary: [person.role],
    },
    user_metadata: {
      full_name: person.full_name,
      badge_number: person.badge_number,
    },
  })
  if (error || !data.user) {
    throw new Error(`createUser ${person.key}: ${error?.message ?? 'no user'}`)
  }
  return { id: data.user.id, email, created: true }
}

async function upsertProfile(
  client: SupabaseClient,
  person: ShadowPerson,
  userId: string,
): Promise<void> {
  const row: Record<string, unknown> = {
    id: userId,
    role: person.role,
    full_name: person.full_name,
    badge_number: person.badge_number,
    unit: person.unit ?? 'CID',
    is_active: true,
    is_training_supervisor: person.training_supervisor === true,
  }
  if (person.role === 'fto' || person.role === 'fto_coordinator') {
    row.fto_color = person.fto_color ?? null
  }

  const { error } = await client.from('profiles').upsert(row, { onConflict: 'id' })
  if (error) throw new Error(`upsert profile ${person.key}: ${error.message}`)

  // Enforce single-seat invariant for training_supervisor: unset flag
  // on any OTHER profile that carries it.
  if (person.training_supervisor === true) {
    const { error: clearErr } = await client
      .from('profiles')
      .update({ is_training_supervisor: false })
      .eq('is_training_supervisor', true)
      .neq('id', userId)
    if (clearErr) {
      throw new Error(
        `clear other training_supervisor seats for ${person.key}: ${clearErr.message}`,
      )
    }
  }
}

async function ensureDitRecord(
  client: SupabaseClient,
  ditUserId: string,
  startDate: string,
  status: 'active' | 'on_hold',
  createdBy: string,
): Promise<string> {
  const { data: existing } = await client
    .from('dit_records')
    .select('id')
    .eq('user_id', ditUserId)
    .maybeSingle()
  if (existing?.id) {
    await client
      .from('dit_records')
      .update({ start_date: startDate, status })
      .eq('id', existing.id)
    return String(existing.id)
  }
  const { data, error } = await client
    .from('dit_records')
    .insert({
      user_id: ditUserId,
      start_date: startDate,
      status,
      created_by: createdBy,
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(`create dit_record: ${error?.message}`)
  return String(data.id)
}

async function ensurePairing(
  client: SupabaseClient,
  ftoUserId: string,
  ditUserId: string,
  startDate: string,
  createdBy: string,
): Promise<string> {
  // Idempotent on (fto_id, dit_id, start_date, is_active=true).
  const { data: existing } = await client
    .from('fto_pairings')
    .select('id')
    .eq('fto_id', ftoUserId)
    .eq('dit_id', ditUserId)
    .eq('is_active', true)
    .maybeSingle()
  if (existing?.id) return String(existing.id)

  // Deactivate any prior active pairings for this DIT first so the
  // schedule grid / cert chain has a clean single active pairing.
  await client
    .from('fto_pairings')
    .update({ is_active: false, end_date: startDate })
    .eq('dit_id', ditUserId)
    .eq('is_active', true)

  const { data, error } = await client
    .from('fto_pairings')
    .insert({
      fto_id: ftoUserId,
      dit_id: ditUserId,
      start_date: startDate,
      is_active: true,
      created_by: createdBy,
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(`create pairing: ${error?.message}`)
  return String(data.id)
}

/**
 * Idempotent helper: shift a date by whole weeks.
 */
function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

async function ensureCompetencyKeys(client: SupabaseClient): Promise<string[]> {
  const { data, error } = await client
    .from('competency_masters')
    .select('key')
    .order('sort_order', { ascending: true })
  if (error) throw new Error(`competency_masters: ${error.message}`)
  return (data ?? []).map((r) => String((r as { key: string }).key))
}

async function ensureActivityTemplate(
  client: SupabaseClient,
  name: string,
  category: string,
): Promise<string> {
  const { data: existing } = await client
    .from('training_activity_templates')
    .select('id')
    .eq('activity_name', name)
    .maybeSingle()
  if (existing?.id) return String(existing.id)
  const { data, error } = await client
    .from('training_activity_templates')
    .insert({
      activity_name: name,
      category,
      required_exposures_phase_1: 1,
      required_exposures_phase_2: 2,
      required_exposures_phase_3: 1,
      description: null,
    })
    .select('id')
    .single()
  if (error || !data) {
    throw new Error(`activity template ${name}: ${error?.message}`)
  }
  return String(data.id)
}

/**
 * Seed a submitted+approved weekly session with realistic scores for
 * the given DIT/pairing on the given week. Idempotent on
 * (pairing_id, week_start_date).
 */
async function seedWeeklySession(params: {
  client: SupabaseClient
  pairing_id: string
  fto_id: string
  dit_id: string
  week_start_date: string
  competency_keys: string[]
  base_score: number
  weak_keys?: string[]
}): Promise<void> {
  const {
    client,
    pairing_id,
    fto_id,
    week_start_date,
    competency_keys,
    base_score,
    weak_keys = [],
  } = params
  const week_end_date = addDays(week_start_date, 6)

  const { data: existing } = await client
    .from('weekly_training_sessions')
    .select('id, status')
    .eq('pairing_id', pairing_id)
    .eq('week_start_date', week_start_date)
    .maybeSingle()

  let sessionId: string
  if (existing?.id) {
    sessionId = String(existing.id)
    await client
      .from('weekly_training_sessions')
      .update({
        status: 'approved',
        submitted_by: fto_id,
        submitted_at: new Date().toISOString(),
        approved_by: fto_id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
  } else {
    const { data, error } = await client
      .from('weekly_training_sessions')
      .insert({
        pairing_id,
        week_start_date,
        week_end_date,
        status: 'approved',
        submitted_by: fto_id,
        submitted_at: new Date().toISOString(),
        approved_by: fto_id,
        approved_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (error || !data) {
      throw new Error(`weekly_training_sessions: ${error?.message}`)
    }
    sessionId = String(data.id)
  }

  // Wipe and re-write scores for this session to stay idempotent.
  await client.from('weekly_competency_scores').delete().eq('session_id', sessionId)

  const weakSet = new Set(weak_keys)
  const rows = competency_keys.map((k) => {
    const score = weakSet.has(k) ? Math.max(1, base_score - 1) : base_score
    return {
      session_id: sessionId,
      competency_key: k,
      competency_label: k, // label isn't shown on the aggregate views; UI fetches label from masters
      category: 'INVESTIGATIVE CORE SKILLS',
      score,
      explanation: weakSet.has(k) ? 'Needs reinforcement — coaching in progress.' : null,
      explanation_required: weakSet.has(k),
    }
  })
  if (rows.length > 0) {
    const { error } = await client.from('weekly_competency_scores').insert(rows)
    if (error) throw new Error(`weekly_competency_scores: ${error.message}`)
  }
}

async function main() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('prod')) {
    // Soft guard; we don't have a reliable way to detect prod from inside
    // a Next/Supabase repo. Just warn loudly.
    console.warn(
      '\n[seed-shadow] WARNING: your Supabase URL contains "prod". Double-check you want to run the shadow seeder here.\n',
    )
  }

  const client = supa()
  const credentials: Credential[] = []

  console.info('[seed-shadow] provisioning MailSlurp inboxes + auth users…')
  const userByKey = new Map<string, string>()
  for (const person of SHADOW_ROSTER) {
    const inbox = await ensureInbox(`rcso-shadow:${person.key}`)
    const { id: userId, created } = await ensureShadowAuthUser(
      client,
      person,
      inbox.emailAddress,
    )
    await upsertProfile(client, person, userId)
    userByKey.set(person.key, userId)

    credentials.push({
      key: person.key,
      full_name: person.full_name,
      role: person.role,
      rank_title: person.rank_title,
      badge_number: person.badge_number,
      email: inbox.emailAddress,
      password: PASSWORD,
      user_id: userId,
      inbox_id: inbox.id,
      is_training_supervisor: person.training_supervisor === true,
    })
    console.info(
      `  ${created ? '+ created' : '· updated'}  ${person.full_name.padEnd(22)} ${person.role.padEnd(17)} ${inbox.emailAddress}`,
    )
  }

  const coordId = userByKey.get('murdock_coord')
  if (!coordId) throw new Error('Coordinator (murdock_coord) was not provisioned')

  console.info('\n[seed-shadow] seeding DIT records + pairings…')
  const ditRecordIds = new Map<string, string>()
  for (const d of SHADOW_DITS) {
    const person = resolveShadow(d.person_key)
    const ditUserId = userByKey.get(d.person_key)!
    const recordId = await ensureDitRecord(
      client,
      ditUserId,
      d.start_date,
      d.status,
      coordId,
    )
    ditRecordIds.set(d.person_key, recordId)
    console.info(
      `  ${person.full_name.padEnd(22)} start=${d.start_date}  status=${d.status}`,
    )

    if (d.current_fto_key) {
      const ftoUserId = userByKey.get(d.current_fto_key)!
      await ensurePairing(client, ftoUserId, ditUserId, d.start_date, coordId)
      console.info(
        `    paired with ${resolveShadow(d.current_fto_key).full_name}`,
      )
    }
  }

  // ---------------- McGee realistic history (9 weeks approved) -------------
  console.info('\n[seed-shadow] seeding McGee 9-week history…')
  const mcgeeUserId = userByKey.get('mcgee_dit')!
  const mcculloughId = userByKey.get('mccullough_fto')!
  const mcgeeDitRecord = ditRecordIds.get('mcgee_dit')!
  const mcgeeStart = '2026-02-09'

  const { data: mcgeePairing } = await client
    .from('fto_pairings')
    .select('id')
    .eq('fto_id', mcculloughId)
    .eq('dit_id', mcgeeUserId)
    .eq('is_active', true)
    .maybeSingle()
  const mcgeePairingId = String(mcgeePairing?.id ?? '')

  const competencies = await ensureCompetencyKeys(client)
  const weakOn = new Set(['time_management', 'report_writing_documentation'])
  const weakList = Array.from(weakOn)

  for (let w = 0; w < 9; w++) {
    const weekStart = addDays(mcgeeStart, w * 7)
    // Ramp scores from 3→4 across the program to feel realistic.
    const base = w < 3 ? 3 : 4
    await seedWeeklySession({
      client,
      pairing_id: mcgeePairingId,
      fto_id: mcculloughId,
      dit_id: mcgeeUserId,
      week_start_date: weekStart,
      competency_keys: competencies,
      base_score: base,
      weak_keys: w < 5 ? weakList : [],
    })
  }
  console.info('  9 weeks approved; week 10 intentionally LEFT UNSUBMITTED so you can submit it from the UI and watch the cert auto-draft.')

  // Sample activity exposures for McGee (a handful across categories).
  const actCrimeScene = await ensureActivityTemplate(
    client,
    'Crime Scene Response',
    'Scene Response',
  )
  const actInterview = await ensureActivityTemplate(
    client,
    'Interview — Suspect',
    'Interviews',
  )
  const actSubpoena = await ensureActivityTemplate(
    client,
    'Subpoena Drafted',
    'Legal Process',
  )
  const actWarrant = await ensureActivityTemplate(
    client,
    'Search Warrant Drafted',
    'Legal Process',
  )

  async function seedExposure(
    templateId: string,
    daysAfterStart: number,
    role: 'observer' | 'assistant' | 'lead',
    note: string,
  ) {
    await client.from('training_activity_exposures').insert({
      dit_record_id: mcgeeDitRecord,
      activity_template_id: templateId,
      fto_id: mcculloughId,
      exposure_date: addDays(mcgeeStart, daysAfterStart),
      role,
      duration_minutes: 90,
      fto_notes: note,
    })
  }
  // Pre-seed only if none exist yet (prevents duplicates on re-run).
  const { count: exposureCount } = await client
    .from('training_activity_exposures')
    .select('*', { count: 'exact', head: true })
    .eq('dit_record_id', mcgeeDitRecord)
  if ((exposureCount ?? 0) === 0) {
    await seedExposure(actCrimeScene, 3, 'observer', 'Residential burglary call-out; good scene walk-through.')
    await seedExposure(actCrimeScene, 22, 'assistant', 'Aggravated assault; assisted with evidence markers + photos.')
    await seedExposure(actCrimeScene, 45, 'lead', 'Led scene on B&E case; clean handoff to ID.')
    await seedExposure(actInterview, 10, 'observer', 'Suspect interview; observed structure + Miranda.')
    await seedExposure(actInterview, 38, 'lead', 'Led witness interview; solid rapport, needs tighter follow-up questions.')
    await seedExposure(actSubpoena, 17, 'assistant', 'Drafted subpoena for cell records.')
    await seedExposure(actWarrant, 30, 'assistant', 'Drafted SW for residence; reviewed by DA prior to submission.')
  }

  // A sample case + a call-out so stats populate on the DIT detail page.
  const { count: caseCount } = await client
    .from('case_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('dit_record_id', mcgeeDitRecord)
  if ((caseCount ?? 0) === 0) {
    await client.from('case_assignments').insert([
      {
        dit_record_id: mcgeeDitRecord,
        title: 'Aggravated Burglary — Maple St.',
        dit_role: 'assist',
        status: 'closed',
        assigned_by: mcculloughId,
        assigned_at: addDays(mcgeeStart, 21),
        closed_at: addDays(mcgeeStart, 55),
        notes: 'Closed by arrest; DIT assisted lead from scene through charging.',
      },
      {
        dit_record_id: mcgeeDitRecord,
        title: 'Theft of Firearm — CID-26-0188',
        dit_role: 'lead',
        status: 'open',
        assigned_by: mcculloughId,
        assigned_at: addDays(mcgeeStart, 52),
        notes: 'First lead case; on-going forensics.',
      },
    ])
  }
  const { count: callOutCount } = await client
    .from('call_out_logs')
    .select('*', { count: 'exact', head: true })
    .eq('dit_record_id', mcgeeDitRecord)
  if ((callOutCount ?? 0) === 0) {
    await client.from('call_out_logs').insert({
      dit_record_id: mcgeeDitRecord,
      responded_at: new Date(`${addDays(mcgeeStart, 28)}T03:14:00Z`).toISOString(),
      duration_minutes: 240,
      incident_type: 'Residential burglary in progress',
      case_number: 'CID-26-0145',
      off_duty: true,
      comp_time_eligible: true,
      responded_with: mcculloughId,
      notes: 'DIT rolled on 0314 call-out; performed scene walk and neighborhood canvass.',
      logged_by: mcculloughId,
    })
  }

  // One PBLE ('passed') so the tab populates.
  const { data: tpl } = await client
    .from('pto_pble_templates')
    .select('id, title, scenario_kind, rubric')
    .eq('scenario_kind', 'crime_scene')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (tpl?.id) {
    const { count: pbleCount } = await client
      .from('pto_pbles')
      .select('*', { count: 'exact', head: true })
      .eq('dit_record_id', mcgeeDitRecord)
    if ((pbleCount ?? 0) === 0) {
      const rubric = (tpl as { rubric: unknown }).rubric as Array<{
        key: string
        label?: string
      }>
      const scores = Array.isArray(rubric)
        ? rubric.map((r) => ({
            criterion_key: r.key,
            score: 4,
            notes: 'Solid performance; a couple of small refinements.',
          }))
        : []
      await client.from('pto_pbles').insert({
        dit_record_id: mcgeeDitRecord,
        template_id: (tpl as { id: string }).id,
        phase: 2,
        scenario_kind: 'crime_scene',
        title: (tpl as { title: string }).title,
        rubric: (tpl as { rubric: unknown }).rubric,
        rubric_scores: scores,
        status: 'passed',
        assigned_by: coordId,
        assigned_at: new Date(`${addDays(mcgeeStart, 35)}T15:00:00Z`).toISOString(),
        submitted_at: new Date(`${addDays(mcgeeStart, 42)}T15:00:00Z`).toISOString(),
        scored_by: coordId,
        scored_at: new Date(`${addDays(mcgeeStart, 44)}T15:00:00Z`).toISOString(),
        overall_notes: 'Passed with minor notes on evidence collection sequence.',
      })
    }
  }

  // ---------------- Arrington: weeks 1+2 approved --------------------------
  console.info('\n[seed-shadow] seeding Arrington weeks 1 + 2…')
  const arringtonUserId = userByKey.get('arrington_dit')!
  const { data: arrPairing } = await client
    .from('fto_pairings')
    .select('id')
    .eq('dit_id', arringtonUserId)
    .eq('is_active', true)
    .maybeSingle()
  if (arrPairing?.id) {
    const arrPairingId = String(arrPairing.id)
    const murdockId = userByKey.get('murdock_coord')!
    for (let w = 0; w < 2; w++) {
      await seedWeeklySession({
        client,
        pairing_id: arrPairingId,
        fto_id: murdockId,
        dit_id: arringtonUserId,
        week_start_date: addDays('2026-04-06', w * 7),
        competency_keys: competencies,
        base_score: 3,
        weak_keys: ['time_management'],
      })
    }
    console.info('  2 weeks approved; week 3 starts fresh in the UI.')
  }

  // ---------------- Write credentials file ---------------------------------
  fs.writeFileSync(
    ROSTER_OUTPUT,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        password: PASSWORD,
        people: credentials,
      },
      null,
      2,
    ),
  )
  console.info(`\n[seed-shadow] wrote ${ROSTER_OUTPUT}`)
  console.info('[seed-shadow] DONE')
}

main().catch((err) => {
  console.error('\n[seed-shadow] FAILED:', err)
  process.exit(1)
})
