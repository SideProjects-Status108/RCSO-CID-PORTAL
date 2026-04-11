import { redirect } from 'next/navigation'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { hasRole, UserRole } from '@/lib/auth/roles'
import { fetchTnIngestionStatus } from '@/lib/tn-code/queries'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')
  if (!hasRole(session.profile.role, [UserRole.admin])) {
    redirect('/unauthorized')
  }

  const rows = await fetchTnIngestionStatus()

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">
          Administration and ingestion tools for portal modules.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-text-primary">TN Code ingestion status</h2>
        <p className="max-w-3xl text-sm text-text-secondary">
          Ingestion runs locally with the service role key. Use the commands below from the
          repository root after placing HTML corpus files in{' '}
          <code className="rounded bg-bg-surface px-1 font-mono text-xs">scripts/tn-code-source/</code>
          .
        </p>

        <div className="overflow-x-auto rounded-lg border border-border-subtle">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-elevated text-text-secondary">
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Last ingested</th>
                <th className="px-3 py-2 text-right">Chapters</th>
                <th className="px-3 py-2 text-right">Sections</th>
                <th className="px-3 py-2 text-right">Skipped</th>
                <th className="px-3 py-2">Run ingestion</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border-subtle/80 last:border-0">
                  <td className="px-3 py-2 font-mono text-accent-gold">{r.title_number}</td>
                  <td className="max-w-[220px] truncate px-3 py-2 text-text-primary">
                    {r.title_name}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">
                    {r.last_ingested_at
                      ? new Date(r.last_ingested_at).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.chapter_count}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.section_count}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                    {r.last_ingest_skipped ?? '—'}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <pre className="max-w-[280px] overflow-x-auto rounded-md border border-border-subtle bg-bg-surface p-2 font-mono text-[11px] leading-snug text-text-primary">
                      npm run ingest:tn-code -- --title {r.title_number}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
