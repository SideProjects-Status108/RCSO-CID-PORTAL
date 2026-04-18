import { redirect } from 'next/navigation'

// Legacy route: redirected to the new Schedule section. Scheduled for deletion
// in Segment C cleanup (see TRAINING_OVERHAUL_MASTER_PLAN.md).
export default function LegacyFtoSchedulePage() {
  redirect('/training/schedule')
}
