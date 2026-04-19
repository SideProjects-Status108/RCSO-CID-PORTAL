import { NextResponse } from 'next/server'

import { requireJsonSession } from '@/lib/training/api-auth'
import { isTrainingWriter } from '@/lib/training/access'
import {
  fetchEquipmentCheckoffForDit,
  upsertEquipmentCheckoffDraft,
  updateEquipmentCheckoff,
} from '@/lib/training/equipment-queries'
import type { EquipmentCheckoffItem } from '@/types/training'
import { EQUIPMENT_CHECKOFF_DEFAULT_ITEMS } from '@/types/training'

/**
 * GET  /api/training/equipment-checkoff?dit_record_id=<id>
 *   Returns the DIT's equipment check-off row (or null). RLS governs
 *   visibility: training readers, the DIT owner, and their active FTO.
 *
 * POST /api/training/equipment-checkoff
 *   Body: { dit_record_id, items?, notes? }
 *   Upserts a draft row. If `items` is omitted and no row exists yet,
 *   seeds from EQUIPMENT_CHECKOFF_DEFAULT_ITEMS so the UI has a starting
 *   list. Writers only.
 *
 * PATCH /api/training/equipment-checkoff?dit_record_id=<id>
 *   Body: { items?, notes? }
 *   Partial update on the existing row. Writers only; forbidden once the
 *   row is issued/signed/voided (clients should reissue a new draft
 *   explicitly via the issue endpoint instead).
 */
export async function GET(request: Request) {
  const gate = await requireJsonSession()
  if (!gate.ok) return gate.response

  const url = new URL(request.url)
  const ditRecordId = url.searchParams.get('dit_record_id')?.trim()
  if (!ditRecordId) {
    return NextResponse.json({ error: 'dit_record_id is required' }, { status: 400 })
  }

  const row = await fetchEquipmentCheckoffForDit(ditRecordId)
  return NextResponse.json({ checkoff: row })
}

export async function POST(request: Request) {
  const gate = await requireJsonSession()
  if (!gate.ok) return gate.response
  if (!isTrainingWriter(gate.session.profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    dit_record_id?: string
    items?: EquipmentCheckoffItem[]
    notes?: string | null
  }
  const ditRecordId = body.dit_record_id?.trim()
  if (!ditRecordId) {
    return NextResponse.json({ error: 'dit_record_id is required' }, { status: 400 })
  }

  const items =
    Array.isArray(body.items) && body.items.length > 0
      ? body.items
      : EQUIPMENT_CHECKOFF_DEFAULT_ITEMS.map((i) => ({
          key: i.key,
          label: i.label,
          checked: false,
          serial: null,
          note: null,
        }))

  const row = await upsertEquipmentCheckoffDraft({
    dit_record_id: ditRecordId,
    items,
    notes: body.notes ?? null,
  })
  return NextResponse.json({ checkoff: row })
}

export async function PATCH(request: Request) {
  const gate = await requireJsonSession()
  if (!gate.ok) return gate.response
  if (!isTrainingWriter(gate.session.profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const ditRecordId = url.searchParams.get('dit_record_id')?.trim()
  if (!ditRecordId) {
    return NextResponse.json({ error: 'dit_record_id is required' }, { status: 400 })
  }
  const existing = await fetchEquipmentCheckoffForDit(ditRecordId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.status !== 'draft') {
    return NextResponse.json(
      { error: `Cannot edit a ${existing.status} check-off; re-issue instead` },
      { status: 409 },
    )
  }

  const body = (await request.json().catch(() => ({}))) as {
    items?: EquipmentCheckoffItem[]
    notes?: string | null
  }

  const updated = await updateEquipmentCheckoff({
    id: existing.id,
    items: body.items,
    notes: body.notes,
  })
  return NextResponse.json({ checkoff: updated })
}
