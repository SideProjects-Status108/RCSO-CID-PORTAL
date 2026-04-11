'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { hasRole, UserRole } from '@/lib/auth/roles'
import { fetchFormSubmissionsForCase } from '@/lib/operations/queries'

function canCreateCase(role: string) {
  return role !== UserRole.dit
}

function canManageCaseTypes(role: Parameters<typeof hasRole>[0]) {
  return hasRole(role, [UserRole.admin, UserRole.supervision_admin])
}

export async function createCaseAction(input: {
  case_number: string
  case_type_id: string
  date_opened: string
  notes: string | null
  assigned_detective: string | null
}) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')
  if (!canCreateCase(session.profile.role)) throw new Error('Forbidden')

  const supabase = await createClient()
  const { data: ct, error: ce } = await supabase
    .from('case_types')
    .select('prefix')
    .eq('id', input.case_type_id)
    .maybeSingle()
  if (ce || !ct) throw new Error('Invalid case type')

  const prefix = String(ct.prefix ?? '')
  const num = input.case_number.trim()
  if (prefix && !num.toUpperCase().startsWith(prefix.toUpperCase())) {
    throw new Error(`Case number must start with prefix ${prefix}`)
  }

  const { error } = await supabase.from('cases').insert({
    case_number: num,
    case_type_id: input.case_type_id,
    date_opened: input.date_opened,
    notes: input.notes?.trim() || null,
    assigned_detective: input.assigned_detective,
    created_by: session.user.id,
    status: 'active',
  })

  if (error) throw new Error(error.message)
  revalidatePath('/operations')
  revalidatePath('/dashboard')
}

export async function updateCaseAction(input: {
  caseId: string
  status?: 'active' | 'inactive' | 'closed'
  notes?: string | null
  assigned_detective?: string | null
}) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')

  const supabase = await createClient()
  const { data: row, error: le } = await supabase
    .from('cases')
    .select('id, created_by, assigned_detective, status')
    .eq('id', input.caseId)
    .maybeSingle()
  if (le || !row) throw new Error('Not found')

  const isSupervision = hasRole(session.profile.role, [
    UserRole.admin,
    UserRole.supervision_admin,
    UserRole.supervision,
  ])
  const isOwner =
    String(row.created_by) === session.user.id ||
    String(row.assigned_detective) === session.user.id

  if (!isSupervision && !isOwner) throw new Error('Forbidden')

  const patch: Record<string, unknown> = {}
  if (input.status !== undefined) patch.status = input.status
  if (input.notes !== undefined) patch.notes = input.notes
  if (input.assigned_detective !== undefined && isSupervision) {
    patch.assigned_detective = input.assigned_detective
  }

  const { error } = await supabase.from('cases').update(patch).eq('id', input.caseId)
  if (error) throw new Error(error.message)
  revalidatePath('/operations')
  revalidatePath('/dashboard')
}

export async function upsertCaseTypeAction(input: {
  id?: string | null
  name: string
  prefix: string
  description: string | null
  is_active: boolean
}) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')
  if (!canManageCaseTypes(session.profile.role)) throw new Error('Forbidden')

  const supabase = await createClient()
  if (input.id) {
    const { error } = await supabase
      .from('case_types')
      .update({
        name: input.name.trim(),
        prefix: input.prefix.trim(),
        description: input.description?.trim() || null,
        is_active: input.is_active,
      })
      .eq('id', input.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('case_types').insert({
      name: input.name.trim(),
      prefix: input.prefix.trim(),
      description: input.description?.trim() || null,
      is_active: input.is_active,
    })
    if (error) throw new Error(error.message)
  }
  revalidatePath('/operations')
  revalidatePath('/operations/case-types')
}

export async function fetchFormSubmissionsForCaseAction(caseId: string) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')
  return fetchFormSubmissionsForCase(caseId)
}
