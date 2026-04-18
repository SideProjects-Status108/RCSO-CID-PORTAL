import { redirect } from 'next/navigation'

// Legacy route kept as a redirect during the training overhaul. The Onboarding
// surface now lives on the /training landing page (see TRAINING_OVERHAUL_MASTER_PLAN.md).
// Scheduled for deletion in Segment C cleanup.
export default function LegacyOnboardingPage() {
  redirect('/training')
}
