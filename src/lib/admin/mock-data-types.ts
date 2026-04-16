import type { UserRoleValue } from '@/lib/auth/roles'

export type MockAccountSpec = {
  email: string
  full_name: string
  role: UserRoleValue
  badge_number: string
}

export type MockAccountWithPassword = MockAccountSpec & {
  password: string
  id: string
}
