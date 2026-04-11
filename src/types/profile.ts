import type { UserRoleValue } from '@/lib/auth/roles'

export type Profile = {
  id: string
  role: UserRoleValue
  full_name: string
  badge_number: string | null
  phone_cell: string | null
  phone_office: string | null
  unit: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}
