'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { hasRole, UserRole } from '@/lib/auth/roles'
import { personnelFormSchema } from '@/lib/validations/personnel'
import { fetchPersonnelDirectory } from '@/lib/directory/queries'
import type { PersonnelListFilters } from '@/lib/directory/queries'
import type { PersonnelDirectoryRow } from '@/types/personnel'

async function requireSession() {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')
  return session
}

export async function listPersonnelAction(
  filters: PersonnelListFilters
): Promise<PersonnelDirectoryRow[]> {
  const session = await requireSession()
  const adminScope = hasRole(session.profile.role, [
    UserRole.admin,
    UserRole.supervision_admin,
  ])
  return fetchPersonnelDirectory(session.profile.role, adminScope, filters)
}

export async function savePersonnelAction(input: unknown) {
  const session = await requireSession()
  if (
    !hasRole(session.profile.role, [UserRole.admin, UserRole.supervision_admin])
  ) {
    throw new Error('Forbidden')
  }

  const parsed = personnelFormSchema.safeParse(input)
  if (!parsed.success) throw new Error(parsed.error.message)

  const v = parsed.data
  const supabase = await createClient()

  const rawUid = v.user_id?.trim() ?? ''
  const userId =
    rawUid.length > 0 && /^[0-9a-f-]{36}$/i.test(rawUid) ? rawUid : null

  const payload = {
    user_id: userId,
    full_name: v.full_name,
    badge_number: v.badge_number ?? null,
    role_label: v.role_label ?? null,
    system_role: v.system_role,
    unit: v.unit ?? null,
    assignment: v.assignment ?? null,
    phone_cell: v.phone_cell ?? null,
    phone_office: v.phone_office ?? null,
    email: v.email ?? null,
    photo_url: v.photo_url ?? null,
    notes: v.notes ?? null,
    is_active: v.is_active ?? true,
  }

  if (v.id) {
    const { error } = await supabase
      .from('personnel_directory')
      .update(payload)
      .eq('id', v.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('personnel_directory').insert(payload)
    if (error) throw new Error(error.message)
  }

  revalidatePath('/directory')
  revalidatePath('/schedule')
  revalidatePath('/dashboard')
}

export async function deactivatePersonnelAction(id: string) {
  const session = await requireSession()
  if (!hasRole(session.profile.role, [UserRole.admin])) {
    throw new Error('Forbidden')
  }
  const supabase = await createClient()
  const { error } = await supabase
    .from('personnel_directory')
    .update({ is_active: false })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/directory')
  revalidatePath('/dashboard')
}

export async function uploadPersonnelPhotoAction(formData: FormData) {
  const session = await requireSession()
  if (
    !hasRole(session.profile.role, [UserRole.admin, UserRole.supervision_admin])
  ) {
    throw new Error('Forbidden')
  }

  const personnelId = formData.get('personnelId')
  const file = formData.get('file')
  if (typeof personnelId !== 'string' || !personnelId) {
    throw new Error('Missing personnel id')
  }
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Missing file')
  }

  const supabase = await createClient()
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${personnelId}/${crypto.randomUUID()}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: upErr } = await supabase.storage
    .from('personnel-photos')
    .upload(path, buffer, {
      contentType: file.type || 'image/jpeg',
      upsert: true,
    })
  if (upErr) throw new Error(upErr.message)

  const {
    data: { publicUrl },
  } = supabase.storage.from('personnel-photos').getPublicUrl(path)

  const { error } = await supabase
    .from('personnel_directory')
    .update({ photo_url: publicUrl })
    .eq('id', personnelId)
  if (error) throw new Error(error.message)

  revalidatePath('/directory')
  return { publicUrl }
}
