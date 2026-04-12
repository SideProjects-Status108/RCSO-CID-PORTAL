import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { FormSubmissionStatus } from '@/types/forms'

export type CompanionFormSubmissionListItem = {
  id: string
  templateName: string
  status: FormSubmissionStatus
  created_at: string
}

export async function fetchCompanionFormSubmissions(
  userId: string,
  limit = 20
): Promise<CompanionFormSubmissionListItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('form_submissions')
    .select(
      `
      id,
      status,
      created_at,
      form_templates ( name )
    `
    )
    .eq('submitted_by', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data.map((row) => {
    const ft = row.form_templates as { name?: string } | null
    return {
      id: String(row.id),
      templateName: ft?.name ?? 'Form',
      status: row.status as FormSubmissionStatus,
      created_at: String(row.created_at ?? ''),
    }
  })
}
