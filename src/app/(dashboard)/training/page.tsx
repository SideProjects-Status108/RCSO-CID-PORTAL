import Image from 'next/image'
import { redirect } from 'next/navigation'
import { CalendarDays, FileText, FolderOpen, Library, UserPlus, Users } from 'lucide-react'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { canManageOnboarding } from '@/lib/training/access'
import { SectionCard } from '@/components/training/shell/section-card'
import { OnboardingPanel } from '@/components/training/onboarding/onboarding-panel'

export const dynamic = 'force-dynamic'

export default async function TrainingDashboardPage() {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')

  const showOnboarding = canManageOnboarding(session.profile)

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-5">
        <Image
          src="/branding/rcso-detective-badge.png"
          alt=""
          width={256}
          height={256}
          priority
          className="h-20 w-20 shrink-0 object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.5)] sm:h-28 sm:w-28 lg:h-32 lg:w-32"
          aria-hidden
        />
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-gold">
            Detective in Training Program
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-text-primary">
            Training Dashboard
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
            Program overview for the Detective in Training pipeline. Use the tabs above to navigate
            between sections.
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {showOnboarding ? (
          <SectionCard
            title="Onboarding"
            description="Enroll a new Detective in Training and kick off their pre-start survey and meeting brief."
            icon={UserPlus}
            className="sm:col-span-2"
          >
            <OnboardingPanel />
          </SectionCard>
        ) : (
          <SectionCard
            title="Onboarding"
            description="Coordinator-led intake for new DITs. Contact the FTO Coordinator to start onboarding."
            icon={UserPlus}
          />
        )}

        <SectionCard
          title="Active DIT Files"
          description="Status-at-a-glance grid of every active DIT with week progress, FTO, and score health."
          icon={Users}
          href="/training/dit-files"
        />

        <SectionCard
          title="Documents"
          description="Required reading, policy memos, completion certificates, and other uploaded training artifacts."
          icon={FileText}
          href="/training/resources"
        />

        <SectionCard
          title="Schedule"
          description="10-week FTO rotation grid. Visualize pairings, handovers, and weekly focus areas."
          icon={CalendarDays}
          href="/training/schedule"
        />

        <SectionCard
          title="Resources"
          description="Required reading, reference materials, and external agency links."
          icon={Library}
          href="/training/resources"
        />

        <SectionCard
          title="Settings"
          description="Signature inbox, notification preferences, and program configuration (coming soon)."
          icon={FolderOpen}
          href="/training/settings"
        />
      </div>
    </div>
  )
}
