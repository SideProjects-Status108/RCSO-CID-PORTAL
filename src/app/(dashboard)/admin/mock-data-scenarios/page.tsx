import Link from 'next/link'
import { redirect } from 'next/navigation'

import { buttonVariants } from '@/components/ui/button'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { UserRole } from '@/lib/auth/roles'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { getMockDataStatus } from '@/lib/admin/mock-data-service'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function MockDataScenariosPage() {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login?next=/admin/mock-data-scenarios')
  if (session.profile.role !== UserRole.admin) {
    redirect('/unauthorized')
  }

  const svc = createServiceRoleClient()
  let verify: { ok: boolean; message: string } = {
    ok: false,
    message: 'Set SUPABASE_SERVICE_ROLE_KEY to verify seeded counts.',
  }
  if (svc) {
    try {
      const st = await getMockDataStatus(svc)
      const fullRoster = st.mock_user_count === 35
      const directoryOk = st.personnel_directory_gap === 0
      verify = {
        ok: fullRoster && directoryOk,
        message: fullRoster
          ? directoryOk
            ? 'Detected 35 mock auth users and 35 personnel_directory rows. Open Training to confirm pairings (6 rows), exposures, and weekly sessions.'
            : `Detected 35 mock auth users but personnel_directory gap is ${st.personnel_directory_gap}. Use Mock data setup → Repair personnel directory (or purge + re-seed).`
          : `Found ${st.mock_user_count} mock user(s); expected 35 after a full seed. Purge and re-seed if needed.`,
      }
    } catch {
      verify = { ok: false, message: 'Could not read mock data status.' }
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-text-primary">Mock data — test scenarios</h1>
        <Link
          href="/admin/mock-data-setup"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          Back to setup
        </Link>
      </div>

      <section
        className={cn(
          'rounded-lg border px-4 py-3 text-sm',
          verify.ok ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-100' : 'border-border-subtle bg-bg-surface text-text-secondary'
        )}
      >
        <p className="font-semibold text-text-primary">Verification</p>
        <p className="mt-1">{verify.message}</p>
      </section>

      <ScenarioBlock
        title="Weekly evaluation flow"
        login="mock-fto-001@rcso.local"
        dit="mock-dit-001@rcso.local / mock-dit-002@rcso.local"
        steps={[
          'Training → FTO pairings → open pairing with mock-dit-001 or mock-dit-002.',
          'Use the Weekly evaluation tab for the current ISO week.',
          'Enter scores; use 1, 2, or 5 with explanations (12+ chars). Leave some competencies blank.',
          'Submit — session becomes submitted; unobserved rows are created for blanks.',
        ]}
        expect="DIT can open Training → DIT weekly progress (or pairing drawer) and see submitted scores / unobserved list."
      />

      <ScenarioBlock
        title="Activity logging"
        login="mock-fto-001@rcso.local (or any mock FTO on the pairing)"
        dit="mock-dit-001@rcso.local"
        steps={[
          'Training → pairing with DIT → Activity log / weekly evaluation context.',
          'Log 615-week exposures with case numbers; confirm list refreshes.',
        ]}
        expect="Exposures appear under the DIT’s activity summary for the selected week."
      />

      <ScenarioBlock
        title="Deficiency form"
        login="mock-fto-001@rcso.local"
        dit="mock-dit-001@rcso.local"
        steps={[
          'From weekly evaluation with scores 1/2/5, open deficiency workflow when offered.',
          'Coordinators: mock-ftoc-001@rcso.local — Training → deficiency queue (coordinator UI).',
        ]}
        expect="Coordinator can move status and use schedule / escalate API routes."
      />

      <ScenarioBlock
        title="DIT dashboard"
        login="mock-dit-001@rcso.local"
        dit="—"
        steps={['Training → Weekly progress (DIT tile on Training hub, or /training/dit-dashboard).']}
        expect="Snapshot shows FTO name, competency cards, not observed, and coaching strip if deficiencies exist."
      />

      <ScenarioBlock
        title="Coordinator / supervision views"
        login="mock-ftoc-001@rcso.local or mock-captain-001@rcso.local"
        dit="—"
        steps={[
          'Training hub lists all mock pairings when role has training read.',
          'Review DIT records and evaluations as your role allows.',
        ]}
        expect="Full-directory visibility matches RLS for supervision / coordinator roles."
      />

      <section className="rounded-xl border border-border-subtle bg-bg-surface p-4 text-sm text-text-secondary">
        <h2 className="text-base font-semibold text-text-primary">Personnel and New pairing / enroll</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>
            <strong className="text-text-primary">Personnel</strong> comes from the{' '}
            <code className="rounded bg-bg-elevated px-1">personnel_directory</code> table, not from{' '}
            <code className="rounded bg-bg-elevated px-1">profiles</code> alone. The mock seed now inserts both. If
            your roster was empty, purge and re-seed once.
          </li>
          <li>
            <strong className="text-text-primary">Enroll DIT</strong> (new DIT + pairing) is allowed only for{' '}
            <strong className="text-text-primary">FTO coordinators</strong> in this app (
            <code className="rounded bg-bg-elevated px-1">mock-ftoc-001@rcso.local</code>).
          </li>
          <li>
            <strong className="text-text-primary">New pairing</strong> (pair with an existing enrolled DIT) is
            allowed for <strong className="text-text-primary">supervision+</strong> (captain, lieutenant, sergeants
            in the mock set) or <strong className="text-text-primary">FTO coordinators</strong> — not for plain FTO
            accounts.
          </li>
        </ul>
      </section>

      <p className="text-xs text-text-disabled">
        Passwords are only shown once on the setup page after seeding. Re-seed after purge to issue new passwords.
      </p>
    </div>
  )
}

function ScenarioBlock({
  title,
  login,
  dit,
  steps,
  expect,
}: {
  title: string
  login: string
  dit: string
  steps: string[]
  expect: string
}) {
  return (
    <section className="rounded-xl border border-border-subtle bg-bg-surface p-4">
      <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      <p className="mt-2 text-sm text-text-secondary">
        <span className="font-medium text-text-primary">Login as:</span> {login}
      </p>
      <p className="mt-1 text-sm text-text-secondary">
        <span className="font-medium text-text-primary">DIT / pairing:</span> {dit}
      </p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-text-secondary">
        {steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <p className="mt-3 text-sm text-text-primary">
        <span className="font-medium">Expected:</span> {expect}
      </p>
    </section>
  )
}
