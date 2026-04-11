import type { UserRoleValue } from '@/lib/auth/roles'

export type PersonnelDirectoryRow = {
  id: string
  user_id: string | null
  full_name: string
  badge_number: string | null
  role_label: string | null
  system_role: UserRoleValue
  unit: string | null
  assignment: string | null
  phone_cell: string | null
  phone_office: string | null
  email: string | null
  photo_url: string | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}
