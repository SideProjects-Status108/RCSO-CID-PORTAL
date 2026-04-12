'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { hasRole, UserRole, USER_ROLE_VALUES, type UserRoleValue } from '@/lib/auth/roles'
import * as z from 'zod'

const changePasswordSchema = z
  .object({
    current: z.string().min(1, 'Current password required'),
    next: z.string().min(8, 'Use at least 8 characters'),
    confirm: z.string().min(1, 'Confirm password'),
  })
  .refine((d) => d.next === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })

export async function updateOwnProfileAction(input: {
  full_name: string
  phone_cell: string | null
  phone_office: string | null
  unit: string | null
}) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: input.full_name.trim(),
      phone_cell: input.phone_cell?.trim() || null,
      phone_office: input.phone_office?.trim() || null,
      unit: input.unit?.trim() || null,
    })
    .eq('id', session.user.id)
  if (error) throw new Error(error.message)

  const { data: pd } = await supabase
    .from('personnel_directory')
    .select('id')
    .eq('user_id', session.user.id)
    .maybeSingle()
  if (pd?.id) {
    await supabase
      .from('personnel_directory')
      .update({
        full_name: input.full_name.trim(),
        phone_cell: input.phone_cell?.trim() || null,
        phone_office: input.phone_office?.trim() || null,
        unit: input.unit?.trim() || null,
      })
      .eq('id', pd.id)
  }

  revalidatePath('/settings')
  revalidatePath('/personnel')
  revalidatePath('/directory')
  revalidatePath('/dashboard')
}

export async function changePasswordAction(input: unknown) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')

  const parsed = changePasswordSchema.safeParse(input)
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Invalid input')

  const supabase = await createClient()
  const { error: signErr } = await supabase.auth.signInWithPassword({
    email: session.user.email ?? '',
    password: parsed.data.current,
  })
  if (signErr) throw new Error('Current password is incorrect')

  const { error } = await supabase.auth.updateUser({ password: parsed.data.next })
  if (error) throw new Error(error.message)

  revalidatePath('/settings')
}

export async function uploadOwnProfilePhotoAction(formData: FormData) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')

  const supabase = await createClient()
  const { data: pd, error: pe } = await supabase
    .from('personnel_directory')
    .select('id')
    .eq('user_id', session.user.id)
    .maybeSingle()
  if (pe || !pd?.id) throw new Error('Personnel profile not linked')

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) throw new Error('Missing file')

  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${pd.id}/${crypto.randomUUID()}.${ext}`
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

  const { error } = await supabase.from('personnel_directory').update({ photo_url: publicUrl }).eq('id', pd.id)
  if (error) throw new Error(error.message)

  revalidatePath('/settings')
  revalidatePath('/personnel')
  revalidatePath('/directory')
  return { publicUrl }
}

export type AdminProfileRow = {
  id: string
  full_name: string
  badge_number: string | null
  role: UserRoleValue
  is_active: boolean
  created_at: string
}

export async function listProfilesForAdminAction(): Promise<AdminProfileRow[]> {
  const session = await getSessionUserWithProfile()
  if (!session || session.profile.role !== UserRole.admin) throw new Error('Forbidden')

  const supabase = await createClient()
  const { data: profs, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active, created_at')
    .order('created_at', { ascending: false })
  if (error || !profs) return []

  const ids = profs.map((p) => String(p.id))
  const { data: pers } = await supabase
    .from('personnel_directory')
    .select('user_id, badge_number')
    .in('user_id', ids)

  const badgeByUser = new Map<string, string | null>()
  for (const r of pers ?? []) {
    badgeByUser.set(String(r.user_id), r.badge_number != null ? String(r.badge_number) : null)
  }

  return profs.map((p) => ({
    id: String(p.id),
    full_name: String(p.full_name ?? ''),
    badge_number: badgeByUser.get(String(p.id)) ?? null,
    role: p.role as UserRoleValue,
    is_active: Boolean(p.is_active),
    created_at: String(p.created_at ?? ''),
  }))
}

export async function updateUserRoleAction(targetUserId: string, role: UserRoleValue) {
  const session = await getSessionUserWithProfile()
  if (!session || session.profile.role !== UserRole.admin) throw new Error('Forbidden')
  if (!USER_ROLE_VALUES.includes(role)) throw new Error('Invalid role')

  const supabase = await createClient()
  const { error } = await supabase.from('profiles').update({ role }).eq('id', targetUserId)
  if (error) throw new Error(error.message)

  await supabase.from('personnel_directory').update({ system_role: role }).eq('user_id', targetUserId)

  if (targetUserId === session.user.id) {
    const cookieStore = await cookies()
    cookieStore.delete('rcso-role')
  }

  revalidatePath('/settings')
  revalidatePath('/personnel')
  revalidatePath('/directory')
}

export async function setUserActiveAction(targetUserId: string, is_active: boolean) {
  const session = await getSessionUserWithProfile()
  if (!session || session.profile.role !== UserRole.admin) throw new Error('Forbidden')

  const supabase = await createClient()
  const { error } = await supabase.from('profiles').update({ is_active }).eq('id', targetUserId)
  if (error) throw new Error(error.message)

  if (targetUserId === session.user.id) {
    const cookieStore = await cookies()
    cookieStore.delete('rcso-role')
  }

  revalidatePath('/settings')
}

export async function inviteUserByEmailAction(email: string) {
  const session = await getSessionUserWithProfile()
  if (!session || session.profile.role !== UserRole.admin) throw new Error('Forbidden')

  const admin = createServiceRoleClient()
  if (!admin) throw new Error('Server misconfigured')

  const e = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error('Invalid email')

  const vercel = process.env.VERCEL_URL
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (vercel ? `https://${vercel}` : 'http://localhost:3000')

  const { error } = await admin.auth.admin.inviteUserByEmail(e, {
    redirectTo: `${origin.replace(/\/$/, '')}/auth/callback`,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/settings')
}
