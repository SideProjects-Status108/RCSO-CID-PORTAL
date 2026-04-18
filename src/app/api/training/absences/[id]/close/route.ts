import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { canManageOnboarding } from '@/lib/training/access'
import { closeAbsenceAndExtend, fetchAbsenceById } from '@/lib/training/absences'

type CloseBody = {
  end_date?: string | null
}

/**
 * PATCH /api/training/absences/[id]/close
 *
 * Closes an absence. Training writers only. Computes days_missed, extends
 * the DIT's expected_graduation_date, and flips suspended -> active.
 */
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!canManageOnboarding(session.profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await ctx.params

  let body: CloseBody = {}
  try {
    body = (await request.json().catch(() => ({}))) as CloseBody
  } catch {
    body = {}
  }

  const endDate = body.end_date ?? null
  if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return NextResponse.json({ error: 'end_date must be YYYY-MM-DD' }, { status: 400 })
  }

  const existing = await fetchAbsenceById(id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const result = await closeAbsenceAndExtend({
      absenceId: id,
      endDate,
      closedBy: session.user.id,
    })
    revalidatePath(`/training/dit-files/${existing.dit_record_id}`)
    return NextResponse.json({
      ok: true,
      absence: result.absence,
      days_missed: result.daysMissed,
      new_expected_graduation_date: result.newExpectedGraduationDate,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to close absence'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
