import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import type { DeficiencyForm } from '@/types/training'

type PatchBody = {
  status?: DeficiencyForm['status']
  additional_notes?: string | null
  priority_level?: DeficiencyForm['priority_level']
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: PatchBody
  try {
    body = (await request.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const patch: Record<string, unknown> = {}
  if (body.status != null) patch.status = body.status
  if (body.additional_notes !== undefined) patch.additional_notes = body.additional_notes
  if (body.priority_level != null) patch.priority_level = body.priority_level

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { error } = await supabase.from('deficiency_forms').update(patch).eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
