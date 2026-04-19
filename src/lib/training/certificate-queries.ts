import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { CompletionCertificate, CompletionCertificateStatus } from '@/types/training'

const CERT_BUCKET = 'training-documents'

function fail(msg: string, err?: unknown): never {
  const suffix = err instanceof Error ? `: ${err.message}` : ''
  throw new Error(`${msg}${suffix}`)
}

function mapCert(r: Record<string, unknown>): CompletionCertificate {
  return {
    id: String(r.id),
    dit_record_id: String(r.dit_record_id),
    issued_by: r.issued_by != null ? String(r.issued_by) : null,
    issued_at: r.issued_at != null ? String(r.issued_at) : null,
    status: r.status as CompletionCertificateStatus,
    pdf_object_path: r.pdf_object_path != null ? String(r.pdf_object_path) : null,
    signature_route_id: r.signature_route_id != null ? String(r.signature_route_id) : null,
    dit_full_name: r.dit_full_name != null ? String(r.dit_full_name) : null,
    dit_badge_number: r.dit_badge_number != null ? String(r.dit_badge_number) : null,
    program_start_date: r.program_start_date != null ? String(r.program_start_date) : null,
    program_end_date: r.program_end_date != null ? String(r.program_end_date) : null,
    effective_graduation_date:
      r.effective_graduation_date != null ? String(r.effective_graduation_date) : null,
    notes: r.notes != null ? String(r.notes) : null,
    signed_at: r.signed_at != null ? String(r.signed_at) : null,
    voided_at: r.voided_at != null ? String(r.voided_at) : null,
    voided_by: r.voided_by != null ? String(r.voided_by) : null,
    void_reason: r.void_reason != null ? String(r.void_reason) : null,
    created_at: String(r.created_at ?? ''),
    updated_at: String(r.updated_at ?? ''),
  }
}

export async function fetchCertificateForDit(
  dit_record_id: string,
): Promise<CompletionCertificate | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('completion_certificates')
    .select('*')
    .eq('dit_record_id', dit_record_id)
    .maybeSingle()
  if (error) fail('Failed to load completion certificate', error)
  return data ? mapCert(data as Record<string, unknown>) : null
}

export async function fetchCertificateById(id: string): Promise<CompletionCertificate | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('completion_certificates')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) fail('Failed to load completion certificate', error)
  return data ? mapCert(data as Record<string, unknown>) : null
}

export async function upsertCertificateDraft(input: {
  dit_record_id: string
  dit_full_name: string | null
  dit_badge_number: string | null
  program_start_date: string | null
  program_end_date: string | null
  effective_graduation_date: string | null
  notes?: string | null
}): Promise<CompletionCertificate> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('completion_certificates')
    .upsert(
      {
        dit_record_id: input.dit_record_id,
        dit_full_name: input.dit_full_name,
        dit_badge_number: input.dit_badge_number,
        program_start_date: input.program_start_date,
        program_end_date: input.program_end_date,
        effective_graduation_date: input.effective_graduation_date,
        notes: input.notes ?? null,
        status: 'draft',
      },
      { onConflict: 'dit_record_id' },
    )
    .select('*')
    .single()
  if (error) fail('Failed to upsert certificate draft', error)
  return mapCert(data as Record<string, unknown>)
}

export async function markCertificateIssued(params: {
  id: string
  issued_by: string
  pdf_object_path: string
  signature_route_id: string
}): Promise<CompletionCertificate> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('completion_certificates')
    .update({
      status: 'issued',
      issued_by: params.issued_by,
      issued_at: new Date().toISOString(),
      pdf_object_path: params.pdf_object_path,
      signature_route_id: params.signature_route_id,
    })
    .eq('id', params.id)
    .select('*')
    .single()
  if (error) fail('Failed to mark certificate issued', error)
  return mapCert(data as Record<string, unknown>)
}

export async function markCertificateSigned(id: string): Promise<CompletionCertificate> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('completion_certificates')
    .update({ status: 'signed', signed_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()
  if (error) fail('Failed to mark certificate signed', error)
  return mapCert(data as Record<string, unknown>)
}

export async function updateCertificatePdfPath(
  id: string,
  pdf_object_path: string,
): Promise<CompletionCertificate> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('completion_certificates')
    .update({ pdf_object_path })
    .eq('id', id)
    .select('*')
    .single()
  if (error) fail('Failed to update certificate PDF path', error)
  return mapCert(data as Record<string, unknown>)
}

export async function voidCertificate(params: {
  id: string
  voided_by: string
  void_reason: string | null
}): Promise<CompletionCertificate> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('completion_certificates')
    .update({
      status: 'voided',
      voided_by: params.voided_by,
      voided_at: new Date().toISOString(),
      void_reason: params.void_reason,
    })
    .eq('id', params.id)
    .select('*')
    .single()
  if (error) fail('Failed to void certificate', error)
  return mapCert(data as Record<string, unknown>)
}

export async function uploadCertificatePdf(params: {
  dit_record_id: string
  pdf: Uint8Array
}): Promise<string> {
  const supabase = await createClient()
  const objectPath = `completion-certificates/${params.dit_record_id}.pdf`
  const { error } = await supabase.storage
    .from(CERT_BUCKET)
    .upload(objectPath, params.pdf, {
      contentType: 'application/pdf',
      upsert: true,
    })
  if (error) fail('Failed to upload certificate PDF', error)
  return objectPath
}

export async function signCertificateDownloadUrl(
  objectPath: string,
  expiresIn = 60 * 5,
): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from(CERT_BUCKET)
    .createSignedUrl(objectPath, expiresIn)
  if (error || !data) return null
  return data.signedUrl
}
