import { NextResponse } from 'next/server'

import { requireJsonSession } from '@/lib/training/api-auth'
import { isTrainingWriter } from '@/lib/training/access'
import { voidCertificate, fetchCertificateById } from '@/lib/training/certificate-queries'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireJsonSession()
  if (!gate.ok) return gate.response
  const { session } = gate

  if (!isTrainingWriter(session.profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const cert = await fetchCertificateById(id)
  if (!cert) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = (await request.json().catch(() => ({}))) as { void_reason?: string }
  const updated = await voidCertificate({
    id,
    voided_by: session.user.id,
    void_reason: body.void_reason?.trim() || null,
  })
  return NextResponse.json({ certificate: updated })
}
