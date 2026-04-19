import 'server-only'

import { createClient } from '@/lib/supabase/server'

import {
  fetchCertificateById,
  markCertificateSigned,
  updateCertificatePdfPath,
  uploadCertificatePdf,
} from './certificate-queries'
import { renderCertificatePdf, type CertificatePdfSigner } from './certificate-pdf'

const ROLE_LABEL: Record<string, string> = {
  fto_coordinator: 'FTO Coordinator',
  training_supervisor: 'Training Supervisor',
  lt: 'Lieutenant',
  cpt: 'Captain',
}

/**
 * Called when a completion_cert signature route hits status='completed'.
 * Re-renders the certificate PDF with the collected signature images +
 * signer names embedded, uploads it (overwriting the issued draft in the
 * training-documents bucket), and flips completion_certificates.status
 * to 'signed'. Safe to retry — idempotent per (certificateId).
 */
export async function finalizeCompletionCertificate(params: {
  certificateId: string
  signatureRouteId: string
}): Promise<void> {
  const cert = await fetchCertificateById(params.certificateId)
  if (!cert) return
  if (cert.status === 'signed') return

  const supabase = await createClient()
  const { data: events } = await supabase
    .from('signature_events')
    .select('signer_role, signer_name, signer_badge, signed_at, signature_image')
    .eq('document_signature_id', params.signatureRouteId)
    .order('step_index', { ascending: true })

  const routed: CertificatePdfSigner[] = (
    [
      'fto_coordinator',
      'training_supervisor',
      'lt',
      'cpt',
    ] as const
  ).map((role) => {
    const ev = (events ?? []).find(
      (e) => (e as { signer_role: string }).signer_role === role,
    ) as
      | {
          signer_role: string
          signer_name: string | null
          signer_badge: string | null
          signed_at: string | null
          signature_image: string | null
        }
      | undefined
    return {
      role,
      role_label: ROLE_LABEL[role] ?? role,
      signer_name: ev?.signer_name ?? '—',
      signer_badge: ev?.signer_badge ?? null,
      signed_at: ev?.signed_at ?? null,
      signature_image: ev?.signature_image ?? null,
    }
  })

  const pdf = await renderCertificatePdf({
    dit_full_name: cert.dit_full_name ?? 'Detective in Training',
    dit_badge_number: cert.dit_badge_number,
    program_start_date: cert.program_start_date,
    program_end_date: cert.program_end_date,
    effective_graduation_date: cert.effective_graduation_date,
    issued_at: cert.issued_at,
    signers: routed,
  })

  const path = await uploadCertificatePdf({
    dit_record_id: cert.dit_record_id,
    pdf,
  })
  if (path !== cert.pdf_object_path) {
    await updateCertificatePdfPath(cert.id, path)
  }
  await markCertificateSigned(cert.id)
}
