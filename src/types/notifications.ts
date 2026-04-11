export type AppNotificationType =
  | 'request_assigned'
  | 'request_urgent'
  | 'request_updated'
  | 'form_approval_needed'
  | 'form_reviewed'
  | 'schedule_published'

export type NotificationRow = {
  id: string
  user_id: string
  type: AppNotificationType
  reference_id: string
  reference_type: 'request' | 'form_submission' | 'schedule_event'
  message: string
  is_read: boolean
  created_at: string
}
