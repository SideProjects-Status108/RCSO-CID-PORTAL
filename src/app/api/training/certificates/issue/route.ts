import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { requireJsonSession } from '@/lib/training/api-auth'
import { isTrainingWriter } from '@/lib/training/access'
import { createSignatureRoute } from '@/lib/training/signatures'
import { renderCertificatePdf } from '@/lib/training/certificate-pdf'
import {
  fetchCertificateForDit,
  markCertificateIssued,
  upsertCertificateDraft,
  uploadCertificatePdf,
} from '@/lib/training/certificate-queries'

/**
 * POST /api/training/certificates/issue
 * Body: { dit_record_id: string, notes?: string }
 *
 * Training-writer action. Upserts the certificate draft from the current
 * dit_records + profile state, renders the PDF (with empty signature
 * slots for now), uploads it to the training-documents bucket, opens a
 * doc_type='completion_cert' signature route, and flips the record to
 * 'issued'. Subsequent signature-route completion flips it to 'signed'
 * via the sign endpoint.
 */
export async function POST(request: Request) {
  const gate = await requireJsonSession()
  if (!gate.ok) return gate.response
  const { session } = gate

  if (!isTrainingWriter(session.profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    dit_record_id?: string
    notes?: string
  }
  const ditRecordId = body.dit_record_id?.trim()
  if (!ditRecordId) {
    return NextResponse.json({ error: 'dit_record_id is required' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: rec, error: recErr } = await supabase
    .from('dit_records')
    .select('id, user_id, start_date, graduation_date, expected_graduation_date')
    .eq('id', ditRecordId)
    .maybeSingle()
  if (recErr || !rec) {
    return NextResponse.json({ error: 'DIT record not found' }, { status: 404 })
  }
  const record = rec as {
    id: string
    user_id: string
    start_date: string | null
    graduation_date: string | null
    expected_graduation_date: string | null
  }

  const { data: prof } = await supabase
    .from('profiles')
    .select('full_name, badge_number')
    .eq('id', record.user_id)
    .maybeSingle()
  const ditProfile = (prof as { full_name: string | null; badge_number: string | null } | null) ?? {
    full_name: null,
    badge_number: null,
  }

  const existing = await fetchCertificateForDit(ditRecordId)
  if (existing && (existing.status === 'issued' || existing.status === 'signed')) {
    return NextResponse.json(
      { error: `Certificate already ${existing.status}`, certificate: existing },
      { status: 409 },
    )
  }

  const draft = await upsertCertificateDraft({
    dit_record_id: ditRecordId,
    dit_full_name: ditProfile.full_name,
    dit_badge_number: ditProfile.badge_number,
    program_start_date: record.start_date,
    program_end_date: record.expected_graduation_date ?? record.graduation_date,
    effective_graduation_date:
      record.graduation_date ?? record.expected_graduation_date ?? new Date().toISOString().slice(0, 10),
    notes: body.notes ?? null,
  })

  const pdfBytes = await renderCertificatePdf({
    dit_full_name: draft.dit_full_name ?? 'Detective in Training',
    dit_badge_number: draft.dit_badge_number,
    program_start_date: draft.program_start_date,
    program_end_date: draft.program_end_date,
    effective_graduation_date: draft.effective_graduation_date,
    issued_at: new Date().toISOString(),
    signers: [
      { role: 'fto_coordinator', role_label: 'FTO Coordinator', signer_name: '—', signer_badge: null, signed_at: null, signature_image: null },
      { role: 'training_supervisor', role_label: 'Training Supervisor', signer_name: '—', signer_badge: null, signed_at: null, signature_image: null },
      { role: 'lt', role_label: 'Lieutenant', signer_name: '—', signer_badge: null, signed_at: null, signature_image: null },
      { role: 'cpt', role_label: 'Captain', signer_name: '—', signer_badge: null, signed_at: null, signature_image: null },
    ],
  })

  const objectPath = await uploadCertificatePdf({
    dit_record_id: ditRecordId,
    pdf: pdfBytes,
  })

  const sigRoute = await createSignatureRoute({
    docType: 'completion_cert',
    docId: draft.id,
    ditRecordId,
    createdBy: session.user.id,
  })

  const issued = await markCertificateIssued({
    id: draft.id,
    issued_by: session.user.id,
    pdf_object_path: objectPath,
    signature_route_id: sigRoute.id,
  })

  return NextResponse.json({ certificate: issued, signature_route_id: sigRoute.id })
}
