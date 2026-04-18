import { NextResponse } from 'next/server'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import {
  fetchSignatureRoute,
  recordSignature,
} from '@/lib/training/signatures'

type SignBody = {
  signature_image?: string
  biometric_method?: string | null
  device_id?: string | null
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
    const result = await recordSignature({
      signatureRow: routeData.document,
      signer: session.profile,
      signatureImage: image,
      biometricMethod: body.biometric_method ?? null,
      deviceId: body.device_id ?? null,
      ipAddress: ip,
    })
    return NextResponse.json({
      ok: true,
      document: result.document,
      event: { id: result.event.id, signed_at: result.event.signed_at },
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
