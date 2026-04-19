import { createClient } from '@/lib/supabase/server'
import type {
  Pble,
  PbleArtifact,
  PbleRubricCriterion,
  PbleRubricScore,
  PbleScenarioKind,
  PbleStatus,
  PbleTemplate,
} from '@/types/training'

/**
 * Supabase I/O for pto_pble_templates, pto_pbles, and pto_pble_artifacts.
 * RLS gates visibility; this file just mirrors the shapes and enforces
 * the status-transition rules the database can't (e.g. "DIT can flip
 * assigned → in_progress but not → scored").
 */

function parseRubric(v: unknown): PbleRubricCriterion[] {
  if (!Array.isArray(v)) return []
  return v
    .map((r) => {
      if (!r || typeof r !== 'object') return null
      const obj = r as Record<string, unknown>
      if (typeof obj.key !== 'string' || typeof obj.label !== 'string') return null
      return {
        key: obj.key,
        label: obj.label,
        max_score: typeof obj.max_score === 'number' ? obj.max_score : 5,
      }
    })
    .filter((x): x is PbleRubricCriterion => x !== null)
}

function parseScores(v: unknown): PbleRubricScore[] {
  if (!Array.isArray(v)) return []
  return v
    .map((r) => {
      if (!r || typeof r !== 'object') return null
      const obj = r as Record<string, unknown>
      if (typeof obj.criterion_key !== 'string') return null
      return {
        criterion_key: obj.criterion_key,
        score: typeof obj.score === 'number' ? obj.score : 0,
        notes: (obj.notes as string | null) ?? null,
      }
    })
    .filter((x): x is PbleRubricScore => x !== null)
}

function mapTemplate(r: Record<string, unknown>): PbleTemplate {
  return {
    id: String(r.id),
    scenario_kind: r.scenario_kind as PbleScenarioKind,
    title: String(r.title),
    description: (r.description as string | null) ?? null,
    recommended_phase: Number(r.recommended_phase ?? 1),
    rubric: parseRubric(r.rubric),
    is_active: Boolean(r.is_active ?? true),
    created_by: (r.created_by as string | null) ?? null,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  }
}

function mapPble(r: Record<string, unknown>): Pble {
  return {
    id: String(r.id),
    dit_record_id: String(r.dit_record_id),
    template_id: (r.template_id as string | null) ?? null,
    phase: Number(r.phase ?? 1),
    scenario_kind: r.scenario_kind as PbleScenarioKind,
    title: String(r.title),
    rubric: parseRubric(r.rubric),
    rubric_scores: parseScores(r.rubric_scores),
    status: r.status as PbleStatus,
    assigned_by: String(r.assigned_by),
    assigned_at: String(r.assigned_at),
    due_at: (r.due_at as string | null) ?? null,
    submitted_at: (r.submitted_at as string | null) ?? null,
    scored_by: (r.scored_by as string | null) ?? null,
    scored_at: (r.scored_at as string | null) ?? null,
    overall_notes: (r.overall_notes as string | null) ?? null,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  }
}

function mapArtifact(r: Record<string, unknown>): PbleArtifact {
  return {
    id: String(r.id),
    pble_id: String(r.pble_id),
    uploaded_by: String(r.uploaded_by),
    title: String(r.title),
    storage_bucket: String(r.storage_bucket),
    object_path: String(r.object_path),
    mime_type: String(r.mime_type),
    byte_size: Number(r.byte_size ?? 0),
    created_at: String(r.created_at),
  }
}

export async function listTemplates(): Promise<PbleTemplate[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pto_pble_templates')
    .select('*')
    .eq('is_active', true)
    .order('scenario_kind')
    .order('recommended_phase')
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapTemplate(r as Record<string, unknown>))
}

export async function listPblesForDit(dit_record_id: string): Promise<Pble[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pto_pbles')
    .select('*')
    .eq('dit_record_id', dit_record_id)
    .order('assigned_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapPble(r as Record<string, unknown>))
}

export async function fetchPbleById(id: string): Promise<Pble | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('pto_pbles').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return mapPble(data as Record<string, unknown>)
}

export async function assignPble(input: {
  dit_record_id: string
  template_id?: string | null
  phase: number
  scenario_kind: PbleScenarioKind
  title: string
  rubric: PbleRubricCriterion[]
  due_at?: string | null
  assigned_by: string
}): Promise<Pble> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pto_pbles')
    .insert({
      dit_record_id: input.dit_record_id,
      template_id: input.template_id ?? null,
      phase: input.phase,
      scenario_kind: input.scenario_kind,
      title: input.title,
      rubric: input.rubric,
      due_at: input.due_at ?? null,
      assigned_by: input.assigned_by,
    })
    .select('*')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to assign PBLE')
  return mapPble(data as Record<string, unknown>)
}

export async function updatePble(
  id: string,
  patch: Partial<{
    status: PbleStatus
    rubric_scores: PbleRubricScore[]
    overall_notes: string | null
    submitted_at: string | null
    scored_by: string | null
    scored_at: string | null
  }>,
): Promise<Pble> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pto_pbles')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to update PBLE')
  return mapPble(data as Record<string, unknown>)
}

export async function listArtifacts(pble_id: string): Promise<PbleArtifact[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pto_pble_artifacts')
    .select('*')
    .eq('pble_id', pble_id)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapArtifact(r as Record<string, unknown>))
}

export async function insertArtifact(input: {
  pble_id: string
  uploaded_by: string
  title: string
  object_path: string
  mime_type: string
  byte_size: number
}): Promise<PbleArtifact> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pto_pble_artifacts')
    .insert({
      pble_id: input.pble_id,
      uploaded_by: input.uploaded_by,
      title: input.title,
      storage_bucket: 'training-documents',
      object_path: input.object_path,
      mime_type: input.mime_type,
      byte_size: input.byte_size,
    })
    .select('*')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to register artifact')
  return mapArtifact(data as Record<string, unknown>)
}

export async function deleteArtifact(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: row } = await supabase
    .from('pto_pble_artifacts')
    .select('object_path, storage_bucket')
    .eq('id', id)
    .maybeSingle()
  const { error } = await supabase.from('pto_pble_artifacts').delete().eq('id', id)
  if (error) throw new Error(error.message)
  if (row) {
    const r = row as { object_path: string; storage_bucket: string }
    await supabase.storage.from(r.storage_bucket).remove([r.object_path])
  }
}

export async function fetchPbleOwnerUserId(pble_id: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('pto_pbles')
    .select('dit_record_id, dit_records!inner(user_id)')
    .eq('id', pble_id)
    .maybeSingle()
  if (!data) return null
  const rec = data as { dit_records: { user_id: string } | { user_id: string }[] }
  const inner = Array.isArray(rec.dit_records) ? rec.dit_records[0] : rec.dit_records
  return inner?.user_id ?? null
}
