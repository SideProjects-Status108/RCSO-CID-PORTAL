'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Plus } from 'lucide-react'

import {
  createCaseAction,
  fetchFormSubmissionsForCaseAction,
  updateCaseAction,
} from '@/lib/operations/actions'
import type { CaseListRow, CaseTypeRow } from '@/types/operations'
import { UserRole, type UserRoleValue } from '@/lib/auth/roles'
import { Button, buttonVariants } from '@/components/ui/button'
import { Drawer } from '@/components/app/drawer'
import { Modal } from '@/components/app/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusStamp } from '@/components/app/status-stamp'
import { cn } from '@/lib/utils'
import { SubmissionDetailDrawer } from '@/components/forms/submission-detail-drawer'

function caseStatusVariant(s: CaseListRow['status']): 'teal' | 'muted' | 'neutral' {
  if (s === 'active') return 'teal'
  if (s === 'inactive') return 'muted'
  return 'neutral'
}

type OperationsViewProps = {
  viewerRole: UserRoleValue
  viewerId: string
  supervisionPlus: boolean
  canManageCaseTypes: boolean
  initialCases: CaseListRow[]
  caseTypes: CaseTypeRow[]
  nameMap: Record<string, string>
}

export function OperationsView({
  viewerRole,
  viewerId,
  supervisionPlus,
  canManageCaseTypes,
  initialCases,
  caseTypes,
  nameMap,
}: OperationsViewProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusF, setStatusF] = useState<string>('all')
  const [detF, setDetF] = useState<string>('all')
  const [typeF, setTypeF] = useState<string>('all')
  const [cases, setCases] = useState(initialCases)
  const [modalOpen, setModalOpen] = useState(false)
  const [detail, setDetail] = useState<CaseListRow | null>(null)
  const [forms, setForms] = useState<
    Awaited<ReturnType<typeof fetchFormSubmissionsForCaseAction>>
  >([])
  const [submissionDrawerId, setSubmissionDrawerId] = useState<string | null>(null)
  const canCreate = viewerRole !== UserRole.dit

  useEffect(() => {
    setCases(initialCases)
  }, [initialCases])

  const filtered = cases.filter((c) => {
    if (statusF !== 'all' && c.status !== statusF) return false
    if (typeF === '__free__') {
      if (c.case_type_id != null) return false
    } else if (typeF !== 'all' && c.case_type_id !== typeF) {
      return false
    }
    if (detF !== 'all' && c.assigned_detective !== detF) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      if (
        !c.case_number.toLowerCase().includes(q) &&
        !(c.case_type_name?.toLowerCase().includes(q) ?? false)
      ) {
        return false
      }
    }
    return true
  })

  async function openCase(c: CaseListRow) {
    setDetail(c)
    const f = await fetchFormSubmissionsForCaseAction(c.id)
    setForms(f)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Operations</h1>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">
            Case tracking for CID squads. Enter a short case type label and your agency case number.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageCaseTypes ? (
            <Link
              href="/operations/case-types"
              className={buttonVariants({ variant: 'outline', className: 'border-border-subtle' })}
            >
              Case types
            </Link>
          ) : null}
          {canCreate ? (
            <Button
              type="button"
              className="border border-accent-primary/30 bg-accent-primary text-bg-app"
              onClick={() => setModalOpen(true)}
            >
              <Plus className="mr-2 size-4" />
              New case
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        <div className="min-w-[200px] flex-1 space-y-1">
          <Label className="text-text-secondary">Search case number</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-border-subtle bg-bg-surface font-mono"
          />
        </div>
        <div className="w-full space-y-1 md:w-36">
          <Label className="text-text-secondary">Status</Label>
          <Select value={statusF} onValueChange={(v) => setStatusF(typeof v === 'string' ? v : 'all')}>
            <SelectTrigger className="border-border-subtle bg-bg-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border-subtle bg-bg-elevated">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full space-y-1 md:w-44">
          <Label className="text-text-secondary">Case type</Label>
          <Select value={typeF} onValueChange={(v) => setTypeF(typeof v === 'string' ? v : 'all')}>
            <SelectTrigger className="border-border-subtle bg-bg-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border-subtle bg-bg-elevated">
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="__free__">Free-text type</SelectItem>
              {caseTypes.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {supervisionPlus ? (
          <div className="w-full space-y-1 md:min-w-[200px]">
            <Label className="text-text-secondary">Detective</Label>
            <Select value={detF} onValueChange={(v) => setDetF(typeof v === 'string' ? v : 'all')}>
              <SelectTrigger className="border-border-subtle bg-bg-surface">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border-subtle bg-bg-elevated">
                <SelectItem value="all">All</SelectItem>
                {[...new Set(cases.map((c) => c.assigned_detective).filter(Boolean))].map((uid) => (
                  <SelectItem key={uid as string} value={uid as string}>
                    {nameMap[uid as string] ?? uid}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border-subtle">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-elevated text-text-secondary">
              <th className="px-3 py-2 font-medium">Case #</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Detective</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Opened</th>
              <th className="px-3 py-2 font-medium">Forms</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr
                key={c.id}
                className={cn(
                  'cursor-pointer border-b border-border-subtle transition-colors hover:bg-bg-surface',
                  c.status === 'active' && 'border-l-4 border-l-accent-teal',
                  c.status === 'inactive' && 'border-l-4 border-l-border-subtle',
                  c.status === 'closed' && 'border-l-4 border-l-transparent opacity-70'
                )}
                onClick={() => void openCase(c)}
              >
                <td className="px-3 py-2 font-mono text-accent-primary">{c.case_number}</td>
                <td className="px-3 py-2 text-text-secondary">{c.case_type_name ?? '—'}</td>
                <td className="px-3 py-2 text-text-secondary">
                  {c.assigned_detective ? (
                    <Link
                      href={`/directory?userId=${c.assigned_detective}`}
                      className="text-accent-teal hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {nameMap[c.assigned_detective] ?? '—'}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-3 py-2">
                  <StatusStamp variant={caseStatusVariant(c.status)}>
                    {c.status.toUpperCase()}
                  </StatusStamp>
                </td>
                <td className="px-3 py-2 font-mono text-xs text-text-secondary">
                  {c.date_opened ?? '—'}
                </td>
                <td className="px-3 py-2 font-mono text-accent-primary">{c.linked_forms_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <p className="p-4 text-sm text-text-secondary">No cases match filters.</p>
        ) : null}
      </div>

      <NewCaseModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreated={() => {
          setModalOpen(false)
          router.refresh()
        }}
      />

      <Drawer
        open={Boolean(detail)}
        onOpenChange={(o) => !o && setDetail(null)}
        title={detail ? detail.case_number : 'Case'}
      >
        {detail ? (
          <CaseDetailBody
            detail={detail}
            nameMap={nameMap}
            forms={forms}
            viewerId={viewerId}
            supervisionPlus={supervisionPlus}
            onOpenSubmission={(id) => setSubmissionDrawerId(id)}
            onStatus={async (status) => {
              await updateCaseAction({ caseId: detail.id, status })
              router.refresh()
              setDetail({ ...detail, status })
            }}
            onNotes={async (notes) => {
              await updateCaseAction({ caseId: detail.id, notes })
              router.refresh()
              setDetail({ ...detail, notes })
            }}
          />
        ) : null}
      </Drawer>

      <SubmissionDetailDrawer
        key={submissionDrawerId ?? 'x'}
        submissionId={submissionDrawerId}
        open={Boolean(submissionDrawerId)}
        onOpenChange={(o) => !o && setSubmissionDrawerId(null)}
        approvalMode={false}
        canReview={supervisionPlus}
        onUpdated={() => router.refresh()}
      />
    </div>
  )
}

function CaseDetailBody({
  detail,
  nameMap,
  forms,
  viewerId,
  supervisionPlus,
  onOpenSubmission,
  onStatus,
  onNotes,
}: {
  detail: CaseListRow
  nameMap: Record<string, string>
  forms: Awaited<ReturnType<typeof fetchFormSubmissionsForCaseAction>>
  viewerId: string
  supervisionPlus: boolean
  onOpenSubmission: (id: string) => void
  onStatus: (s: 'active' | 'inactive' | 'closed') => void
  onNotes: (n: string) => void
}) {
  const [notes, setNotes] = useState(detail.notes ?? '')
  const canEditNotes =
    supervisionPlus ||
    detail.created_by === viewerId ||
    detail.assigned_detective === viewerId

  const canChangeStatus =
    supervisionPlus ||
    detail.created_by === viewerId ||
    detail.assigned_detective === viewerId

  return (
    <div className="space-y-4 text-sm">
      <p className="text-text-secondary">{detail.case_type_name}</p>
      <dl className="grid gap-2 text-text-secondary">
        <div>
          <dt>Opened</dt>
          <dd className="font-mono text-text-primary">{detail.date_opened ?? '—'}</dd>
        </div>
        <div>
          <dt>Created by</dt>
          <dd>
            <Link href={`/directory?userId=${detail.created_by}`} className="text-accent-teal hover:underline">
              {nameMap[detail.created_by] ?? '—'}
            </Link>
          </dd>
        </div>
        {detail.updated_by ? (
          <div>
            <dt>Last updated by</dt>
            <dd>{nameMap[detail.updated_by] ?? '—'}</dd>
          </div>
        ) : null}
        <div>
          <dt>Updated</dt>
          <dd className="font-mono text-xs">{new Date(detail.updated_at).toLocaleString()}</dd>
        </div>
      </dl>

      {canEditNotes ? (
        <div className="space-y-1">
          <Label>Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="border-border-subtle bg-bg-surface"
          />
          <Button type="button" size="sm" variant="outline" onClick={() => void onNotes(notes)}>
            Save notes
          </Button>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-text-primary">{detail.notes || '—'}</p>
      )}

      {canChangeStatus ? (
        <div className="flex flex-wrap gap-2 border-t border-border-subtle pt-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={detail.status === 'inactive'}
            onClick={() => void onStatus('inactive')}
          >
            Mark inactive
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={detail.status === 'closed'}
            onClick={() => void onStatus('closed')}
          >
            Mark closed
          </Button>
          {detail.status !== 'active' ? (
            <Button type="button" size="sm" onClick={() => void onStatus('active')}>
              Mark active
            </Button>
          ) : null}
        </div>
      ) : null}

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase text-accent-primary">Linked forms</h3>
        <ul className="space-y-2">
          {forms.length === 0 ? (
            <li className="text-text-secondary">No linked submissions.</li>
          ) : (
            forms.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  className="text-left text-accent-teal hover:underline"
                  onClick={() => onOpenSubmission(f.id)}
                >
                  {f.template_name} — {f.status}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}

function NewCaseModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreated: () => void
}) {
  const [caseNumber, setCaseNumber] = useState('')
  const [caseTypeLabel, setCaseTypeLabel] = useState('')
  const [opened, setOpened] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [pending, start] = useTransition()

  async function submit() {
    setErr(null)
    const label = caseTypeLabel.trim()
    if (!label || label.length > 100) {
      setErr('Case type is required (1–100 characters).')
      return
    }
    start(async () => {
      try {
        await createCaseAction({
          case_number: caseNumber.trim(),
          case_type_label: label,
          date_opened: opened,
          notes: notes.trim() || null,
          assigned_detective: null,
        })
        setCaseNumber('')
        setCaseTypeLabel('')
        setNotes('')
        onCreated()
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed')
      }
    })
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="New case" className="max-w-lg">
      <div className="space-y-3">
        {err ? <p className="text-sm text-danger">{err}</p> : null}
        <div className="space-y-1">
          <Label className="text-text-secondary">Case type</Label>
          <Input
            value={caseTypeLabel}
            onChange={(e) => setCaseTypeLabel(e.target.value)}
            maxLength={100}
            className="border-border-subtle bg-bg-elevated text-text-primary placeholder:text-text-disabled"
            placeholder="e.g., Theft, Assault, Fraud, etc."
            autoComplete="off"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-text-secondary">Case number *</Label>
          <Input
            value={caseNumber}
            onChange={(e) => setCaseNumber(e.target.value)}
            className="border-border-subtle bg-bg-elevated font-mono text-text-primary placeholder:text-text-disabled"
            placeholder="Agency case number"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-text-secondary">Date opened</Label>
          <Input
            type="date"
            value={opened}
            onChange={(e) => setOpened(e.target.value)}
            className="border-border-subtle bg-bg-elevated text-text-primary"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-text-secondary">Initial notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="border-border-subtle bg-bg-elevated text-text-primary placeholder:text-text-disabled"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending || !caseNumber.trim() || !caseTypeLabel.trim()}
            className="border border-accent-primary/30 bg-accent-primary text-bg-app hover:bg-accent-primary-hover"
            onClick={() => void submit()}
          >
            Create
          </Button>
        </div>
      </div>
    </Modal>
  )
}
