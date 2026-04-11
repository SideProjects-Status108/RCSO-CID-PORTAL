export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'date'
  | 'select'
  | 'checkbox'
  | 'signature'
  | 'number'

export type FormFieldDefinition = {
  id: string
  label: string
  type: FormFieldType
  required: boolean
  options: string[]
  placeholder: string
  section: string
}

export type FormTemplateRow = {
  id: string
  name: string
  category: string | null
  version: number
  fields_schema: FormFieldDefinition[]
  requires_approval: boolean
  is_published: boolean
  is_archived: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export type FormSubmissionStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'

export type FormSubmissionRow = {
  id: string
  template_id: string
  template_version: number
  submitted_by: string
  case_id: string | null
  form_data: Record<string, unknown>
  status: FormSubmissionStatus
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  created_at: string
  updated_at: string
}

export type CaseRow = {
  id: string
  case_number: string
  case_type: string | null
  assigned_detective: string | null
  status: 'active' | 'inactive' | 'closed'
  date_opened: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}
