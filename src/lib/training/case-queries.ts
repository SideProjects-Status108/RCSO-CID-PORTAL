import { createClient } from '@/lib/supabase/server'
import type {
  CallOutLog,
  CaseAssignment,
  CaseRole,
  CaseStatus,
} from '@/types/training'

function fail(msg: string, err?: unknown): never {
  const cause = err instanceof Error ? `: ${err.message}` : err ? `: ${String(err)}` : ''
  throw new Error(`${msg}${cause}`)
}

/**
 * Supabase I/O for case_assignments + call_out_logs (Prompt 7).
 *
 * RLS does the heavy lifting — each helper just issues the row query and
 * lets Supabase filter. Inserts/updates still have to pass their
 * WITH CHECK clauses, so this file does NOT attempt to re-implement the
 * permission checks in JS.
 */

function mapCase(r: Record<string, unknown>): CaseAssignment {
  return {
    id: String(r.id),
    dit_record_id: String(r.dit_record_id),
    case_number: (r.case_number as string | null) ?? null,
    complaint_number: (r.complaint_number as string | null) ?? null,
    title: String(r.title),
    dit_role: r.dit_role as CaseRole,
    status: r.status as CaseStatus,
    assigned_at: String(r.assigned_at),
    closed_at: (r.closed_at as string | null) ?? null,
    assigned_by: String(r.assigned_by),
    notes: (r.notes as string | null) ?? null,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  }
}

function mapCallOut(r: Record<string, unknown>): CallOutLog {
  return {
    id: String(r.id),
    dit_record_id: String(r.dit_record_id),
    responded_at: String(r.responded_at),
    duration_minutes: Number(r.duration_minutes ?? 0),
    incident_type: (r.incident_type as string | null) ?? null,
    case_number: (r.case_number as string | null) ?? null,
    off_duty: Boolean(r.off_duty),
    comp_time_eligible: Boolean(r.comp_time_eligible),
    responded_with: (r.responded_with as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    logged_by: String(r.logged_by),
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  }
}

export async function listCases(dit_record_id: string): Promise<CaseAssignment[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('case_assignments')
    .select('*')
    .eq('dit_record_id', dit_record_id)
    .order('assigned_at', { ascending: false })
  if (error) fail('Failed to load case assignments', error)
  return (data ?? []).map((r) => mapCase(r as Record<string, unknown>))
}

export async function createCase(input: {
  dit_record_id: string
  title: string
  case_number?: string | null
  complaint_number?: string | null
  dit_role?: CaseRole
  notes?: string | null
  assigned_by: string
}): Promise<CaseAssignment> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('case_assignments')
    .insert({
      dit_record_id: input.dit_record_id,
      title: input.title,
      case_number: input.case_number ?? null,
      complaint_number: input.complaint_number ?? null,
      dit_role: input.dit_role ?? 'assist',
      notes: input.notes ?? null,
      assigned_by: input.assigned_by,
    })
    .select('*')
    .single()
  if (error || !data) fail('Failed to create case assignment', error)
  return mapCase(data as Record<string, unknown>)
}

export async function updateCase(
  id: string,
  patch: Partial<{
    title: string
    case_number: string | null
    complaint_number: string | null
    dit_role: CaseRole
    status: CaseStatus
    closed_at: string | null
    notes: string | null
  }>,
): Promise<CaseAssignment> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('case_assignments')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error || !data) fail('Failed to update case assignment', error)
  return mapCase(data as Record<string, unknown>)
}

export async function listCallOuts(dit_record_id: string): Promise<CallOutLog[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('call_out_logs')
    .select('*')
    .eq('dit_record_id', dit_record_id)
    .order('responded_at', { ascending: false })
  if (error) fail('Failed to load call-out logs', error)
  return (data ?? []).map((r) => mapCallOut(r as Record<string, unknown>))
}

export async function createCallOut(input: {
  dit_record_id: string
  responded_at: string
  duration_minutes: number
  incident_type?: string | null
  case_number?: string | null
  off_duty?: boolean
  comp_time_eligible?: boolean
  responded_with?: string | null
  notes?: string | null
  logged_by: string
}): Promise<CallOutLog> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('call_out_logs')
    .insert({
      dit_record_id: input.dit_record_id,
      responded_at: input.responded_at,
      duration_minutes: input.duration_minutes,
      incident_type: input.incident_type ?? null,
      case_number: input.case_number ?? null,
      off_duty: input.off_duty ?? false,
      comp_time_eligible: input.comp_time_eligible ?? false,
      responded_with: input.responded_with ?? null,
      notes: input.notes ?? null,
      logged_by: input.logged_by,
    })
    .select('*')
    .single()
  if (error || !data) fail('Failed to create call-out log', error)
  return mapCallOut(data as Record<string, unknown>)
}
