import 'server-only'

import { createServiceRoleClient } from '@/lib/supabase/admin'

export type VarkOption = {
  id: string
  label: string
  display_order: number
  weights: { v: number; a: number; r: number; k: number }
}

export type VarkQuestion = {
  id: string
  prompt: string
  display_order: number
  options: VarkOption[]
}

export type VarkScores = { v: number; a: number; r: number; k: number }

export type PublicSurveyContext = {
  surveyId: string
  status: 'pending' | 'completed' | 'expired'
  expiresAt: string
  ditName: string | null
  questions: VarkQuestion[]
}

/**
 * Load the public survey page context by token. Uses the service-role client
 * because the caller is unauthenticated.
 *
 * Returns null when the token is unknown or the service role is not
 * configured (local dev without env vars).
 */
export async function fetchPublicSurveyByToken(
  token: string
): Promise<PublicSurveyContext | null> {
  const admin = createServiceRoleClient()
  if (!admin) return null

  const { data: survey } = await admin
    .from('dit_surveys')
    .select('id, status, expires_at, dit_record_id')
    .eq('token', token)
    .maybeSingle()
  if (!survey) return null

  const row = survey as {
    id: string
    status: 'pending' | 'completed' | 'expired'
    expires_at: string
    dit_record_id: string
  }

  let ditName: string | null = null
  const { data: ditRec } = await admin
    .from('dit_records')
    .select('user_id')
    .eq('id', row.dit_record_id)
    .maybeSingle()
  if (ditRec) {
    const userId = (ditRec as { user_id: string }).user_id
    const { data: profile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle()
    ditName = (profile as { full_name?: string } | null)?.full_name ?? null
  }

  const { data: questions } = await admin
    .from('dit_survey_questions')
    .select('id, prompt, display_order')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  const questionRows = (questions ?? []) as Array<{
    id: string
    prompt: string
    display_order: number
  }>
  const questionIds = questionRows.map((q) => q.id)

  let options: Array<{
    id: string
    question_id: string
    label: string
    display_order: number
    weights: unknown
  }> = []
  if (questionIds.length > 0) {
    const { data: optRows } = await admin
      .from('dit_survey_options')
      .select('id, question_id, label, display_order, weights')
      .in('question_id', questionIds)
      .order('display_order', { ascending: true })
    options = (optRows ?? []) as typeof options
  }

  const optionsByQuestion = new Map<string, VarkOption[]>()
  for (const o of options) {
    const w = (o.weights ?? {}) as Record<string, unknown>
    const parsed: VarkOption = {
      id: o.id,
      label: o.label,
      display_order: o.display_order,
      weights: {
        v: Number(w.v ?? 0),
        a: Number(w.a ?? 0),
        r: Number(w.r ?? 0),
        k: Number(w.k ?? 0),
      },
    }
    const list = optionsByQuestion.get(o.question_id) ?? []
    list.push(parsed)
    optionsByQuestion.set(o.question_id, list)
  }

  const shaped: VarkQuestion[] = questionRows.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    display_order: q.display_order,
    options: optionsByQuestion.get(q.id) ?? [],
  }))

  return {
    surveyId: row.id,
    status: row.status,
    expiresAt: row.expires_at,
    ditName,
    questions: shaped,
  }
}

/**
 * Submit survey answers. Validates the token, ensures the survey is still
 * pending and unexpired, writes responses, computes scores, and flips status.
 *
 * Accepts { questionId -> optionId } as answers. All questions must be
 * answered. No answer may reference an unknown question/option pairing.
 */
export async function submitPublicSurvey(params: {
  token: string
  answers: Record<string, string>
  narrative?: string | null
}): Promise<
  | { ok: true; scores: VarkScores; dominant: Array<keyof VarkScores> }
  | { ok: false; error: string; status?: number }
