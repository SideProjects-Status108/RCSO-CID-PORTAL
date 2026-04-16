import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import {
  fetchActivityExposuresForDit,
  getActivityProgressForTemplate,
  logActivityExposure,
} from '@/lib/training/queries'
import type { ActivityExposure } from '@/types/training'

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const dit_record_id = (url.searchParams.get('dit_record_id') ?? '').trim()
  const week_start = url.searchParams.get('week_start')?.trim()
  if (!dit_record_id) {
    return NextResponse.json({ error: 'dit_record_id is required' }, { status: 400 })
  }

  try {
    const exposures = await fetchActivityExposuresForDit(dit_record_id, week_start || undefined)
    return NextResponse.json({ exposures })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load exposures'
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

  let body: Partial<ActivityExposure>
  try {
    body = (await request.json()) as Partial<ActivityExposure>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const row = await logActivityExposure(body)
    let progress: { required: number; completed: number } | null = null
    if (body.dit_record_id && body.activity_template_id) {
      try {
        progress = await getActivityProgressForTemplate(
          String(body.dit_record_id),
          String(body.activity_template_id)
        )
      } catch {
        progress = null
      }
    }
    return NextResponse.json({ exposure: row, progress })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to log activity'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
