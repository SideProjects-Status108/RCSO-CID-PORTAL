import { NextResponse } from 'next/server'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { applyExtensionToGraduationDate, clampOverrideDays } from '@/lib/training/deficiencies'
import {
  fetchSignatureRoute,
  recordSignature,
} from '@/lib/training/signatures'
import { createClient } from '@/lib/supabase/server'

type SignBody = {
  signature_image?: string
  biometric_method?: string | null
  device_id?: string | null
  /**
   * LT/Capt override of the tiered extension default. Only honored when
   *   - this signature is on a deficiency route,
   *   - the signer is at the 'lt' step, and
   *   - the value is an integer in [0, 60].
   * Otherwise ignored.
   */
  extension_days_override?: number
}

/**
 * POST /api/training/signatures/[id]/sign
 *
 * Signs at the current step. The server re-validates the signer against the
 * routing step; stale writes return 409. Body: { signature_image (data URL) }.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params

  let body: SignBody
  try {
    body = (await request.json()) as SignBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const image = (body.signature_image ?? '').trim()
  if (!image.startsWith('data:image/')) {
    return NextResponse.json(
      { error: 'signature_image must be a PNG data URL' },
      { status: 400 }
    )
  }
  if (image.length > 1_500_000) {
    return NextResponse.json(
      { error: 'signature_image too large (limit ~1.5 MB base64)' },
      { status: 413 }
    )
  }

  const routeData = await fetchSignatureRoute(id)
  if (!routeData) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const xff = request.headers.get('x-forwarded-for')
  const ip = xff ? xff.split(',')[0].trim() : null

  try {
    // If this is a deficiency route and the signer is about to seal the LT
    // step with an override, persist extension_days BEFORE recording the
    // signature. This keeps the extension_applied_at hook consistent with
    // the final stored value even when the route auto-completes.
    if (
      routeData.document.doc_type === 'deficiency' &&
      routeData.document.current_signer_role === 'lt' &&
      typeof body.extension_days_override === 'number'
    ) {
      const clamped = clampOverrideDays(body.extension_days_override)
      const supabase = await createClient()
      await supabase
        .from('deficiency_forms')
        .update({
          extension_days: clamped,
          extension_override_by: session.user.id,
        })
        .eq('id', routeData.document.doc_id)
    }

    const result = await recordSignature({
      signatureRow: routeData.document,
      signer: session.profile,
      signatureImage: image,
      biometricMethod: body.biometric_method ?? null,
      deviceId: body.device_id ?? null,
      ipAddress: ip,
    })

    // If the route just completed and it's an FTO-feedback survey, flip
    // the row to 'acknowledged' so it moves out of the coordinator/TS
    // inbox and becomes visible to the FTO (anonymized).
    if (
      result.document.status === 'completed' &&
      result.document.doc_type === 'fto_feedback'
    ) {
      try {
        const { markSurveyAcknowledged } = await import(
          '@/lib/training/feedback-queries'
        )
        await markSurveyAcknowledged(result.document.doc_id)
      } catch {
        /* best-effort */
      }
    }

    // If the route just completed and it's an equipment check-off, flip
    // the row to 'signed'. Idempotent; runs as the signer so RLS on
    // equipment_checkoffs_update_writer must allow the signer. Only
    // training writers sign equipment check-offs (Coord/TS/LT), so the
    // writer check is implicitly satisfied by the signature-step gate.
    if (
      result.document.status === 'completed' &&
      result.document.doc_type === 'equipment_checkoff'
    ) {
      try {
        const { markEquipmentCheckoffSigned } = await import(
          '@/lib/training/equipment-queries'
        )
        await markEquipmentCheckoffSigned(result.document.doc_id)
      } catch {
        /* best-effort */
      }
    }

    // If the route just completed and it's a completion certificate,
    // flip completion_certificates.status → 'signed' and re-render the
    // PDF with the collected signatures embedded so the final artifact
    // in storage matches the audit trail.
    if (
      result.document.status === 'completed' &&
      result.document.doc_type === 'completion_cert'
    ) {
      try {
        const { finalizeCompletionCertificate } = await import(
          '@/lib/training/certificate-finalize'
        )
        await finalizeCompletionCertificate({
          certificateId: result.document.doc_id,
          signatureRouteId: result.document.id,
        })
      } catch {
        // Best-effort: if re-rendering the PDF or marking signed fails,
        // the row is still tracked as complete via document_signatures
        // and a writer can re-issue from the DIT file.
      }
    }

    // If the route just completed and it's a deficiency, apply the extension
    // to the DIT's expected_graduation_date. Idempotent — safe to replay.
    let graduationUpdate: { applied: boolean; newGraduationDate: string | null } | null = null
    if (
      result.document.status === 'completed' &&
      result.document.doc_type === 'deficiency'
    ) {
      const supabase = await createClient()
      const { data: form } = await supabase
        .from('deficiency_forms')
        .select('id, pairing_id, extension_days, extension_applied_at')
        .eq('id', result.document.doc_id)
        .maybeSingle()
      if (form) {
        graduationUpdate = await applyExtensionToGraduationDate({
          form: form as {
            id: string
            pairing_id: string
            extension_days: number
            extension_applied_at: string | null
          },
        })
      }
    }

    return NextResponse.json({
      ok: true,
      document: result.document,
      event: { id: result.event.id, signed_at: result.event.signed_at },
      graduation_update: graduationUpdate,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to record signature'
    const status = /not authorized/i.test(message)
      ? 403
      : /stale|no longer in progress/i.test(message)
        ? 409
        : 400
    return NextResponse.json({ error: message }, { status })
  }
}
