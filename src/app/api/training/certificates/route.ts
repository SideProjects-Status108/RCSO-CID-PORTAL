import { NextResponse } from 'next/server'

import { requireJsonSession } from '@/lib/training/api-auth'
import {
  fetchCertificateForDit,
  signCertificateDownloadUrl,
} from '@/lib/training/certificate-queries'

/**
 * GET /api/training/certificates?dit_record_id=<id>
 *
 * Returns the single certificate for this DIT (or null), augmented with a
 * short-lived signed URL when a PDF has been issued. RLS governs who can
 * see the row.
 */
export async function GET(request: Request) {
  const gate = await requireJsonSession()
  if (!gate.ok) return gate.response

  const url = new URL(request.url)
  const ditRecordId = url.searchParams.get('dit_record_id')?.trim()
  if (!ditRecordId) {
    return NextResponse.json({ error: 'dit_record_id is required' }, { status: 400 })
  }

  const cert = await fetchCertificateForDit(ditRecordId)
  if (!cert) return NextResponse.json({ certificate: null })

  let download_url: string | null = null
  if (cert.pdf_object_path) {
    download_url = await signCertificateDownloadUrl(cert.pdf_object_path)
  }

  return NextResponse.json({ certificate: cert, download_url })
}
