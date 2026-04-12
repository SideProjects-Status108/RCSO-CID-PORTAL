import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import type { FieldNoteRow } from '@/types/field-notes'

export function mapFieldNoteRow(r: Record<string, unknown>): FieldNoteRow {
  return {
    id: String(r.id),
    created_by: r.created_by != null ? String(r.created_by) : null,
    title: String(r.title ?? ''),
    incident_date: r.incident_date != null ? String(r.incident_date) : null,
    location_description:
      r.location_description != null ? String(r.location_description) : null,
    narrative: r.narrative != null ? String(r.narrative) : null,
    evidence_notes: r.evidence_notes != null ? String(r.evidence_notes) : null,
    persons_of_interest:
      r.persons_of_interest != null ? String(r.persons_of_interest) : null,
    follow_up_actions: r.follow_up_actions != null ? String(r.follow_up_actions) : null,
    is_shared: Boolean(r.is_shared),
    share_token: String(r.share_token ?? ''),
    created_at: String(r.created_at ?? ''),
    updated_at: String(r.updated_at ?? ''),
  }
}

export async function fetchFieldNotesList(): Promise<FieldNoteRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('field_notes')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error || !data) return []
  return data.map((r) => mapFieldNoteRow(r as Record<string, unknown>))
}

export async function fetchFieldNoteById(id: string): Promise<FieldNoteRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('field_notes').select('*').eq('id', id).maybeSingle()
  if (error || !data) return null
  return mapFieldNoteRow(data as Record<string, unknown>)
}

/** Read-only share links (bypasses RLS; token must match a shared note). */
export async function fetchSharedFieldNoteByToken(token: string): Promise<FieldNoteRow | null> {
  const t = token.trim().toLowerCase()
  if (!/^[a-f0-9]{32}$/.test(t)) return null

  const admin = createServiceRoleClient()
  if (!admin) return null

  const { data, error } = await admin
    .from('field_notes')
    .select('*')
    .eq('share_token', t)
    .eq('is_shared', true)
    .maybeSingle()

  if (error || !data) return null
  return mapFieldNoteRow(data as Record<string, unknown>)
}
