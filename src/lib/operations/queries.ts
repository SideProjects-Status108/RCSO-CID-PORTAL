import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { CaseListRow, CaseTypeRow } from '@/types/operations'

export async function fetchCaseTypes(includeInactiveForAdmin: boolean): Promise<CaseTypeRow[]> {
  const supabase = await createClient()
  let q = supabase.from('case_types').select('*').order('name')
  if (!includeInactiveForAdmin) {
    q = q.eq('is_active', true)
  }
  const { data, error } = await q
  if (error || !data) return []
  return data.map((r) => ({
    id: String(r.id),
    name: String(r.name ?? ''),
    prefix: String(r.prefix ?? ''),
    description: r.description != null ? String(r.description) : null,
    is_active: Boolean(r.is_active),
    created_at: String(r.created_at ?? ''),
    updated_at: String(r.updated_at ?? ''),
  }))
}

export async function fetchCaseById(id: string): Promise<CaseListRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cases')
    .select(
      `
      *,
      case_types ( name, prefix )
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  const ct = data.case_types as { name?: string; prefix?: string } | null
  const count = await countFormsForCase(id)
  return mapCaseRow(data as Record<string, unknown>, ct, count)
}

async function countFormsForCase(caseId: string): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('form_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('case_id', caseId)
  if (error) return 0
  return count ?? 0
}

function mapCaseRow(
  r: Record<string, unknown>,
  ct: { name?: string; prefix?: string } | null,
  linked: number
): CaseListRow {
  return {
    id: String(r.id),
    case_number: String(r.case_number ?? ''),
    case_type_id: String(r.case_type_id),
    case_type_name: ct?.name ?? null,
    case_type_prefix: ct?.prefix ?? null,
    assigned_detective: r.assigned_detective != null ? String(r.assigned_detective) : null,
    status: r.status as CaseListRow['status'],
    date_opened: r.date_opened != null ? String(r.date_opened) : null,
    notes: r.notes != null ? String(r.notes) : null,
    created_by: String(r.created_by),
    updated_by: r.updated_by != null ? String(r.updated_by) : null,
    latitude:
      r.latitude != null && r.latitude !== ''
        ? Number(r.latitude as number | string)
        : null,
    longitude:
      r.longitude != null && r.longitude !== ''
        ? Number(r.longitude as number | string)
        : null,
    created_at: String(r.created_at ?? ''),
    updated_at: String(r.updated_at ?? ''),
    linked_forms_count: linked,
  }
}

export type CaseListFilters = {
  search?: string
  status?: 'active' | 'inactive' | 'closed' | 'all'
  assigned_detective?: string | 'all'
  case_type_id?: string | 'all'
  date_from?: string | null
  date_to?: string | null
}

export async function fetchCasesList(
  userId: string,
  supervisionPlus: boolean,
  filters: CaseListFilters
): Promise<CaseListRow[]> {
  const supabase = await createClient()
  let q = supabase
    .from('cases')
    .select(
      `
      *,
      case_types ( name, prefix )
    `
    )
    .order('date_opened', { ascending: false })

  if (!supervisionPlus) {
    q = q.or(`assigned_detective.eq.${userId},created_by.eq.${userId}`)
  }

  if (filters.status && filters.status !== 'all') {
    q = q.eq('status', filters.status)
  }
  if (filters.assigned_detective && filters.assigned_detective !== 'all') {
    q = q.eq('assigned_detective', filters.assigned_detective)
  }
  if (filters.case_type_id && filters.case_type_id !== 'all') {
    q = q.eq('case_type_id', filters.case_type_id)
  }
  if (filters.date_from) {
    q = q.gte('date_opened', filters.date_from)
  }
  if (filters.date_to) {
    q = q.lte('date_opened', filters.date_to)
  }

  const { data, error } = await q
  if (error || !data) return []

  const ids = data.map((r) => String((r as Record<string, unknown>).id))
  const counts = await countFormsForCases(ids)

  let rows = data.map((raw) => {
    const r = raw as Record<string, unknown>
    const ct = r.case_types as { name?: string; prefix?: string } | null
    const id = String(r.id)
    return mapCaseRow(r, ct, counts.get(id) ?? 0)
  })

  const s = filters.search?.trim().toLowerCase()
  if (s) {
    rows = rows.filter((c) => c.case_number.toLowerCase().includes(s))
  }
  return rows
}

async function countFormsForCases(caseIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (caseIds.length === 0) return map
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('form_submissions')
    .select('case_id')
    .in('case_id', caseIds)
  if (error || !data) return map
  for (const row of data) {
    const cid = (row as { case_id: string | null }).case_id
    if (!cid) continue
    map.set(cid, (map.get(cid) ?? 0) + 1)
  }
  return map
}

export async function fetchFormSubmissionsForCase(caseId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('form_submissions')
    .select(
      `
      id,
      status,
      created_at,
      form_templates ( name )
    `
    )
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data.map((r) => {
    const ft = r.form_templates as { name?: string } | null
    return {
      id: String(r.id),
      status: String(r.status ?? ''),
      created_at: String(r.created_at ?? ''),
      template_name: ft?.name ?? 'Form',
    }
  })
}

export async function countActiveCasesForUser(userId: string): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .or(`assigned_detective.eq.${userId},created_by.eq.${userId}`)
  if (error) return 0
  return count ?? 0
}

export async function countActiveCasesSupervision(): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
  if (error) return 0
  return count ?? 0
}
