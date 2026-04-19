import 'server-only'

import { createClient } from '@/lib/supabase/server'

export type TrainingProgramConfig = {
  extension_days_first: number
  extension_days_subsequent: number
  quiz_amber_threshold: number
  quiz_red_threshold: number
  journal_nudge_days: number
  journal_flag_fto_days: number
  survey_expiry_days: number
  program_week_count: number
  updated_at: string
  updated_by: string | null
}

const DEFAULTS: TrainingProgramConfig = {
  extension_days_first: 14,
  extension_days_subsequent: 7,
  quiz_amber_threshold: 80,
  quiz_red_threshold: 60,
  journal_nudge_days: 2,
  journal_flag_fto_days: 3,
  survey_expiry_days: 7,
  program_week_count: 10,
  updated_at: new Date(0).toISOString(),
  updated_by: null,
}

export async function fetchProgramConfig(): Promise<TrainingProgramConfig> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('training_program_config')
    .select('*')
    .eq('id', 1)
    .maybeSingle()
  if (!data) return DEFAULTS
  const r = data as Record<string, unknown>
  return {
    extension_days_first: Number(r.extension_days_first ?? DEFAULTS.extension_days_first),
    extension_days_subsequent: Number(
      r.extension_days_subsequent ?? DEFAULTS.extension_days_subsequent,
    ),
    quiz_amber_threshold: Number(r.quiz_amber_threshold ?? DEFAULTS.quiz_amber_threshold),
    quiz_red_threshold: Number(r.quiz_red_threshold ?? DEFAULTS.quiz_red_threshold),
    journal_nudge_days: Number(r.journal_nudge_days ?? DEFAULTS.journal_nudge_days),
    journal_flag_fto_days: Number(
      r.journal_flag_fto_days ?? DEFAULTS.journal_flag_fto_days,
    ),
    survey_expiry_days: Number(r.survey_expiry_days ?? DEFAULTS.survey_expiry_days),
    program_week_count: Number(r.program_week_count ?? DEFAULTS.program_week_count),
    updated_at: String(r.updated_at ?? DEFAULTS.updated_at),
    updated_by: r.updated_by != null ? String(r.updated_by) : null,
  }
}

export async function updateProgramConfig(
  patch: Partial<Omit<TrainingProgramConfig, 'updated_at' | 'updated_by'>>,
  updated_by: string,
): Promise<TrainingProgramConfig> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('training_program_config')
    .update({ ...patch, updated_at: new Date().toISOString(), updated_by })
    .eq('id', 1)
    .select('*')
    .single()
  if (error) throw new Error(`Failed to update program config: ${error.message}`)
  const r = data as Record<string, unknown>
  return {
    extension_days_first: Number(r.extension_days_first),
    extension_days_subsequent: Number(r.extension_days_subsequent),
    quiz_amber_threshold: Number(r.quiz_amber_threshold),
    quiz_red_threshold: Number(r.quiz_red_threshold),
    journal_nudge_days: Number(r.journal_nudge_days),
    journal_flag_fto_days: Number(r.journal_flag_fto_days),
    survey_expiry_days: Number(r.survey_expiry_days),
    program_week_count: Number(r.program_week_count),
    updated_at: String(r.updated_at),
    updated_by: r.updated_by != null ? String(r.updated_by) : null,
  }
}
