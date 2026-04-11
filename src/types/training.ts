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
