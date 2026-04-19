import { NextResponse } from 'next/server'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { isTrainingWriter } from '@/lib/training/access'
import { canTransition, validateScores } from '@/lib/training/pble'
import { fetchPbleById, fetchPbleOwnerUserId, updatePble } from '@/lib/training/pble-queries'
import { PBLE_STATUSES, type PbleRubricScore, type PbleStatus } from '@/types/training'

// GET /api/training/pbles/[id]   — fetch a single PBLE
// PATCH /api/training/pbles/[id] — update status / scores
//
// Transition rules (enforced in canTransition + role gate here):
//   - Owning DIT may flip to in_progress, submitted (sets submitted_at),
//     or back from in_progress → assigned only if nothing has been scored.
//   - Training writers may: flip any valid successor; set rubric_scores
//     (validated against the PBLE's own rubric); on transition to
//     'scored' we stamp scored_by + scored_at.

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await context.params
  try {
    const pble = await fetchPbleById(id)
    if (!pble) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ pble })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to fetch PBLE'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params

  let body: {
    status?: PbleStatus
    rubric_scores?: PbleRubricScore[]
    overall_notes?: string | null
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const pble = await fetchPbleById(id)
  if (!pble) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const writer = isTrainingWriter(session.profile)
  const ownerUserId = await fetchPbleOwnerUserId(id)
  const isOwner = ownerUserId === session.user.id

  if (!writer && !isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (body.status) {
    if (!PBLE_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    if (!canTransition(pble.status, body.status)) {
      return NextResponse.json(
        { error: `Illegal transition ${pble.status} → ${body.status}` },
        { status: 400 },
      )
    }
    const ditCanDo: PbleStatus[] = ['in_progress', 'submitted', 'assigned']
    if (!writer && isOwner && !ditCanDo.includes(body.status)) {
      return NextResponse.json(
        { error: 'DIT may only move to in_progress / submitted / assigned' },
        { status: 403 },
      )
    }
  }

  if (body.rubric_scores) {
    if (!writer) {
      return NextResponse.json({ error: 'Only writers can score' }, { status: 403 })
    }
    const err = validateScores(pble.rubric, body.rubric_scores)
    if (err) return NextResponse.json({ error: err }, { status: 400 })
  }

  const patch: Parameters<typeof updatePble>[1] = {}
  if (body.status) patch.status = body.status
  if (body.rubric_scores) patch.rubric_scores = body.rubric_scores
  if ('overall_notes' in body) patch.overall_notes = body.overall_notes ?? null

  if (body.status === 'submitted' && !pble.submitted_at) {
    patch.submitted_at = new Date().toISOString()
  }
  if (body.status === 'scored') {
    patch.scored_by = session.user.id
    patch.scored_at = new Date().toISOString()
  }

  try {
    const updated = await updatePble(id, patch)
    return NextResponse.json({ pble: updated })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to update PBLE'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
