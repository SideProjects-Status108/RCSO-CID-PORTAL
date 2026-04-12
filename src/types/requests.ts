export type RequestType =
  | 'call_out'
  | 'task'
  | 'information'
  | 'follow_up'
  | 'other'

export type RequestUrgency = 'routine' | 'priority' | 'urgent'

export type RequestStatus =
  | 'open'
  | 'acknowledged'
  | 'in_progress'
  | 'complete'
  | 'closed'

export type RequestRow = {
  id: string
  request_type: RequestType
  title: string
  description: string | null
  urgency: RequestUrgency
  status: RequestStatus
  created_by: string
  assigned_to: string | null
  address: string | null
  latitude: string | null
  longitude: string | null
  /** Optional companion / integration payload (e.g. case number). */
  metadata: Record<string, unknown> | null
  created_at: string
  acknowledged_at: string | null
  completed_at: string | null
  updated_at: string
}

export type RequestUpdateRow = {
  id: string
  request_id: string
  updated_by: string
  previous_status: string | null
  new_status: string | null
  note: string | null
  created_at: string
}
