import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import {
  assertUserOnPairing,
  isTrainingStaff,
} from '@/lib/training/api-auth'
import {
  createDeficiencyForm,
  fetchDeficiencyFormsForCoordinator,
  fetchDeficiencyFormsForPairing,
} from '@/lib/training/queries'
import type { DeficiencyForm } from '@/types/training'

export async function GET(request: Request) {
  const session = await getSessionUserWithProfile()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const status = url.searchParams.get('status')?.trim()
  const pairingId = url.searchParams.get('pairing_id')?.trim()

  try {
    let forms: DeficiencyForm[]
    if (pairingId) {
      if (!isTrainingStaff(session.profile.role)) {
        const ok = await assertUserOnPairing(session.user.id, pairingId)
        if (!ok) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
      forms = await fetchDeficiencyFormsForPairing(pairingId)
      if (status) {
        forms = forms.filter((f) => f.status === status)
      }
    } else {
      if (!isTrainingStaff(session.profile.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      forms = await fetchDeficiencyFormsForCoordinator(status || undefined)
    }
    return NextResponse.json({ forms })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to list deficiency forms'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Partial<DeficiencyForm>
  try {
    body = (await request.json()) as Partial<DeficiencyForm>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.pairing_id || !body.weekly_session_id) {
    return NextResponse.json({ error: 'pairing_id and weekly_session_id are required' }, { status: 400 })
  }
  const flagged = body.competencies_flagged
  if (!Array.isArray(flagged) || flagged.length === 0) {
    return NextResponse.json({ error: 'At least one competency must be flagged' }, { status: 400 })
  }

  try {
    const form = await createDeficiencyForm(body)
    return NextResponse.json({ form })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to create deficiency form'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
