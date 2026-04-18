import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { requireJsonSession } from '@/lib/training/api-auth'
import { trainingFullRead } from '@/lib/training/access'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireJsonSession()
  if (!gate.ok) return gate.response
  const { id } = await ctx.params

  const supabase = await createClient()

  // Authorization: training staff OR the DIT themselves.
  if (!trainingFullRead(gate.session.profile.role)) {
    const { data: dit } = await supabase
      .from('dit_records')
      .select('user_id')
      .eq('id', id)
      .maybeSingle()
    if (!dit || String((dit as { user_id: string }).user_id) !== gate.session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { data: survey, error } = await supabase
    .from('dit_surveys')
    .select('status, expires_at, completed_at, learning_style')
    .eq('dit_record_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!survey) {
    return NextResponse.json(
      {
        status: 'pending',
        completed_count: 0,
        pending_count: 0,
        expires_at: null,
        learning_style_data: null,
      },
      { status: 200 }
    )
  }

  const row = survey as {
    status: 'pending' | 'completed' | 'expired'
    expires_at: string | null
    completed_at: string | null
    learning_style: Record<string, unknown> | null
  }

  // Survey response tracking (3-of-3 detail) lands when the public survey page
  // ships. For now we report 0/1 or 1/1 based on the survey row state.
  const completed = row.status === 'completed' ? 1 : 0
  const pending = row.status === 'pending' ? 1 : 0

  return NextResponse.json({
    status: row.status,
    completed_count: completed,
    pending_count: pending,
    expires_at: row.expires_at,
    learning_style_data: row.learning_style,
  })
}
