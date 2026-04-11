'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { hasRole, UserRole } from '@/lib/auth/roles'
import {
  fetchSubmissionDetail,
  fetchTemplateById,
  searchCasesByNumber,
} from '@/lib/forms/queries'
import type { SubmissionDetail } from '@/lib/forms/queries'
import type { FormFieldDefinition } from '@/types/forms'
import {
  notifyFormApprovalNeeded,
  notifyFormReviewed,
} from '@/lib/notifications/insert-notifications'

function validateRequired(
  fields: FormFieldDefinition[],
  formData: Record<string, unknown>
): string | null {
  for (const f of fields) {
    if (!f.required) continue
    const v = formData[f.id]
    if (f.type === 'checkbox') {
      if (v !== true) return `${f.label} is required`
      continue
    }
    if (v === null || v === undefined) return `${f.label} is required`
    if (typeof v === 'string' && v.trim() === '') return `${f.label} is required`
  }
  return null
}

export async function searchCasesAction(query: string) {
  const session = await getSessionUserWithProfile()
  if (!session) return []
  return searchCasesByNumber(query, 15)
}

export async function getSubmissionDetailAction(
  submissionId: string
): Promise<SubmissionDetail | null> {
  const session = await getSessionUserWithProfile()
  if (!session) return null

  const detail = await fetchSubmissionDetail(submissionId)
  if (!detail) return null

  const isSupervision = hasRole(session.profile.role, [
    UserRole.admin,
    UserRole.supervision_admin,
    UserRole.supervision,
  ])
  const isOwner = detail.submission.submitted_by === session.user.id
  if (!isSupervision && !isOwner) return null

  return detail
}

export async function saveFormDraftAction(input: {
  submissionId?: string | null
  templateId: string
  formData: Record<string, unknown>
  caseId: string | null
}) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')

  const template = await fetchTemplateById(input.templateId)
  if (!template) throw new Error('Form not found or unavailable')

  const supabase = await createClient()
  const userId = session.user.id

  if (input.submissionId) {
    const { data: existing, error: loadErr } = await supabase
      .from('form_submissions')
      .select('id, submitted_by, status')
      .eq('id', input.submissionId)
      .maybeSingle()

    if (loadErr || !existing) throw new Error('Submission not found')
    if (String(existing.submitted_by) !== userId) throw new Error('Forbidden')
    if (String(existing.status) !== 'draft') throw new Error('Only drafts can be edited')

    const { error } = await supabase
      .from('form_submissions')
      .update({
        form_data: input.formData,
        case_id: input.caseId,
        template_version: template.version,
      })
      .eq('id', input.submissionId)

    if (error) throw new Error(error.message)
    revalidatePath('/forms')
    return { id: input.submissionId }
  }

  const { data, error } = await supabase
    .from('form_submissions')
    .insert({
      template_id: template.id,
      template_version: template.version,
      submitted_by: userId,
      case_id: input.caseId,
      form_data: input.formData,
      status: 'draft',
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Save failed')
  revalidatePath('/forms')
  return { id: data.id as string }
}

export async function submitFormAction(input: {
  submissionId?: string | null
  templateId: string
  formData: Record<string, unknown>
  caseId: string | null
}) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')

  const template = await fetchTemplateById(input.templateId)
  if (!template) throw new Error('Form not found or unavailable')

  const err = validateRequired(template.fields_schema, input.formData)
  if (err) throw new Error(err)

  const nextStatus = template.requires_approval ? 'submitted' : 'approved'
  const supabase = await createClient()
  const userId = session.user.id

  if (input.submissionId) {
    const { data: existing, error: loadErr } = await supabase
      .from('form_submissions')
      .select('id, submitted_by, status')
      .eq('id', input.submissionId)
      .maybeSingle()

    if (loadErr || !existing) throw new Error('Submission not found')
    if (String(existing.submitted_by) !== userId) throw new Error('Forbidden')
    if (String(existing.status) !== 'draft') throw new Error('Only drafts can be submitted')

    const { error } = await supabase
      .from('form_submissions')
      .update({
        form_data: input.formData,
        case_id: input.caseId,
        template_version: template.version,
        status: nextStatus,
      })
      .eq('id', input.submissionId)

    if (error) throw new Error(error.message)
    if (nextStatus === 'submitted' && template.requires_approval) {
      await notifyFormApprovalNeeded({
        submissionId: input.submissionId,
        templateName: template.name,
        submitterId: userId,
        submitterDisplayName:
          session.profile.full_name?.trim() || session.user.email || 'A user',
      })
    }
    revalidatePath('/forms')
    return { id: input.submissionId }
  }

  const { data, error } = await supabase
    .from('form_submissions')
    .insert({
      template_id: template.id,
      template_version: template.version,
      submitted_by: userId,
      case_id: input.caseId,
      form_data: input.formData,
      status: nextStatus,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Submit failed')
  const newId = data.id as string
  if (nextStatus === 'submitted' && template.requires_approval) {
    await notifyFormApprovalNeeded({
      submissionId: newId,
      templateName: template.name,
      submitterId: userId,
      submitterDisplayName:
        session.profile.full_name?.trim() || session.user.email || 'A user',
    })
  }
  revalidatePath('/forms')
  return { id: newId }
}

export async function approveSubmissionAction(input: {
  submissionId: string
  reviewNotes?: string | null
}) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')
  if (!hasRole(session.profile.role, [UserRole.admin, UserRole.supervision_admin, UserRole.supervision])) {
    throw new Error('Forbidden')
  }

  const supabase = await createClient()
  const { data: row } = await supabase
    .from('form_submissions')
    .select('submitted_by, form_templates ( name )')
    .eq('id', input.submissionId)
    .maybeSingle()

  const { error } = await supabase
    .from('form_submissions')
    .update({
      status: 'approved',
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: input.reviewNotes?.trim() || null,
    })
    .eq('id', input.submissionId)
    .eq('status', 'submitted')

  if (error) throw new Error(error.message)
  const ft = row?.form_templates as { name?: string } | null
  if (row?.submitted_by) {
    await notifyFormReviewed({
      submissionId: input.submissionId,
      templateName: ft?.name ?? 'Form',
      submittedBy: String(row.submitted_by),
      approved: true,
    })
  }
  revalidatePath('/forms')
}

export async function rejectSubmissionAction(input: {
  submissionId: string
  reviewNotes: string
}) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')
  if (!hasRole(session.profile.role, [UserRole.admin, UserRole.supervision_admin, UserRole.supervision])) {
    throw new Error('Forbidden')
  }

  const note = input.reviewNotes.trim()
  if (!note) throw new Error('A rejection note is required')

  const supabase = await createClient()
  const { data: row } = await supabase
    .from('form_submissions')
    .select('submitted_by, form_templates ( name )')
    .eq('id', input.submissionId)
    .maybeSingle()

  const { error } = await supabase
    .from('form_submissions')
    .update({
      status: 'rejected',
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: note,
    })
    .eq('id', input.submissionId)
    .eq('status', 'submitted')

  if (error) throw new Error(error.message)
  const ft = row?.form_templates as { name?: string } | null
  if (row?.submitted_by) {
    await notifyFormReviewed({
      submissionId: input.submissionId,
      templateName: ft?.name ?? 'Form',
      submittedBy: String(row.submitted_by),
      approved: false,
    })
  }
  revalidatePath('/forms')
}
