export type EvaluationType = 'daily' | 'weekly' | 'phase_end' | 'special'

export type OverallRating =
  | 'excellent'
  | 'satisfactory'
  | 'needs_improvement'
  | 'unsatisfactory'

export type EvaluationStatus = 'draft' | 'submitted' | 'approved'

export type DitRecordStatus = 'active' | 'on_hold' | 'suspended' | 'graduated' | 'separated'

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
  expected_graduation_date: string | null
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
  /**
   * True when the DIT was absent for every workday in this week (overlap
   * with an acknowledged dit_absence_records). Scoring is skipped; eval
   * surfaces show a "DIT absent" banner.
   */
  dit_absent_flag: boolean
  dit_absent_reason: string | null
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
  /**
   * Days to extend the DIT's expected_graduation_date by once the LT signs
   * the route. Default 14 on the DIT's first remedial of the program, 7 on
   * subsequent remedials. LT or Capt may override at sign-time within
   * 0..60 (enforced by CHECK constraint in migration 20260429120000).
   */
  extension_days: number
  /** User id of LT or Capt who overrode the tier default, if any. */
  extension_override_by: string | null
  /** Set when the LT signature applied the extension to dit_records.expected_graduation_date (idempotent guard). */
  extension_applied_at: string | null
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

// --- Segment B: document signatures, absences, supervisor assignment ---

export const DOC_SIGNATURE_TYPES = [
  'weekly_eval',
  'deficiency',
  'equipment_checkoff',
  'completion_cert',
  'fto_feedback',
  'absence_record',
] as const

export type DocSignatureType = (typeof DOC_SIGNATURE_TYPES)[number]

export type SignatureStatus = 'in_progress' | 'completed' | 'cancelled'

/**
 * Routing step identifiers used in document_signatures.routing_order.
 * 'sgt' is intentionally absent; Training Supervisor replaces it.
 */
export const SIGNATURE_STEPS = [
  'fto',
  'fto_coordinator',
  'training_supervisor',
  'lt',
  'cpt',
  'dit',
] as const

export type SignatureStep = (typeof SIGNATURE_STEPS)[number]

export type DocumentSignatureRow = {
  id: string
  doc_type: DocSignatureType
  doc_id: string
  dit_record_id: string | null
  routing_order: SignatureStep[]
  current_step: number
  current_signer_role: SignatureStep | null
  status: SignatureStatus
  created_by: string
  created_at: string
  updated_at: string
  completed_at: string | null
}

export type SignatureEventRow = {
  id: string
  document_signature_id: string
  step_index: number
  signer_role: SignatureStep
  signer_id: string
  /** Printed name snapshot (from profiles.full_name) at the moment of signing. */
  signer_name: string
  /** Badge number snapshot at sign-time. Null for staff without badges. */
  signer_badge: string | null
  signature_image: string
  biometric_method: string | null
  device_id: string | null
  ip_address: string | null
  signed_at: string
}

export const ABSENCE_KINDS = [
  'illness',
  'oji',
  'bereavement',
  'personal',
  'sick',
] as const

export type AbsenceKind = (typeof ABSENCE_KINDS)[number]

export const ABSENCE_KIND_LABELS: Record<AbsenceKind, string> = {
  illness: 'Illness (extended)',
  oji: 'On-the-job injury',
  bereavement: 'Bereavement',
  personal: 'Personal',
  sick: 'Sick day',
}

export type AbsenceStatus = 'draft' | 'submitted' | 'acknowledged' | 'closed'

export type DitAbsenceRecord = {
  id: string
  dit_record_id: string
  start_date: string
  end_date: string | null
  kind: AbsenceKind
  description: string | null
  status: AbsenceStatus
  originated_by: string
  created_at: string
  updated_at: string
}

export type TrainingProgramConfig = {
  id: 1
  extension_days_first: number
  extension_days_subsequent: number
  quiz_amber_threshold: number
  quiz_red_threshold: number
  journal_nudge_days: number
  journal_flag_fto_days: number
  survey_expiry_days: number
  updated_at: string
  updated_by: string | null
}

// --- Segment C: quizzes, journal, FTO CTR, missed-day nudges ---

export type QuizTier = 'green' | 'amber' | 'red'

export const QUIZ_TIER_LABELS: Record<QuizTier, string> = {
  green: 'On track',
  amber: 'Needs attention',
  red: 'Escalated',
}

export type TrainingQuiz = {
  id: string
  title: string
  description: string | null
  topic: string | null
  is_published: boolean
  pass_threshold_green: number
  pass_threshold_amber: number
  created_by: string
  created_at: string
  updated_at: string
}

export type TrainingQuizQuestion = {
  id: string
  quiz_id: string
  prompt: string
  display_order: number
  explanation: string | null
  created_at: string
}

export type TrainingQuizOption = {
  id: string
  question_id: string
  label: string
  /** Omitted by the public-takes API; only training writers see this. */
  is_correct?: boolean
  display_order: number
  created_at: string
}

export type QuizAttemptStatus = 'in_progress' | 'submitted' | 'abandoned'

export type TrainingQuizAttempt = {
  id: string
  quiz_id: string
  dit_record_id: string
  attempted_by: string
  started_at: string
  submitted_at: string | null
  score_percent: number | null
  tier: QuizTier | null
  status: QuizAttemptStatus
  created_at: string
}

export type TrainingQuizAttemptAnswer = {
  id: string
  attempt_id: string
  question_id: string
  option_id: string | null
  is_correct: boolean | null
  created_at: string
}

export type DitJournalEntry = {
  id: string
  dit_record_id: string
  entry_date: string
  body: string
  created_by: string
  created_at: string
  updated_at: string
}

export type DitJournalReview = {
  id: string
  entry_id: string
  reviewer_id: string
  notes: string | null
  created_at: string
}

export type FtoCtrEntry = {
  id: string
  dit_record_id: string
  pairing_id: string | null
  fto_id: string
  entry_date: string
  contact_hours: number | null
  body: string
  created_at: string
  updated_at: string
}

export type MissedDayNudgeKind = 'dit_self' | 'fto_notify'

export type DitMissedDayNudge = {
  id: string
  dit_record_id: string
  nudge_date: string
  nudge_kind: MissedDayNudgeKind
  created_at: string
}
