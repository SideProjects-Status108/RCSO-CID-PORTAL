'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState, useTransition } from 'react'

import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Status = {
  service_role_configured?: boolean
  seeded: boolean
  mock_user_count: number
  expected: number
  status_label: string
}

type AccountRow = { email: string; name: string; role: string; password: string }

export function MockDataSetupClient() {
  const [status, setStatus] = useState<Status | null>(null)
  const [serviceOk, setServiceOk] = useState(true)
  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [lastSeedMeta, setLastSeedMeta] = useState<string | null>(null)
  const [lastPurgeMessage, setLastPurgeMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, start] = useTransition()

  const loadStatus = useCallback(() => {
    start(async () => {
      setError(null)
      try {
        const res = await fetch('/api/admin/mock-data/status', { credentials: 'same-origin' })
        const j = (await res.json()) as Status & { error?: string }
        if (!res.ok) throw new Error(j.error ?? 'Failed to load status')
        if (j.service_role_configured === false) {
          setServiceOk(false)
          setStatus(null)
          return
        }
        setServiceOk(true)
        setStatus({
          seeded: j.seeded,
          mock_user_count: j.mock_user_count,
          expected: j.expected,
          status_label: j.status_label,
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Status error')
      }
    })
  }, [])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  const seed = () => {
    start(async () => {
      setError(null)
      setLastPurgeMessage(null)
      try {
        const res = await fetch('/api/admin/mock-data/seed', {
          method: 'POST',
          credentials: 'same-origin',
        })
        const j = (await res.json()) as {
          error?: string
          accounts?: AccountRow[]
          pairings_created?: number
          weekly_sessions_created?: number
        }
        if (!res.ok) throw new Error(j.error ?? 'Seed failed')
        setAccounts(j.accounts ?? [])
        setLastSeedMeta(
          `Pairings: ${j.pairings_created ?? 0}, weekly sessions: ${j.weekly_sessions_created ?? 0}`
        )
        await loadStatus()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Seed failed')
      }
    })
  }

  const purge = () => {
    if (
      !window.confirm(
        'Delete ALL mock-*@rcso.local auth users and related training data? This cannot be undone.'
      )
    ) {
      return
    }
    start(async () => {
      setError(null)
      setLastSeedMeta(null)
      setAccounts([])
      try {
        const res = await fetch('/api/admin/mock-data/purge', {
          method: 'DELETE',
          credentials: 'same-origin',
        })
        const j = (await res.json()) as { error?: string; message?: string }
        if (!res.ok) throw new Error(j.error ?? 'Purge failed')
        setLastPurgeMessage(j.message ?? 'Purged.')
        await loadStatus()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Purge failed')
      }
    })
  }

  const copyPasswords = () => {
    const text = accounts.map((a) => `${a.email}\t${a.password}`).join('\n')
    void navigator.clipboard.writeText(text)
  }

  const downloadCsv = () => {
    const header = 'email,name,role,password'
    const lines = accounts.map(
      (a) =>
        `${csvEscape(a.email)},${csvEscape(a.name)},${csvEscape(a.role)},${csvEscape(a.password)}`
    )
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mock-rcso-users.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const statusLabel =
    !serviceOk
      ? 'Service role not configured'
      : !status
        ? 'Loading…'
        : status.status_label === 'not_seeded'
          ? 'Not seeded'
          : status.status_label === 'ready'
            ? 'Seeded (complete)'
            : `Seeded (partial — ${status.mock_user_count}/${status.expected})`

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-lg border border-amber-500/40 bg-amber-950/25 px-4 py-3 text-sm text-amber-100">
        <p className="font-semibold">Mock data only</p>
        <p className="mt-1 text-amber-100/90">
          Do not use in production. All accounts use the email pattern{' '}
          <code className="rounded bg-black/30 px-1">mock-*@rcso.local</code>. Purge only affects those
          addresses. Personnel and pairing flows read the <code className="rounded bg-black/30 px-1">
            personnel_directory
          </code>{' '}
          table — if you seeded before that was added, purge once and seed again so directory rows exist.
        </p>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Mock data management</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Seed isolated test users, FTO pairings, activity logs, and submitted weekly evaluations. Requires{' '}
          <code className="rounded bg-bg-elevated px-1">SUPABASE_SERVICE_ROLE_KEY</code> on the server.
        </p>
      </div>

      {!serviceOk ? (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          Service role key is missing. Set <code>SUPABASE_SERVICE_ROLE_KEY</code> in the deployment environment
          to enable seed and purge.
        </p>
      ) : null}

      <section className="rounded-xl border border-border-subtle bg-bg-surface p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Status</h2>
        <p className="mt-2 text-lg font-medium text-text-primary">{statusLabel}</p>
        {status ? (
          <p className="mt-1 font-mono text-xs text-text-secondary">
            Mock auth users detected: {status.mock_user_count} (expected {status.expected})
          </p>
        ) : null}
        {lastSeedMeta ? <p className="mt-2 text-xs text-text-secondary">{lastSeedMeta}</p> : null}
        {lastPurgeMessage ? <p className="mt-2 text-xs text-text-secondary">{lastPurgeMessage}</p> : null}
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      </section>

      <section className="rounded-xl border border-border-subtle bg-bg-surface p-4 text-sm text-text-secondary">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-primary">
          Organizational structure (seeded roster)
        </h2>
        <ul className="mt-3 list-inside list-disc space-y-1">
          <li>1 Captain (supervision_admin)</li>
          <li>1 Lieutenant (supervision)</li>
          <li>4 Sergeants (supervision)</li>
          <li>2 FTO coordinators</li>
          <li>7 FTOs</li>
          <li>6 DITs</li>
          <li>12 Detectives</li>
          <li>2 Investigative assistants (detective role)</li>
        </ul>
        <p className="mt-3 font-medium text-text-primary">Total: 35 mock users</p>
        <p className="mt-2 text-xs">
          Pairings: FTO-001→DIT-001&amp;002 (ph1), FTO-002→DIT-003 (ph2), FTO-003→DIT-004&amp;005 (ph1), FTO-004→DIT-006
          (ph2). Each DIT gets 3–5 activity exposures; each pairing gets one submitted weekly evaluation for last
          week with mixed scores and unobserved competencies.
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={seed} disabled={!serviceOk}>
          Seed mock data
        </Button>
        <Button type="button" variant="destructive" onClick={purge} disabled={!serviceOk}>
          Purge mock data
        </Button>
        <Button type="button" variant="outline" onClick={loadStatus} disabled={!serviceOk}>
          Refresh status
        </Button>
        <Link
          href="/admin/mock-data-scenarios"
          className={cn(buttonVariants({ variant: 'secondary', size: 'default' }))}
        >
          Test scenarios
        </Link>
      </div>

      {accounts.length > 0 ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-primary">
              Generated accounts
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={copyPasswords}>
                Copy all passwords
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={downloadCsv}>
                Download CSV
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border-subtle">
            <table className="w-full min-w-[36rem] text-left text-xs">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-elevated text-text-secondary">
                  <th className="px-2 py-2">Email</th>
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Role</th>
                  <th className="px-2 py-2">Password</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.email} className="border-b border-border-subtle/70">
                    <td className="px-2 py-2 font-mono text-text-primary">{a.email}</td>
                    <td className="px-2 py-2 text-text-primary">{a.name}</td>
                    <td className="px-2 py-2 text-text-secondary">{a.role}</td>
                    <td className="px-2 py-2 font-mono text-text-primary">{a.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}

function csvEscape(s: string): string {
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return `"${s.replaceAll('"', '""')}"`
  }
  return s
}
