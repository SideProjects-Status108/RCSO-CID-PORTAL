import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { parseFieldsSchema } from '@/lib/forms/parse-schema'
import type { CaseRow, FormSubmissionRow, FormTemplateRow } from '@/types/forms'

function mapTemplate(r: Record<string, unknown>): FormTemplateRow {
  return {
    id: String(r.id),
    name: String(r.name ?? ''),
    category: r.category != null ? String(r.category) : null,
    version: Number(r.version ?? 1),
    fields_schema: parseFieldsSchema(r.fields_schema),
    requires_approval: Boolean(r.requires_approval),
    is_published: Boolean(r.is_published),
    is_archived: Boolean(r.is_archived),
    created_by: r.created_by != null ? String(r.created_by) : null,
    created_at: String(r.created_at ?? ''),
    updated_at: String(r.updated_at ?? ''),
  }
}

function mapSubmission(r: Record<string, unknown>): FormSubmissionRow {
  const st = r.status as FormSubmissionRow['status']
  return {
    id: String(r.id),
    template_id: String(r.template_id),
    template_version: Number(r.template_version ?? 1),
    submitted_by: String(r.submitted_by),
    case_id: r.case_id != null ? String(r.case_id) : null,
    form_data:
      r.form_data && typeof r.form_data === 'object' && !Array.isArray(r.form_data)
        ? (r.form_data as Record<string, unknown>)
        : {},
    status: st,
    reviewed_by: r.reviewed_by != null ? String(r.reviewed_by) : null,
    reviewed_at: r.reviewed_at != null ? String(r.reviewed_at) : null,
    review_notes: r.review_notes != null ? String(r.review_notes) : null,
    created_at: String(r.created_at ?? ''),
    updated_at: String(r.updated_at ?? ''),
  }
}

/** Submitted forms awaiting approval (org-wide). */
export async function countSubmittedPendingForms(): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('form_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'submitted')
  if (error) return 0
  return count ?? 0
}

export async function fetchPublishedTemplates(): Promise<FormTemplateRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('form_templates')
    .select('*')
    .eq('is_published', true)
    .eq('is_archived', false)
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (error || !data) return []
  return data.map((row) => mapTemplate(row as Record<string, unknown>))
}

export async function fetchDraftForTemplate(
  userId: string,
  templateId: string,
  draftId: string
): Promise<{ submission: FormSubmissionRow; case_number: string | null } | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('form_submissions')
    .select(
      `
      *,
      cases ( case_number )
    `
    )
    .eq('id', draftId)
    .eq('submitted_by', userId)
    .eq('template_id', templateId)
    .eq('status', 'draft')
    .maybeSingle()

  if (error || !data) return null
  const cs = data.cases as { case_number?: string } | null
  return {
    submission: mapSubmission(data as Record<string, unknown>),
    case_number: cs?.case_number ?? null,
  }
}

export async function fetchTemplateById(
  id: string
): Promise<FormTemplateRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('form_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  const t = mapTemplate(data as Record<string, unknown>)
  if (!t.is_published || t.is_archived) return null
  return t
}

/** Published template by exact display name (seed / admin-managed). */
export async function fetchPublishedTemplateByName(
  name: string
): Promise<FormTemplateRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('form_templates')
    .select('*')
    .eq('name', name)
    .eq('is_published', true)
    .eq('is_archived', false)
    .maybeSingle()

  if (error || !data) return null
  return mapTemplate(data as Record<string, unknown>)
}

export type SubmissionListItem = FormSubmissionRow & {
  template_name: string | null
  case_number: string | null
}

export async function fetchMySubmissions(userId: string): Promise<SubmissionListItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('form_submissions')
    .select(
      `
      *,
      form_templates ( name ),
      cases ( case_number )
    `
    )
    .eq('submitted_by', userId)
    .order('updated_at', { ascending: false })

  if (error || !data) return []
  return data.map((row) => {
    const base = mapSubmission(row as Record<string, unknown>)
    const ft = row.form_templates as { name?: string } | null
    const cs = row.cases as { case_number?: string } | null
    return {
      ...base,
      template_name: ft?.name ?? null,
      case_number: cs?.case_number ?? null,
    }
  })
}

export type ApprovalQueueRow = SubmissionListItem & {
  submitter_name: string
}

export async function fetchApprovalQueue(): Promise<SubmissionListItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('form_submissions')
    .select(
      `
      *,
      form_templates ( name ),
      cases ( case_number )
    `
    )
    .eq('status', 'submitted')
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return data.map((row) => {
    const base = mapSubmission(row as Record<string, unknown>)
    const ft = row.form_templates as { name?: string } | null
    const cs = row.cases as { case_number?: string } | null
    return {
      ...base,
      template_name: ft?.name ?? null,
      case_number: cs?.case_number ?? null,
    }
  })
}

export async function fetchApprovalQueueWithNames(): Promise<ApprovalQueueRow[]> {
  const items = await fetchApprovalQueue()
  if (items.length === 0) return []

  const supabase = await createClient()
  const ids = [...new Set(items.map((i) => i.submitted_by))]
  const { data: profs } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', ids)

  const nameById = new Map<string, string>()
  for (const p of profs ?? []) {
    nameById.set(String(p.id), String(p.full_name ?? '').trim() || 'Unknown')
  }

  return items.map((i) => ({
    ...i,
    submitter_name: nameById.get(i.submitted_by) ?? 'Unknown',
  }))
}

export type SubmissionDetail = {
  submission: FormSubmissionRow
  template: FormTemplateRow
  submitter_name: string
  reviewer_name: string | null
  case_number: string | null
}

export async function fetchSubmissionDetail(
  submissionId: string
): Promise<SubmissionDetail | null> {
  const supabase = await createClient()
  const { data: sub, error } = await supabase
    .from('form_submissions')
    .select(
      `
      *,
      form_templates ( * ),
      cases ( case_number )
    `
    )
    .eq('id', submissionId)
    .maybeSingle()

  if (error || !sub) return null

  const ftRaw = sub.form_templates as Record<string, unknown> | null
  if (!ftRaw) return null
  const template = mapTemplate(ftRaw)

  const submission = mapSubmission(sub as Record<string, unknown>)
  const cs = sub.cases as { case_number?: string } | null

  const submitterRes = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', submission.submitted_by)
    .maybeSingle()

  const reviewerRes = submission.reviewed_by
    ? await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', submission.reviewed_by)
        .maybeSingle()
    : { data: null as { full_name?: string } | null }

  return {
    submission,
    template,
    submitter_name: submitterRes.data?.full_name?.trim() || 'Unknown',
    reviewer_name: reviewerRes.data?.full_name?.trim() || null,
    case_number: cs?.case_number ?? null,
  }
}

export async function searchCasesByNumber(
  query: string,
  limit = 15
): Promise<Pick<CaseRow, 'id' | 'case_number'>[]> {
  const q = query.trim()
  if (q.length < 1) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cases')
    .select('id, case_number')
    .ilike('case_number', `%${q}%`)
    .order('case_number', { ascending: true })
    .limit(limit)

  if (error || !data) return []
  return data.map((r) => ({
    id: String(r.id),
    case_number: String(r.case_number ?? ''),
  }))
}

export { submissionStatusForStamp } from '@/lib/forms/submission-status-display'