> {
  const admin = createServiceRoleClient()
  if (!admin) return { ok: false, error: 'Survey service not configured', status: 500 }

  const { data: survey } = await admin
    .from('dit_surveys')
    .select('id, status, expires_at')
    .eq('token', params.token)
    .maybeSingle()
  if (!survey) return { ok: false, error: 'Survey not found', status: 404 }
  const row = survey as {
    id: string
    status: 'pending' | 'completed' | 'expired'
    expires_at: string
  }
  if (row.status === 'completed') {
    return { ok: false, error: 'Survey already completed', status: 409 }
  }
  if (row.status === 'expired' || new Date(row.expires_at) < new Date()) {
    return { ok: false, error: 'Survey link expired', status: 410 }
  }

  const { data: questions } = await admin
    .from('dit_survey_questions')
    .select('id')
    .eq('is_active', true)
  const questionIds = new Set(
    ((questions ?? []) as Array<{ id: string }>).map((q) => q.id)
  )

  const answers = Object.entries(params.answers)
  if (answers.length === 0) {
    return { ok: false, error: 'No answers submitted', status: 400 }
  }
  if (answers.length < questionIds.size) {
    return { ok: false, error: 'Please answer every question', status: 400 }
  }
  for (const [qid] of answers) {
    if (!questionIds.has(qid)) {
      return { ok: false, error: 'Unknown question in submission', status: 400 }
    }
  }

  const optionIds = answers.map(([, oid]) => oid)
  const { data: optionRows } = await admin
    .from('dit_survey_options')
    .select('id, question_id, weights')
    .in('id', optionIds)
  const optionMap = new Map(
    ((optionRows ?? []) as Array<{
      id: string
      question_id: string
      weights: Record<string, unknown>
    }>).map((o) => [o.id, o])
  )

  const scores: VarkScores = { v: 0, a: 0, r: 0, k: 0 }
  for (const [qid, oid] of answers) {
    const opt = optionMap.get(oid)
    if (!opt) {
      return { ok: false, error: 'Unknown option in submission', status: 400 }
    }
    if (opt.question_id !== qid) {
      return { ok: false, error: 'Option does not match question', status: 400 }
    }
    scores.v += Number(opt.weights?.v ?? 0)
    scores.a += Number(opt.weights?.a ?? 0)
    scores.r += Number(opt.weights?.r ?? 0)
    scores.k += Number(opt.weights?.k ?? 0)
  }

  // Clear any prior responses for idempotency; responses table has a unique
  // (survey_id, question_id) constraint.
  await admin.from('dit_survey_responses').delete().eq('survey_id', row.id)

  const responseRows = answers.map(([qid, oid]) => ({
    survey_id: row.id,
    question_id: qid,
    option_id: oid,
  }))
  const { error: insertErr } = await admin
    .from('dit_survey_responses')
    .insert(responseRows)
  if (insertErr) {
    return { ok: false, error: insertErr.message, status: 500 }
  }

  const narrative = (params.narrative ?? '').trim().slice(0, 2000) || null
  await admin
    .from('dit_surveys')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      scores,
      narrative,
      learning_style: scores,
    })
    .eq('id', row.id)

  const max = Math.max(scores.v, scores.a, scores.r, scores.k)
  const dominant = (['v', 'a', 'r', 'k'] as Array<keyof VarkScores>).filter(
    (k) => scores[k] === max && max > 0
  )

  return { ok: true, scores, dominant }
}

/** Coordinator-facing survey summary (authenticated path). */
export type VarkCoordinatorView = {
  surveyId: string
  status: 'pending' | 'completed' | 'expired'
  expiresAt: string
  completedAt: string | null
  scores: VarkScores | null
  dominant: Array<keyof VarkScores>
  narrative: string | null
}

export async function fetchVarkForDitRecord(
  ditRecordId: string
): Promise<VarkCoordinatorView | null> {
  const admin = createServiceRoleClient()
  if (!admin) return null

  const { data: survey } = await admin
    .from('dit_surveys')
    .select('id, status, expires_at, completed_at, scores, narrative')
    .eq('dit_record_id', ditRecordId)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!survey) return null
  const row = survey as {
    id: string
    status: 'pending' | 'completed' | 'expired'
    expires_at: string
    completed_at: string | null
    scores: Record<string, unknown> | null
    narrative: string | null
  }

  let scores: VarkScores | null = null
  if (row.scores) {
    scores = {
      v: Number(row.scores.v ?? 0),
      a: Number(row.scores.a ?? 0),
      r: Number(row.scores.r ?? 0),
      k: Number(row.scores.k ?? 0),
    }
  }
  const dominant: Array<keyof VarkScores> = []
  if (scores) {
    const max = Math.max(scores.v, scores.a, scores.r, scores.k)
    if (max > 0) {
      for (const key of ['v', 'a', 'r', 'k'] as const) {
        if (scores[key] === max) dominant.push(key)
      }
    }
  }

  return {
    surveyId: row.id,
    status: row.status,
    expiresAt: row.expires_at,
    completedAt: row.completed_at,
    scores,
    dominant,
    narrative: row.narrative,
  }
}
