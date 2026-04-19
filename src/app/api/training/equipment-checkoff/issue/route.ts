import { NextResponse } from 'next/server'

import { requireJsonSession } from '@/lib/training/api-auth'
import { isTrainingWriter } from '@/lib/training/access'
import { createSignatureRoute } from '@/lib/training/signatures'
import {
  fetchEquipmentCheckoffForDit,
  markEquipmentCheckoffIssued,
  upsertEquipmentCheckoffDraft,
} from '@/lib/training/equipment-queries'
import type { EquipmentCheckoffItem } from '@/types/training'
import { EQUIPMENT_CHECKOFF_DEFAULT_ITEMS } from '@/types/training'

/**
 * POST /api/training/equipment-checkoff/issue
 * Body: { dit_record_id: string, items?: EquipmentCheckoffItem[], notes?: string | null }
 *
 * Writer action. Ensures a draft row exists (seeding default items if
 * needed) and opens a doc_type='equipment_checkoff' signature route
 * (Coord → TS → LT). Flips the row to 'issued'. 409 if the row is
 * already issued or signed.
 */
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

  const existing = await fetchEquipmentCheckoffForDit(ditRecordId)
  if (existing && (existing.status === 'issued' || existing.status === 'signed')) {
    return NextResponse.json(
      { error: `Check-off already ${existing.status}`, checkoff: existing },
      { status: 409 },
    )
  }

  const items =
    Array.isArray(body.items) && body.items.length > 0
      ? body.items
      : existing?.items && existing.items.length > 0
        ? existing.items
        : EQUIPMENT_CHECKOFF_DEFAULT_ITEMS.map((i) => ({
            key: i.key,
            label: i.label,
            checked: false,
            serial: null,
            note: null,
          }))

  const draft = await upsertEquipmentCheckoffDraft({
    dit_record_id: ditRecordId,
    items,
    notes: body.notes ?? existing?.notes ?? null,
  })

  const route = await createSignatureRoute({
    docType: 'equipment_checkoff',
    docId: draft.id,
    ditRecordId,
    createdBy: gate.session.user.id,
  })

  const issued = await markEquipmentCheckoffIssued({
    id: draft.id,
    issued_by: gate.session.user.id,
    signature_route_id: route.id,
  })

  return NextResponse.json({ checkoff: issued, signature_route_id: route.id })
}
