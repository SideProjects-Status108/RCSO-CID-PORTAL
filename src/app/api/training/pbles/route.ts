import { NextResponse } from 'next/server'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { isTrainingWriter } from '@/lib/training/access'
import { assignPble, listPblesForDit } from '@/lib/training/pble-queries'
import { fetchDitRecordById } from '@/lib/training/queries'
import { createClient } from '@/lib/supabase/server'
import {
  PBLE_SCENARIO_KINDS,
  type PbleRubricCriterion,
  type PbleScenarioKind,
  type PbleTemplate,
} from '@/types/training'

// GET /api/training/pbles?dit_record_id=...
//   Lists PBLEs for a DIT. RLS handles visibility.
//
// POST /api/training/pbles
//   body: {
//     dit_record_id, template_id?, phase, scenario_kind, title,
//     rubric?, due_at?
//   }
//   When template_id is provided we copy the template's rubric + title
//   unless the caller explicitly overrides them. Only training writers
//   may assign.

export async function GET(request: Request) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const ditRecordId = (url.searchParams.get('dit_record_id') ?? '').trim()
  if (!ditRecordId) {
    return NextResponse.json({ error: 'dit_record_id is required' }, { status: 400 })
  }
  try {
    const pbles = await listPblesForDit(ditRecordId)
    return NextResponse.json({ pbles })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to list PBLEs'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isTrainingWriter(session.profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: {
    dit_record_id?: string
    template_id?: string
    phase?: number
    scenario_kind?: PbleScenarioKind
    title?: string
    rubric?: PbleRubricCriterion[]
    due_at?: string
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const ditRecordId = body.dit_record_id?.trim()
  if (!ditRecordId) {
    return NextResponse.json({ error: 'dit_record_id is required' }, { status: 400 })
  }

  const record = await fetchDitRecordById(ditRecordId)
  if (!record) {
    return NextResponse.json({ error: 'DIT record not found' }, { status: 404 })
  }

  let phase = body.phase ?? record.current_phase
  let scenario = body.scenario_kind
  let title = body.title?.trim() ?? ''
  let rubric = body.rubric ?? []

  if (body.template_id) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('pto_pble_templates')
      .select('*')
      .eq('id', body.template_id)
      .maybeSingle()
    if (error || !data) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }
    const tpl = data as unknown as PbleTemplate & { rubric: PbleRubricCriterion[] }
    scenario = scenario ?? tpl.scenario_kind
    title = title || tpl.title
    rubric = rubric.length > 0 ? rubric : tpl.rubric
    phase = body.phase ?? tpl.recommended_phase
  }

  if (!scenario || !PBLE_SCENARIO_KINDS.includes(scenario)) {
    return NextResponse.json({ error: 'Invalid scenario_kind' }, { status: 400 })
  }
  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }
  if (![1, 2, 3].includes(phase)) {
    return NextResponse.json({ error: 'phase must be 1, 2, or 3' }, { status: 400 })
  }

  try {
    const pble = await assignPble({
      dit_record_id: ditRecordId,
      template_id: body.template_id ?? null,
      phase,
      scenario_kind: scenario,
      title,
      rubric,
      due_at: body.due_at?.trim() || null,
      assigned_by: session.user.id,
    })
    return NextResponse.json({ pble })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to assign PBLE'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
