import { NextResponse } from 'next/server'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { fetchSignatureRoute } from '@/lib/training/signatures'

export const dynamic = 'force-dynamic'

/**
 * GET /api/training/signatures/[id]/audit-trail
 *
 * Returns the document_signatures row + every signature_event in order.
 * Signature images are omitted from the list response by default to keep the
 * payload small; pass ?include_images=1 to fetch them.
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const url = new URL(request.url)
  const includeImages = url.searchParams.get('include_images') === '1'

  const data = await fetchSignatureRoute(id)
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    document: data.document,
    events: data.events.map((e) => ({
      id: e.id,
      step_index: e.step_index,
      signer_role: e.signer_role,
      signer_id: e.signer_id,
      signed_at: e.signed_at,
      biometric_method: e.biometric_method,
      device_id: e.device_id,
      ip_address: e.ip_address,
      signature_image: includeImages ? e.signature_image : null,
    })),
  })
}
