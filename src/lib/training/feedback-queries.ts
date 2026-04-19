import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type {
  FtoFeedbackRatings,
  FtoFeedbackStatus,
  FtoFeedbackSurvey,
} from '@/types/training'

function fail(msg: string, err?: unknown): never {
  const suffix = err instanceof Error ? `: ${err.message}` : ''
  throw new Error(`${msg}${suffix}`)
}

function parseRatings(raw: unknown): FtoFeedbackRatings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: FtoFeedbackRatings = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v)) {
      out[k as keyof FtoFeedbackRatings] = v
    }
  }
  return out
}

function mapRow(r: Record<string, unknown>): FtoFeedbackSurvey {
  return {
    id: String(r.id),
    dit_record_id: String(r.dit_record_id),
    fto_id: String(r.fto_id),
    pairing_id: r.pairing_id != null ? String(r.pairing_id) : null,
    status: r.status as FtoFeedbackStatus,
    ratings: parseRatings(r.ratings),
    comments: r.comments != null ? String(r.comments) : null,
    signature_route_id: r.signature_route_id != null ? String(r.signature_route_id) : null,
    submitted_at: r.submitted_at != null ? String(r.submitted_at) : null,
    acknowledged_at: r.acknowledged_at != null ? String(r.acknowledged_at) : null,
    voided_at: r.voided_at != null ? String(r.voided_at) : null,
    voided_by: r.voided_by != null ? String(r.voided_by) : null,
    void_reason: r.void_reason != null ? String(r.void_reason) : null,
    created_at: String(r.created_at ?? ''),
    updated_at: String(r.updated_at ?? ''),
  }
}

export async function listSurveysForDit(
  dit_record_id: string,
): Promise<FtoFeedbackSurvey[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('fto_feedback_surveys')
    .select('*')
    .eq('dit_record_id', dit_record_id)
    .order('created_at', { ascending: false })
  if (error) fail('Failed to load feedback surveys', error)
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>))
}

export async function listSurveysForFto(fto_id: string): Promise<FtoFeedbackSurvey[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('fto_feedback_surveys')
    .select('*')
    .eq('fto_id', fto_id)
    .in('status', ['submitted', 'acknowledged'])
    .order('created_at', { ascending: false })
  if (error) fail('Failed to load feedback surveys', error)
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>))
}

export async function listAllSubmittedSurveys(): Promise<FtoFeedbackSurvey[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('fto_feedback_surveys')
    .select('*')
    .in('status', ['submitted', 'acknowledged'])
    .order('created_at', { ascending: false })
  if (error) fail('Failed to load feedback surveys', error)
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>))
}

export async function fetchSurveyById(id: string): Promise<FtoFeedbackSurvey | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('fto_feedback_surveys')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) fail('Failed to load feedback survey', error)
  return data ? mapRow(data as Record<string, unknown>) : null
}

export async function upsertSurveyDraft(input: {
  dit_record_id: string
  fto_id: string
  pairing_id: string | null
  ratings: FtoFeedbackRatings
  comments: string | null
}): Promise<FtoFeedbackSurvey> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('fto_feedback_surveys')
    .upsert(
      {
        dit_record_id: input.dit_record_id,
        fto_id: input.fto_id,
        pairing_id: input.pairing_id,
        ratings: input.ratings,
        comments: input.comments,
        status: 'draft',
      },
      {
        onConflict:
          "dit_record_id,fto_id,pairing_id",
      },
    )
    .select('*')
    .single()
  if (error) fail('Failed to upsert feedback survey', error)
  return mapRow(data as Record<string, unknown>)
}

export async function updateSurveyDraft(input: {
  id: string
  ratings?: FtoFeedbackRatings
  comments?: string | null
}): Promise<FtoFeedbackSurvey> {
  const supabase = await createClient()
  const patch: Record<string, unknown> = {}
  if (input.ratings) patch.ratings = input.ratings
  if (input.comments !== undefined) patch.comments = input.comments
  const { data, error } = await supabase
    .from('fto_feedback_surveys')
    .update(patch)
    .eq('id', input.id)
    .select('*')
    .single()
  if (error) fail('Failed to update feedback survey', error)
  return mapRow(data as Record<string, unknown>)
}

export async function markSurveySubmitted(
  id: string,
  signature_route_id: string | null,
): Promise<FtoFeedbackSurvey> {
  const supabase = await createClient()
  const patch: Record<string, unknown> = {
    status: 'submitted',
    submitted_at: new Date().toISOString(),
  }
  if (signature_route_id) patch.signature_route_id = signature_route_id
  const { data, error } = await supabase
    .from('fto_feedback_surveys')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) fail('Failed to mark survey submitted', error)
  return mapRow(data as Record<string, unknown>)
}

export async function markSurveyAcknowledged(id: string): Promise<FtoFeedbackSurvey> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('fto_feedback_surveys')
    .update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()
  if (error) fail('Failed to mark survey acknowledged', error)
  return mapRow(data as Record<string, unknown>)
}

export async function voidSurvey(params: {
  id: string
  voided_by: string
  void_reason: string | null
}): Promise<FtoFeedbackSurvey> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('fto_feedback_surveys')
    .update({
      status: 'voided',
      voided_by: params.voided_by,
      voided_at: new Date().toISOString(),
      void_reason: params.void_reason,
    })
    .eq('id', params.id)
    .select('*')
    .single()
  if (error) fail('Failed to void survey', error)
  return mapRow(data as Record<string, unknown>)
}
