export type FieldNoteRow = {
  id: string
  created_by: string | null
  title: string
  incident_date: string | null
  location_description: string | null
  narrative: string | null
  evidence_notes: string | null
  persons_of_interest: string | null
  follow_up_actions: string | null
  is_shared: boolean
  share_token: string
  created_at: string
  updated_at: string
}
