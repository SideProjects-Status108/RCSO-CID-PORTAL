'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'

function revalidateFieldNotes() {
  revalidatePath('/tools/field-notes')
}

export async function createFieldNoteAction() {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('field_notes')
    .insert({
      created_by: session.user.id,
      title: 'Untitled field note',
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Could not create note')
  revalidateFieldNotes()
  return String(data.id)
}

export async function updateFieldNoteAction(input: {
  id: string
  title: string
  incident_date: string | null
  location_description: string | null
  narrative: string | null
  evidence_notes: string | null
  persons_of_interest: string | null
  follow_up_actions: string | null
}) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')

  const title = input.title.trim()
  if (!title) throw new Error('Title is required')

  const supabase = await createClient()
  const { error } = await supabase
    .from('field_notes')
    .update({
      title,
      incident_date: input.incident_date?.trim() || null,
      location_description: input.location_description?.trim() || null,
      narrative: input.narrative?.trim() || null,
      evidence_notes: input.evidence_notes?.trim() || null,
      persons_of_interest: input.persons_of_interest?.trim() || null,
      follow_up_actions: input.follow_up_actions?.trim() || null,
    })
    .eq('id', input.id)

  if (error) throw new Error(error.message)
  revalidateFieldNotes()
}

export async function setFieldNoteSharedAction(input: { id: string; is_shared: boolean }) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')

  const supabase = await createClient()
  const { error } = await supabase
    .from('field_notes')
    .update({ is_shared: input.is_shared })
    .eq('id', input.id)

  if (error) throw new Error(error.message)
  revalidateFieldNotes()
}

export async function deleteFieldNoteAction(id: string) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')

  const supabase = await createClient()
  const { error } = await supabase.from('field_notes').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidateFieldNotes()
}
