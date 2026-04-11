'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { FilePlus2, Search } from 'lucide-react'

import type { ApprovalQueueRow, SubmissionListItem } from '@/lib/forms/queries'
import { submissionStatusForStamp } from '@/lib/forms/submission-status-display'
import type { FormTemplateRow } from '@/types/forms'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusStamp } from '@/components/app/status-stamp'
import { CategoryBadge } from '@/components/forms/category-badge'
import { SubmissionDetailDrawer } from '@/components/forms/submission-detail-drawer'
import { cn } from '@/lib/utils'

type FormsLibraryViewProps = {
  templates: FormTemplateRow[]
  mySubmissions: SubmissionListItem[]
  approvalQueue: ApprovalQueueRow[]
  canReview: boolean
  /** Server anchor for relative date filters (stable for this navigation). */
  listGeneratedAt: number
}

export function FormsLibraryView({
  templates,
  mySubmissions,
  approvalQueue,
  canReview,
  listGeneratedAt,
}: FormsLibraryViewProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const [approvalMode, setApprovalMode] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [rangeFilter, setRangeFilter] = useState<string>('all')
  const [, startRefresh] = useTransition()

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return templates
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.category ?? '').toLowerCase().includes(q)
    )
  }, [templates, search])

  const byCategory = useMemo(() => {
    const m = new Map<string, FormTemplateRow[]>()
    for (const t of filteredTemplates) {
      const c = t.category ?? 'General'
      if (!m.has(c)) m.set(c, [])
      m.get(c)!.push(t)
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filteredTemplates])

  const filteredMine = useMemo(() => {
    let rows = mySubmissions
    if (statusFilter !== 'all') {
      rows = rows.filter((r) => r.status === statusFilter)
    }
    if (rangeFilter === '7d') {
      const cut = listGeneratedAt - 7 * 86400000
      rows = rows.filter((r) => new Date(r.created_at).getTime() >= cut)
    } else if (rangeFilter === '30d') {
      const cut = listGeneratedAt - 30 * 86400000
      rows = rows.filter((r) => new Date(r.created_at).getTime() >= cut)
    }
    return rows
  }, [mySubmissions, statusFilter, rangeFilter, listGeneratedAt])

  function openSubmission(id: string, fromQueue: boolean) {
    setDrawerId(id)
    setApprovalMode(fromQueue)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Forms & Documents</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">
          Department digital forms: complete online, track submissions, route items that
          require supervisor approval, and print archival copies.
        </p>
      </div>

      <Tabs defaultValue="library">
        <TabsList className="border border-border-subtle bg-bg-surface">
          <TabsTrigger value="library">All forms</TabsTrigger>
          <TabsTrigger value="mine">My submissions</TabsTrigger>
          {canReview ? <TabsTrigger value="queue">Approval queue</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="library" className="space-y-4 pt-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search forms…"
              className="border-border-subtle bg-bg-surface pl-9"
            />
          </div>

          {byCategory.length === 0 ? (
            <p className="text-sm text-text-secondary">No forms match your search.</p>
          ) : (
            <div className="space-y-8">
              {byCategory.map(([category, items]) => (
                <section key={category}>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    {category.replaceAll('_', ' ')}
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map((t) => (
                      <article
                        key={t.id}
                        className="flex flex-col rounded-lg border border-border-subtle bg-bg-surface p-4 shadow-sm"
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <CategoryBadge category={t.category} />
                          <span className="font-mono text-[11px] text-accent-gold">
                            v{t.version}
                          </span>
                          {t.requires_approval ? (
                            <span className="rounded border border-accent-teal/40 bg-accent-teal/10 px-1.5 py-0.5 text-[10px] font-medium uppercase text-accent-teal">
                              Approval
                            </span>
                          ) : null}
                        </div>
                        <h3 className="text-base font-semibold text-text-primary">{t.name}</h3>
                        <div className="mt-auto flex pt-4">
                          <Link
                            href={`/forms/${t.id}/new`}
                            className={buttonVariants({
                              className:
                                'border border-accent-gold/30 bg-accent-gold text-bg-app inline-flex items-center',
                            })}
                          >
                            <FilePlus2 className="mr-2 size-4" />
                            New submission
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mine" className="space-y-4 pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1 sm:w-40">
              <Label className="text-text-secondary">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  setStatusFilter(typeof v === 'string' ? v : 'all')
                }
              >
                <SelectTrigger className="border-border-subtle bg-bg-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border-subtle bg-bg-elevated">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:w-44">
              <Label className="text-text-secondary">Date range</Label>
              <Select
                value={rangeFilter}
                onValueChange={(v) =>
                  setRangeFilter(typeof v === 'string' ? v : 'all')
                }
              >
                <SelectTrigger className="border-border-subtle bg-bg-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border-subtle bg-bg-elevated">
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border-subtle">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-elevated text-text-secondary">
                  <th className="px-3 py-2 font-medium">Form</th>
                  <th className="px-3 py-2 font-medium">Updated</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Case</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMine.map((row) => {
                  const st = submissionStatusForStamp(row.status)
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-border-subtle transition-colors hover:border-l-2 hover:border-l-accent-gold"
                    >
                      <td className="px-3 py-2 font-medium text-text-primary">
                        {row.template_name ?? '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-text-secondary">
                        {new Date(row.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2">
                        <StatusStamp variant={st.variant}>{st.label}</StatusStamp>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-text-secondary">
                        {row.case_number ?? '—'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-accent-teal"
                            onClick={() => openSubmission(row.id, false)}
                          >
                            View
                          </Button>
                          <Link
                            href={`/forms/submissions/${row.id}/print`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonVariants({
                              variant: 'ghost',
                              size: 'sm',
                              className: 'text-text-primary',
                            })}
                          >
                            Print
                          </Link>
                          {row.status === 'draft' ? (
                            <Link
                              href={`/forms/${row.template_id}/new?draft=${row.id}`}
                              className={buttonVariants({
                                variant: 'ghost',
                                size: 'sm',
                                className: 'text-accent-teal',
                              })}
                            >
                              Continue
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filteredMine.length === 0 ? (
              <p className="p-4 text-sm text-text-secondary">No submissions in this view.</p>
            ) : null}
          </div>
        </TabsContent>

        {canReview ? (
          <TabsContent value="queue" className="space-y-4 pt-4">
            <p className="text-sm text-text-secondary">
              Submissions awaiting review ({approvalQueue.length})
            </p>
            <div className="overflow-x-auto rounded-lg border border-border-subtle">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-bg-elevated text-text-secondary">
                    <th className="px-3 py-2 font-medium">Form</th>
                    <th className="px-3 py-2 font-medium">Submitted by</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {approvalQueue.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        'border-b border-border-subtle transition-colors hover:border-l-2 hover:border-l-accent-gold'
                      )}
                    >
                      <td className="px-3 py-2 font-medium text-text-primary">
                        {row.template_name ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-text-primary">{row.submitter_name}</td>
                      <td className="px-3 py-2 font-mono text-xs text-text-secondary">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-accent-gold/40"
                          onClick={() => openSubmission(row.id, true)}
                        >
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {approvalQueue.length === 0 ? (
                <p className="p-4 text-sm text-text-secondary">No items in the queue.</p>
              ) : null}
            </div>
          </TabsContent>
        ) : null}
      </Tabs>

      <SubmissionDetailDrawer
        key={drawerId ?? 'closed'}
        submissionId={drawerId}
        open={Boolean(drawerId)}
        onOpenChange={(o) => {
          if (!o) setDrawerId(null)
        }}
        approvalMode={approvalMode}
        canReview={canReview}
        onUpdated={() => {
          startRefresh(() => {
            router.refresh()
          })
        }}
      />
    </div>
  )
}
