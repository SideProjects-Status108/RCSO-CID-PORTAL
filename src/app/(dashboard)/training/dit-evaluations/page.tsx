import { redirect } from 'next/navigation'

// Legacy route: redirected to the new DIT Files section (Weekly Eval lives as a
// tab on each DIT's file in Segment C). Scheduled for deletion in Segment C
// cleanup (see TRAINING_OVERHAUL_MASTER_PLAN.md).
export default function LegacyDitEvaluationsPage() {
  redirect('/training/dit-files')
}
