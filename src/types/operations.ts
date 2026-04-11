export type CaseTypeRow = {
  id: string
  name: string
  prefix: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type CaseListRow = {
  id: string
  case_number: string
  case_type_id: string
  case_type_name: string | null
  case_type_prefix: string | null
  assigned_detective: string | null
  status: 'active' | 'inactive' | 'closed'
  date_opened: string | null
  notes: string | null
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
  linked_forms_count: number
}
