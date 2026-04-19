import { NextResponse } from 'next/server'

import { requireJsonSession } from '@/lib/training/api-auth'
import { isTrainingWriter } from '@/lib/training/access'
import {
  fetchEquipmentCheckoffById,
  voidEquipmentCheckoff,
} from '@/lib/training/equipment-queries'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireJsonSession()
  if (!gate.ok) return gate.response
  if (!isTrainingWriter(gate.session.profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const existing = await fetchEquipmentCheckoffById(id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = (await request.json().catch(() => ({}))) as { void_reason?: string }
  const updated = await voidEquipmentCheckoff({
    id,
    voided_by: gate.session.user.id,
    void_reason: body.void_reason?.trim() || null,
  })
  return NextResponse.json({ checkoff: updated })
}
