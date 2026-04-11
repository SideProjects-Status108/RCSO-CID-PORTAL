import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { PlaceholderSection } from '@/components/ui/placeholder-section'

export default async function DashboardPage() {
  const session = await getSessionUserWithProfile()

  return (
    <div className="space-y-4">
      <PlaceholderSection
        title="Dashboard (coming soon)"
        description="This home view will summarize on-call status, your schedule, open requests, and quick links once later phases are built."
      />
      {session ? (
        <p className="text-sm text-text-secondary">
          Signed in as{' '}
          <span className="font-medium text-text-primary">
            {session.profile.full_name || session.user.email}
          </span>
          <span className="text-text-disabled"> · </span>
          <span className="font-mono text-sm text-accent-gold">{session.profile.role}</span>
        </p>
      ) : null}
    </div>
  )
}
