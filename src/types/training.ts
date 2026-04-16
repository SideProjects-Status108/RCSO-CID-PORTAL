export type EvaluationType = 'daily' | 'weekly' | 'phase_end' | 'special'

export type OverallRating =
  | 'excellent'
  | 'satisfactory'
  | 'needs_improvement'
  | 'unsatisfactory'

export type EvaluationStatus = 'draft' | 'submitted' | 'approved'

export type DitRecordStatus = 'active' | 'on_hold' | 'graduated' | 'separated'

export type FtoPairingRow = {
  id: string
  fto_id: string
  dit_id: string
  phase: number
  start_date: string
  end_date: string | null
  is_active: boolean
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type EvaluationRow = {
  id: string
  pairing_id: string
  submitted_by: string
  evaluation_date: string
  evaluation_type: EvaluationType
  scores: Record<string, number>
  overall_rating: OverallRating
  notes: string | null
  status: EvaluationStatus
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
  /** Present only when caller may read private notes (joined in app, not RLS on evaluations). */
  private_notes: string | null
}

export type DitRecordRow = {
  id: string
  user_id: string
  current_phase: number
  start_date: string
  graduation_date: string | null
  status: DitRecordStatus
  created_by: string
  created_at: string
  updated_at: string
}

export type DitMilestoneRow = {
  id: string
  dit_record_id: string
  milestone_name: string
  description: string | null
  phase: number
  is_completed: boolean
  completed_at: string | null
  completed_by: string | null
  sort_order: number
}

export type PairingPhaseEventRow = {
  id: string
  pairing_id: string
  from_phase: number
  to_phase: number
  changed_by: string
  created_at: string
}

export const EVALUATION_SCORE_KEYS = [
  'initiative',
  'knowledge_of_law_and_procedure',
  'report_writing',
  'communication',
  'safety_awareness',
  'professionalism',
  'response_to_training',
] as const

export type EvaluationScoreKey = (typeof EVALUATION_SCORE_KEYS)[number]

export const EVALUATION_SCORE_LABELS: Record<EvaluationScoreKey, string> = {
  initiative: 'Initiative',
  knowledge_of_law_and_procedure: 'Knowledge of law and procedure',
  report_writing: 'Report writing',
  communication: 'Communication',
  safety_awareness: 'Safety awareness',
  professionalism: 'Professionalism',
  response_to_training: 'Response to training',
}

// --- DIT weekly training (activity log, sessions, competencies, deficiency, excellence) ---

export type ActivityTemplate = {
  id: string
  activity_name: string
  category: string
  required_exposures_phase_1: number
  required_exposures_phase_2: number
  required_exposures_phase_3: number
  description: string | null
}

export type ActivityExposure = {
  id: string
  dit_record_id: string
  activity_template_id: string
  fto_id: string
  exposure_date: string
  case_complaint_number: string | null
  role: 'observer' | 'assistant' | 'lead'
  duration_minutes: number | null
  fto_notes: string | null
  created_at: string
}

export type WeeklyTrainingSession = {
  id: string
  pairing_id: string
  week_start_date: string
  week_end_date: string
  status: 'draft' | 'submitted' | 'approved'
  submitted_by: string | null
  submitted_at: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export type CompetencyMaster = {
  key: string
  label: string
  category: string
  sort_order: number
  description: string | null
}

export type WeeklyCompetencyScore = {
  id: string
  session_id: string
  competency_key: string
  competency_label: string
  category: string
  score: number | null
  explanation: string | null
  explanation_required: boolean
  prior_week_score: number | null
  created_at: string
  updated_at: string
}

export type UnobservedCompetency = {
  id: string
  session_id: string
  competency_key: string
  competency_label: string
  days_since_last_observed: number
  dit_notified_at: string | null
  created_at: string
}

export type DeficiencyCompetency = {
  competency_key: string
  competency_label: string
  score: number
  fto_recommendation: string
}

export type DeficiencyForm = {
  id: string
  pairing_id: string
  weekly_session_id: string
  created_by: string
  created_at: string
  status:
    | 'submitted'
    | 'coordinator_reviewing'
    | 'coaching_active'
    | 'escalated_to_sgt'
    | 'escalated_to_lt'
    | 'resolved'
  priority_level: 'routine' | 'urgent'
  competencies_flagged: DeficiencyCompetency[]
  additional_notes: string | null
  updated_at: string
}

export type DeficiencyFormAction = {
  id: string
  deficiency_form_id: string
  action_level: 'coordinator' | 'fto_sgt' | 'lt'
  actor_id: string
  action_type:
    | 'coordinator_review'
    | 'scheduled_meeting'
    | 'escalate_to_sgt'
    | 'escalate_to_lt'
    | 'resolve'
  action_notes: string | null
  calendar_meeting_id: string | null
  meeting_date: string | null
  meeting_attendees: string[] | null
  created_at: string
}

export type ExcellenceRecognition = {
  id: string
  session_id: string
  competency_key: string
  competency_label: string
  dit_user_id: string
  fto_user_id: string
  explanation: string
  sent_to_recipients: string[]
  created_at: string
}
