import { NextResponse } from 'next/server'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { deleteJournalEntry } from '@/lib/training/journal-queries'

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  try {
    await deleteJournalEntry(id, session.user.id)
    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to delete entry'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
