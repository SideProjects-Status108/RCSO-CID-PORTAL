export type ScheduleEventType =
  | 'regular'
  | 'on_call'
  | 'vacation'
  | 'school'
  | 'in_service'
  | 'fto_shift'

export type ScheduleEventStatus = 'draft' | 'published'

export type ScheduleEventRow = {
  id: string
  event_type: ScheduleEventType
  title: string
  assigned_to: string
  created_by: string
  start_datetime: string
  end_datetime: string
  is_all_day: boolean
  is_recurring: boolean
  recurrence_rule: string | null
  gcal_event_id: string | null
  notes: string | null
  status: ScheduleEventStatus
  created_at: string
  updated_at: string
}
