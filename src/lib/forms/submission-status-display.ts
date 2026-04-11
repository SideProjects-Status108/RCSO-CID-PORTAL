import type { FormSubmissionStatus } from '@/types/forms'

export function submissionStatusForStamp(status: FormSubmissionStatus): {
  label: string
  variant: 'neutral' | 'teal' | 'gold' | 'danger'
} {
  switch (status) {
    case 'draft':
      return { label: 'Draft', variant: 'neutral' }
    case 'submitted':
      return { label: 'Submitted', variant: 'teal' }
    case 'approved':
      return { label: 'Approved', variant: 'gold' }
    case 'rejected':
      return { label: 'Rejected', variant: 'danger' }
    default:
      return { label: String(status).toUpperCase(), variant: 'neutral' }
  }
}
