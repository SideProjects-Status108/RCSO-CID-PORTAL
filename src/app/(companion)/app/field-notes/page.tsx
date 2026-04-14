import { redirect } from 'next/navigation'

import { CompanionFieldNotesView } from '@/components/companion/companion-field-notes-view'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { fetchFieldNotesList } from '@/lib/field-notes/queries'
import type { FieldNoteRow } from '@/types/field-notes'

export const dynamic = 'force-dynamic'

export default async function CompanionFieldNotesPage() {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login?next=/app/field-notes')

  let notes: FieldNoteRow[] = []
  try {
    notes = await fetchFieldNotesList()
  } catch {
    notes = []
  }

  return (
    <div className="pb-4">
      <h1 className="font-heading text-lg font-semibold uppercase tracking-wide text-text-primary">
        Field Notes
      </h1>
      <p className="mt-1 text-xs text-text-secondary">
        Read-only on mobile. Open a note for full text, or use desktop to create and edit.
      </p>
      <div className="mt-4">
        <CompanionFieldNotesView initialNotes={notes} />
      </div>
    </div>
  )
}
