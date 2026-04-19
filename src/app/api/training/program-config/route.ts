import { NextResponse } from 'next/server'

import { requireJsonSession } from '@/lib/training/api-auth'
import { canEditProgramConfig } from '@/lib/training/access'
import { fetchProgramConfig, updateProgramConfig } from '@/lib/training/program-config'

export async function GET() {
  const gate = await requireJsonSession()
  if (!gate.ok) return gate.response
  const cfg = await fetchProgramConfig()
  return NextResponse.json({ config: cfg })
}

/**
 * PATCH /api/training/program-config
 * Body: Partial<TrainingProgramConfig>
 *
 * Writer-only. The DB CHECK constraints clamp all numeric ranges; we
 * forward the patch as-is and let Supabase reject invalid values.
 */
export async function PATCH(request: Request) {
  const gate = await requireJsonSession()
  if (!gate.ok) return gate.response
  if (!canEditProgramConfig(gate.session.profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const allowed = [
    'extension_days_first',
    'extension_days_subsequent',
    'quiz_amber_threshold',
    'quiz_red_threshold',
    'journal_nudge_days',
    'journal_flag_fto_days',
    'survey_expiry_days',
    'program_week_count',
  ] as const
  const patch: Record<string, number> = {}
  for (const key of allowed) {
    if (body[key] != null) {
      const n = Number(body[key])
      if (!Number.isFinite(n) || !Number.isInteger(n)) {
        return NextResponse.json(
          { error: `${key} must be an integer` },
          { status: 400 },
        )
      }
      patch[key] = n
    }
  }

  try {
    const cfg = await updateProgramConfig(patch, gate.session.user.id)
    return NextResponse.json({ config: cfg })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 400 },
    )
  }
}
