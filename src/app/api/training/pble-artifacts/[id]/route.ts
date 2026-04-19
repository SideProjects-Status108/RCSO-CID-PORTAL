import { NextResponse } from 'next/server'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { deleteArtifact } from '@/lib/training/pble-queries'

// DELETE /api/training/pble-artifacts/[id]
//   RLS allows the uploader or staff to remove. Also drops the backing
//   storage object.
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await context.params
  try {
    await deleteArtifact(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to delete artifact'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
