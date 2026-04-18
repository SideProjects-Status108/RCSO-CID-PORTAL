import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import {
  canDocumentAbsence,
  createAbsenceWithRoute,
} from '@/lib/training/absences'
import { ABSENCE_KINDS } from '@/types/training'

type CreateBody = {
  dit_record_id?: string
  start_date?: string
  end_date?: string | null
  kind?: string
  description?: string | null
  signature_image?: string | null
  device_id?: string | null
}

/**
 * POST /api/training/absences
 *
 * Documents an absence against a DIT record. The caller must either be a
 * training writer or the active FTO for the DIT. Signature from the
 * originator is optional; when provided, pre-signs the FTO step.
 */
export async function POST(request: Request) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: CreateBody
  try {
    body = (await request.json()) as CreateBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const ditRecordId = (body.dit_record_id ?? '').trim()
  const startDate = (body.start_date ?? '').trim()
  const endDate = body.end_date ?? null
  const kind = (body.kind ?? '').trim()
  const description = body.description ?? null
  const signatureImage = body.signature_image ?? null

  if (!ditRecordId) {
    return NextResponse.json({ error: 'dit_record_id is required' }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return NextResponse.json({ error: 'start_date must be YYYY-MM-DD' }, { status: 400 })
  }
  if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return NextResponse.json({ error: 'end_date must be YYYY-MM-DD' }, { status: 400 })
  }
  if (endDate && endDate < startDate) {
    return NextResponse.json({ error: 'end_date cannot be before start_date' }, { status: 400 })
  }
  if (!(ABSENCE_KINDS as readonly string[]).includes(kind)) {
    return NextResponse.json(
      { error: `kind must be one of: ${ABSENCE_KINDS.join(', ')}` },
      { status: 400 }
    )
  }
  if (signatureImage && !signatureImage.startsWith('data:image/')) {
    return NextResponse.json(
      { error: 'signature_image must be a data URL' },
      { status: 400 }
    )
  }
  if (signatureImage && signatureImage.length > 1_500_000) {
    return NextResponse.json(
      { error: 'signature_image too large' },
      { status: 413 }
    )
  }

  const authorized = await canDocumentAbsence(session.profile, ditRecordId)
  if (!authorized) {
    return NextResponse.json({ error: 'Not authorized for this DIT' }, { status: 403 })
  }

  try {
    const xff = request.headers.get('x-forwarded-for')
    const ip = xff ? xff.split(',')[0].trim() : null
    const result = await createAbsenceWithRoute({
      ditRecordId,
      startDate,
      endDate,
      kind: kind as (typeof ABSENCE_KINDS)[number],
      description,
      originator: session.profile,
      preSignedImage: signatureImage,
      preSignedDeviceId: body.device_id ?? null,
      preSignedIpAddress: ip,
    })
    revalidatePath(`/training/dit-files/${ditRecordId}`)
    return NextResponse.json({ ok: true, absence: result.absence, signature: result.signature })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create absence'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
