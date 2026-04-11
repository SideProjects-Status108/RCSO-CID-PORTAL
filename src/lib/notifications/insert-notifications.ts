import 'server-only'

import { revalidatePath } from 'next/cache'

import { createServiceRoleClient } from '@/lib/supabase/admin'

export type NotificationType =
  | 'request_assigned'
  | 'request_urgent'
  | 'request_updated'
  | 'form_approval_needed'
  | 'form_reviewed'
  | 'schedule_published'
  | 'evaluation_submitted'

export type NotificationRowInput = {
  user_id: string
  type: NotificationType
  reference_id: string
  reference_type: 'request' | 'form_submission' | 'schedule_event' | 'evaluation'
  message: string
}

export async function insertNotifications(rows: NotificationRowInput[]): Promise<void> {
  if (rows.length === 0) return
  const admin = createServiceRoleClient()
  if (!admin) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[notifications] SUPABASE_SERVICE_ROLE_KEY not set; skipping notification inserts'
      )
    }
    return
  }
  const { error } = await admin.from('notifications').insert(
    rows.map((r) => ({
      user_id: r.user_id,
      type: r.type,
      reference_id: r.reference_id,
      reference_type: r.reference_type,
      message: r.message,
    }))
  )
  if (error) {
    console.error('[notifications] insert failed', error.message)
  } else {
    revalidatePath('/dashboard')
    revalidatePath('/training')
  }
}

export async function fetchSupervisionPlusUserIds(): Promise<string[]> {
  const admin = createServiceRoleClient()
  if (!admin) return []
  const { data, error } = await admin
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'supervision_admin', 'supervision'])
    .eq('is_active', true)
  if (error || !data) return []
  return data.map((r) => String(r.id))
}

export async function fetchProfileName(userId: string): Promise<string | null> {
  const admin = createServiceRoleClient()
  if (!admin) return null
  const { data } = await admin.from('profiles').select('full_name').eq('id', userId).maybeSingle()
  return data?.full_name?.trim() || null
}

export async function notifyFormApprovalNeeded(params: {
  submissionId: string
  templateName: string
  submitterId: string
  submitterDisplayName: string
}) {
  const ids = await fetchSupervisionPlusUserIds()
  const rows = ids.map((user_id) => ({
    user_id,
    type: 'form_approval_needed' as const,
    reference_id: params.submissionId,
    reference_type: 'form_submission' as const,
    message: `${params.submitterDisplayName} submitted ${params.templateName} for review`,
  }))
  await insertNotifications(rows)
}

export async function notifyFormReviewed(params: {
  submissionId: string
  templateName: string
  submittedBy: string
  approved: boolean
}) {
  await insertNotifications([
    {
      user_id: params.submittedBy,
      type: 'form_reviewed',
      reference_id: params.submissionId,
      reference_type: 'form_submission',
      message: `Your ${params.templateName} submission has been ${params.approved ? 'approved' : 'rejected'}`,
    },
  ])
}

export async function notifySchedulePublished(params: {
  eventId: string
  assignedTo: string
  title: string
  startIso: string
}) {
  const when = new Date(params.startIso).toLocaleString()
  await insertNotifications([
    {
      user_id: params.assignedTo,
      type: 'schedule_published',
      reference_id: params.eventId,
      reference_type: 'schedule_event',
      message: `New schedule event: ${params.title} on ${when}`,
    },
  ])
}
