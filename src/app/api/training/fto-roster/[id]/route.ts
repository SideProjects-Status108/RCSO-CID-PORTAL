import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { requireJsonSession } from '@/lib/training/api-auth'
import { isTrainingWriter } from '@/lib/training/access'

/**
 * PATCH /api/training/fto-roster/[id]
 * Body: { fto_color?: string | null }
 *
 * Writer-only. Currently only updates fto_color. Color must be a 7-char
 * lower/upper-case hex (e.g. '#2563eb') or null to clear.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireJsonSession()
  if (!gate.ok) return gate.response
  if (!isTrainingWriter(gate.session.profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as {
    fto_color?: string | null
  }

  const patch: Record<string, unknown> = {}
  if ('fto_color' in body) {
    if (body.fto_color == null) {
      patch.fto_color = null
    } else {
      const raw = String(body.fto_color).trim()
      if (!/^#[0-9a-fA-F]{6}$/.test(raw)) {
        return NextResponse.json(
          { error: 'fto_color must be a 7-character hex string like #2563eb' },
          { status: 400 },
        )
      }
      patch.fto_color = raw
    }
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No supported fields' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select('id, full_name, badge_number, fto_color, role, is_active')
    .maybeSingle()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ profile: data })
}
