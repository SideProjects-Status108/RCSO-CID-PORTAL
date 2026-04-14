import { redirect } from 'next/navigation'

import { FieldNotesView } from '@/components/field-notes/field-notes-view'
import { fetchFieldNotesList } from '@/lib/field-notes/queries'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { hasRole, UserRole } from '@/lib/auth/roles'

export const dynamic = 'force-dynamic'

export default async function FieldNotesPage() {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')

  let notes: Awaited<ReturnType<typeof fetchFieldNotesList>> = []
  try {
    notes = await fetchFieldNotesList()
  } catch (e) {
    console.error('[field_notes] page load failed:', e)
    notes = []
  }
  const isSupervisionPlus = hasRole(session.profile.role, [
    UserRole.admin,
    UserRole.supervision_admin,
    UserRole.supervision,
  ])

  return (
    <FieldNotesView
      initialNotes={notes}
      viewerId={session.user.id}
      isSupervisionPlus={isSupervisionPlus}
    />
  )
}
