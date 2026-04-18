import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { requireJsonSession, requireTrainingSessionEditor } from '@/lib/training/api-auth'
import { fetchWeeklySession } from '@/lib/training/queries'

/**
 * Flag (or clear) the DIT-absent state for a weekly training session.
 *
 * When dit_absent_flag is true:
 *   - Submit path skips the 1/2/5 explanation requirement.
 *   - Reviewer surfaces show a "DIT absent this week" banner instead of scores.
 *   - No deficiency auto-draft is generated.
 *
 * Body: { dit_absent_flag: boolean, dit_absent_reason?: string }
 */
type Body = {
  dit_absent_flag?: boolean
  dit_absent_reason?: string | null
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: session_id } = await ctx.params
  const gate = await requireJsonSession()
  if (!gate.ok) return gate.response

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const flag = body.dit_absent_flag === true
  const reason = flag ? (body.dit_absent_reason ?? '').toString().trim() || null : null

  try {
    const session = await fetchWeeklySession(session_id)
    const canEdit = await requireTrainingSessionEditor(
      gate.session.user.id,
      gate.session.profile.role,
      session.pairing_id
    )
    if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (session.status !== 'draft') {
      return NextResponse.json(
        { error: 'Absent flag can only change while the session is in draft' },
        { status: 409 }
      )
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('weekly_training_sessions')
      .update({
        dit_absent_flag: flag,
        dit_absent_reason: reason,
      })
      .eq('id', session_id)
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, dit_absent_flag: flag, dit_absent_reason: reason })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to toggle absent flag'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
