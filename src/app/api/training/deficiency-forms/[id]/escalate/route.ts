import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { addDeficiencyAction, fetchDeficiencyForm } from '@/lib/training/queries'
import { requireCoordinator, requireJsonSession } from '@/lib/training/api-auth'

type Body = {
  level?: 'sgt' | 'lt'
  meeting_date?: string | null
  action_notes?: string | null
  additional_notes?: string | null
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireJsonSession()
  if (!gate.ok) return gate.response
  if (!(await requireCoordinator(gate.session.profile.role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: formId } = await ctx.params
  let body: Body = {}
  try {
    body = (await request.json()) as Body
  } catch {
    body = {}
  }

  const level = body.level === 'lt' ? 'lt' : 'sgt'
  const status = level === 'lt' ? 'escalated_to_lt' : 'escalated_to_sgt'
  const action_type = level === 'lt' ? 'escalate_to_lt' : 'escalate_to_sgt'
  const eventId = `stub-${crypto.randomUUID()}`

  try {
    await fetchDeficiencyForm(formId)
    await addDeficiencyAction({
      deficiency_form_id: formId,
      action_level: 'coordinator',
      action_type,
      actor_id: gate.session.user.id,
      action_notes: body.action_notes?.trim() || null,
      meeting_date: body.meeting_date?.trim() || null,
      meeting_attendees: ['FTO Sgt', 'Coordinator', 'FTO', 'DIT'],
      calendar_meeting_id: eventId,
    })

    const supabase = await createClient()
    const patch: Record<string, unknown> = { status }
    if (body.additional_notes !== undefined) {
      patch.additional_notes = body.additional_notes
    }
    const { error } = await supabase.from('deficiency_forms').update(patch).eq('id', formId)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, calendar_meeting_id: eventId, status })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to escalate'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
