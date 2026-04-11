import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { isUserRole } from '@/lib/auth/roles'
import type { UserRoleValue } from '@/lib/auth/roles'
import type { PersonnelDirectoryRow } from '@/types/personnel'
import { maskPersonnelRow } from '@/lib/directory/mask'

export type PersonnelListFilters = {
  search?: string
  status: 'all' | 'active' | 'inactive'
  unit?: string
  systemRole?: UserRoleValue | 'all'
}

function mapRow(raw: Record<string, unknown>): PersonnelDirectoryRow | null {
  if (typeof raw.id !== 'string' || typeof raw.full_name !== 'string') return null
  const sr = raw.system_role
  if (typeof sr !== 'string' || !isUserRole(sr)) return null
  return {
    id: raw.id as string,
    user_id: (raw.user_id as string | null) ?? null,
    full_name: raw.full_name as string,
    badge_number: (raw.badge_number as string | null) ?? null,
    role_label: (raw.role_label as string | null) ?? null,
    system_role: sr,
    unit: (raw.unit as string | null) ?? null,
    assignment: (raw.assignment as string | null) ?? null,
    phone_cell: (raw.phone_cell as string | null) ?? null,
    phone_office: (raw.phone_office as string | null) ?? null,
    email: (raw.email as string | null) ?? null,
    photo_url: (raw.photo_url as string | null) ?? null,
    is_active: Boolean(raw.is_active),
    notes: (raw.notes as string | null) ?? null,
    created_at: String(raw.created_at),
    updated_at: String(raw.updated_at),
  }
}

export async function fetchPersonnelDirectory(
  viewerRole: UserRoleValue,
  viewerIsAdminScope: boolean,
  filters: PersonnelListFilters
): Promise<PersonnelDirectoryRow[]> {
  const supabase = await createClient()
  let q = supabase.from('personnel_directory').select('*').order('full_name')

  if (filters.status === 'active') {
    q = q.eq('is_active', true)
  } else if (filters.status === 'inactive') {
    q = q.eq('is_active', false)
  }

  if (filters.unit && filters.unit !== 'all') {
    q = q.eq('unit', filters.unit)
  }

  if (filters.systemRole && filters.systemRole !== 'all') {
    q = q.eq('system_role', filters.systemRole)
  }

  const { data, error } = await q
  if (error || !data) return []

  let rows = data
    .map((r) => mapRow(r as Record<string, unknown>))
    .filter((r): r is PersonnelDirectoryRow => r !== null)

  const s = filters.search?.trim().toLowerCase()
  if (s) {
    rows = rows.filter(
      (r) =>
        r.full_name.toLowerCase().includes(s) ||
        (r.badge_number?.toLowerCase().includes(s) ?? false) ||
        (r.unit?.toLowerCase().includes(s) ?? false)
    )
  }

  return rows.map((r) => maskPersonnelRow(r, viewerRole, viewerIsAdminScope))
}

export async function fetchPersonnelById(
  id: string,
  viewerRole: UserRoleValue,
  viewerIsAdminScope: boolean
): Promise<PersonnelDirectoryRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('personnel_directory')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  const row = mapRow(data as Record<string, unknown>)
  if (!row) return null
  return maskPersonnelRow(row, viewerRole, viewerIsAdminScope)
}

export async function fetchPersonnelByUserIds(
  userIds: string[]
): Promise<
  {
    id: string
    user_id: string | null
    full_name: string
    badge_number: string | null
    phone_cell: string | null
  }[]
> {
  if (userIds.length === 0) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('personnel_directory')
    .select('id, user_id, full_name, badge_number, phone_cell')
    .in('user_id', userIds)
  if (error || !data) return []
  return data as {
    id: string
    user_id: string | null
    full_name: string
    badge_number: string | null
    phone_cell: string | null
  }[]
}

export async function fetchPersonnelAssignable(): Promise<
  { user_id: string; full_name: string }[]
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('personnel_directory')
    .select('user_id, full_name')
    .eq('is_active', true)
    .not('user_id', 'is', null)
    .order('full_name')
  if (error || !data) return []
  return data
    .filter((r): r is { user_id: string; full_name: string } => Boolean(r.user_id))
    .map((r) => ({
      user_id: r.user_id as string,
      full_name: r.full_name as string,
    }))
}

export async function fetchDistinctUnits(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('personnel_directory')
    .select('unit')
    .not('unit', 'is', null)
  if (error || !data) return []
  const set = new Set<string>()
  for (const r of data) {
    const u = (r as { unit: string | null }).unit
    if (u) set.add(u)
  }
  return [...set].sort()
}
