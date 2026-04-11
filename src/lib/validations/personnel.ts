import * as z from 'zod'

import { UserRole } from '@/lib/auth/roles'

export const personnelFormSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().nullable().optional(),
  full_name: z.string().min(1, 'Name is required'),
  badge_number: z.string().nullable().optional(),
  role_label: z.string().nullable().optional(),
  system_role: z.nativeEnum(UserRole),
  unit: z.string().nullable().optional(),
  assignment: z.string().nullable().optional(),
  phone_cell: z.string().nullable().optional(),
  phone_office: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  photo_url: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
})

export type PersonnelFormValues = z.infer<typeof personnelFormSchema>
