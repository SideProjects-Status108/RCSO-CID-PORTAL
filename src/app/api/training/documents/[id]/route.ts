import { NextResponse } from 'next/server'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { deleteDocument } from '@/lib/training/document-queries'

// DELETE /api/training/documents/[id]
//   Removes the metadata row and the backing storage object. RLS
//   requires is_training_writer().
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await context.params
  try {
    await deleteDocument(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to delete document'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
