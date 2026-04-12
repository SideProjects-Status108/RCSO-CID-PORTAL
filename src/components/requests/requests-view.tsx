'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { Plus } from 'lucide-react'

import {
  createRequestAction,
  fetchRequestUpdatesAction,
  listRequestsAction,
  supervisionUpdateRequestAction,
  updateRequestStatusAction,
} from '@/app/(dashboard)/requests/actions'
import type { RequestListFilters } from '@/lib/requests/queries'
import type { RequestRow, RequestStatus, RequestType, RequestUrgency } from '@/types/requests'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusStamp } from '@/components/app/status-stamp'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/format-relative'

const REQUEST_TYPES: RequestType[] = [
  'call_out',
  'task',
  'information',
  'follow_up',
  'other',
]

const STATUSES: RequestStatus[] = [
  'open',
  'acknowledged',
  'in_progress',
  'complete',
  'closed',
]

function urgencyBorder(u: RequestUrgency) {
  if (u === 'urgent') return 'border-l-4 border-l-danger'
  if (u === 'priority') return 'border-l-4 border-l-accent-teal'
  return 'border-l-4 border-l-transparent'
}

function requestTypeLabel(t: RequestType) {
  return t.replaceAll('_', ' ')
}

type NameMap = Record<string, string>

type RequestsViewProps = {
  viewerId: string
  viewerRole: UserRoleValue
  supervisionPlus: boolean
  initialAssigned: RequestRow[]
  assignable: { user_id: string; full_name: string }[]
  nameMap: NameMap
  initialOpenRequest: RequestRow | null
}

export function RequestsView({
  viewerId,
  viewerRole,
  supervisionPlus,
  initialAssigned,
  assignable,
  nameMap,
  initialOpenRequest,
}: RequestsViewProps) {
  const router = useRouter()
  const [tab, setTab] = useState<'assigned' | 'created' | 'all'>('assigned')
  const [urgencyF, setUrgencyF] = useState<string>('all')
  const [typeF, setTypeF] = useState<string>('all')
  const [statusF, setStatusF] = useState<string>('all')
  const [assignF, setAssignF] = useState<string>('all')
  const [rows, setRows] = useState<RequestRow[]>(initialAssigned)
  const [createOpen, setCreateOpen] = useState(false)
  const [detail, setDetail] = useState<RequestRow | null>(initialOpenRequest)
  const [updates, setUpdates] = useState<Awaited<ReturnType<typeof fetchRequestUpdatesAction>>>([])
  const [pending, startTransition] = useTransition()

  const canAssignOnCreate = supervisionPlus

  const refresh = useCallback(
    (scope: RequestListFilters['scope']) => {
      startTransition(async () => {
        const list = await listRequestsAction({
          scope,
          urgency: urgencyF as RequestUrgency | 'all',
          request_type: typeF as RequestType | 'all',
          status: statusF as RequestStatus | 'all',
          assigned_to: assignF,
        })
        setRows(list)
      })
    },
    [urgencyF, typeF, statusF, assignF]
  )

  useEffect(() => {
    if (tab === 'assigned') refresh('assigned')
    else if (tab === 'created') refresh('created')
    else refresh('all_open')
  }, [tab, refresh])

  useEffect(() => {
    if (!initialOpenRequest) return
    void (async () => {
      const u = await fetchRequestUpdatesAction(initialOpenRequest.id)
      setUpdates(u)
    })()
  }, [initialOpenRequest])

  async function openDetail(r: RequestRow) {
    setDetail(r)
    const u = await fetchRequestUpdatesAction(r.id)
    setUpdates(u)
  }

  function closeDetail() {
    setDetail(null)
    setUpdates([])
    router.replace('/requests', { scroll: false })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Requests</h1>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">
            Call-outs, tasks, and follow-ups with urgency, assignment, and a full audit trail.
            Requests are never deleted—only closed.
          </p>
        </div>
        {viewerRole !== UserRole.dit ? (
          <Button
            type="button"
            className="border border-accent-primary/30 bg-accent-primary text-bg-app"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="mr-2 size-4" />
            New request
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="space-y-1 lg:w-36">
          <Label className="text-text-secondary">Urgency</Label>
          <Select
            value={urgencyF}
            onValueChange={(v) => setUrgencyF(typeof v === 'string' ? v : 'all')}
          >
            <SelectTrigger className="border-border-subtle bg-bg-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border-subtle bg-bg-elevated">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="routine">Routine</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 lg:w-40">
          <Label className="text-text-secondary">Type</Label>
          <Select
            value={typeF}
            onValueChange={(v) => setTypeF(typeof v === 'string' ? v : 'all')}
          >
            <SelectTrigger className="border-border-subtle bg-bg-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border-subtle bg-bg-elevated">
              <SelectItem value="all">All</SelectItem>
              {REQUEST_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {requestTypeLabel(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 lg:w-40">
          <Label className="text-text-secondary">Status</Label>
          <Select
            value={statusF}
            onValueChange={(v) => setStatusF(typeof v === 'string' ? v : 'all')}
          >
            <SelectTrigger className="border-border-subtle bg-bg-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border-subtle bg-bg-elevated">
              <SelectItem value="all">All</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replaceAll('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {supervisionPlus ? (
          <div className="space-y-1 lg:min-w-[200px]">
            <Label className="text-text-secondary">Assigned detective</Label>
            <Select
              value={assignF}
              onValueChange={(v) => setAssignF(typeof v === 'string' ? v : 'all')}
            >
              <SelectTrigger className="border-border-subtle bg-bg-surface">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border-subtle bg-bg-elevated">
                <SelectItem value="all">All</SelectItem>
                {assignable.map((a) => (
                  <SelectItem key={a.user_id} value={a.user_id}>
                    {a.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as typeof tab)}
        className="space-y-4"
      >
        <TabsList className="border border-border-subtle bg-bg-surface">
          <TabsTrigger value="assigned">Assigned to me</TabsTrigger>
          <TabsTrigger value="created">Created by me</TabsTrigger>
          {supervisionPlus ? <TabsTrigger value="all">All open</TabsTrigger> : null}
        </TabsList>
        <TabsContent value={tab}>
          <RequestTable
            rows={rows}
            nameMap={nameMap}
            pending={pending}
            onOpen={(r) => void openDetail(r)}
            urgencyBorder={urgencyBorder}
          />
        </TabsContent>
      </Tabs>

      <CreateRequestModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        canAssign={canAssignOnCreate}
        assignable={assignable}
        onCreated={() => {
          setCreateOpen(false)
          router.refresh()
          refresh(tab === 'created' ? 'created' : tab === 'all' ? 'all_open' : 'assigned')
        }}
      />

      {detail ? (
        <RequestDetailDrawer
          key={detail.id}
          request={detail}
          updates={updates}
          nameMap={nameMap}
          viewerId={viewerId}
          supervisionPlus={supervisionPlus}
          assignable={assignable}
          onClose={closeDetail}
          onUpdated={() => {
            router.refresh()
            refresh(tab === 'all' ? 'all_open' : tab === 'created' ? 'created' : 'assigned')
            closeDetail()
          }}
        />
      ) : null}
    </div>
  )
}

function RequestTable({
  rows,
  nameMap,
  pending,
  onOpen,
  urgencyBorder,
}: {
  rows: RequestRow[]
  nameMap: NameMap
  pending: boolean
  onOpen: (r: RequestRow) => void
  urgencyBorder: (u: RequestUrgency) => string
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border-subtle">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-border-subtle bg-bg-elevated text-text-secondary">
            <th className="px-3 py-2 font-medium">Request</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Assigned</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Age</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className={cn(
                'cursor-pointer border-b border-border-subtle transition-colors hover:bg-bg-surface',
                urgencyBorder(r.urgency),
                r.urgency === 'urgent' && 'text-danger'
              )}
              onClick={() => onOpen(r)}
            >
              <td className="px-3 py-2 font-medium text-text-primary">{r.title}</td>
              <td className="px-3 py-2 capitalize text-text-secondary">
                {requestTypeLabel(r.request_type)}
              </td>
              <td className="px-3 py-2 text-text-secondary">
                {r.assigned_to ? (
                  <Link
                    href={`/directory?userId=${r.assigned_to}`}
                    className="text-accent-teal hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {nameMap[r.assigned_to] ?? 'User'}
                  </Link>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-3 py-2">
                <StatusStamp variant="neutral">{r.status.replaceAll('_', ' ')}</StatusStamp>
              </td>
              <td className="px-3 py-2 font-mono text-xs text-text-secondary">
                {formatRelativeTime(r.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pending ? (
        <p className="p-3 text-xs text-text-secondary">Updating…</p>
      ) : rows.length === 0 ? (
        <p className="p-4 text-sm text-text-secondary">No requests in this view.</p>
      ) : null}
    </div>
  )
}

function CreateRequestModal({
  open,
  onOpenChange,
  canAssign,
  assignable,
  onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  canAssign: boolean
  assignable: { user_id: string; full_name: string }[]
  onCreated: () => void
}) {
  const [title, setTitle] = useState('')
  const [requestType, setRequestType] = useState<RequestType>('task')
  const [urgency, setUrgency] = useState<RequestUrgency>('routine')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [assignTo, setAssignTo] = useState<string>('')
  const [err, setErr] = useState<string | null>(null)
  const [pending, start] = useTransition()

  async function submit() {
    setErr(null)
    if (!title.trim()) {
      setErr('Title is required')
      return
    }
    start(async () => {
      try {
        await createRequestAction({
          title: title.trim(),
          request_type: requestType,
          urgency,
          description: description.trim() || null,
          assigned_to: canAssign && assignTo ? assignTo : null,
          address: address.trim() || null,
        })
        setTitle('')
        setDescription('')
        setAddress('')
        setAssignTo('')
        onCreated()
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed')
      }
    })
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="New request" className="max-w-lg">
      <div className="space-y-3">
        {err ? (
          <p className="text-sm text-danger" role="alert">
            {err}
          </p>
        ) : null}
        <div className="space-y-1">
          <Label>Title *</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border-border-subtle bg-bg-surface"
          />
        </div>
        <div className="space-y-1">
          <Label>Request type</Label>
          <Select
            value={requestType}
            onValueChange={(v) => {
              if (v) setRequestType(v as RequestType)
            }}
          >
            <SelectTrigger className="border-border-subtle bg-bg-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border-subtle bg-bg-elevated">
              {REQUEST_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {requestTypeLabel(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Urgency</Label>
          <div className="flex flex-wrap gap-2">
            {(['routine', 'priority', 'urgent'] as const).map((u) => (
              <Button
                key={u}
                type="button"
                size="sm"
                variant={urgency === u ? 'default' : 'outline'}
                className={cn(
                  urgency === u && u === 'urgent' && 'border-danger bg-danger/20 text-danger',
                  urgency === u && u === 'priority' && 'border-accent-teal text-accent-teal'
                )}
                onClick={() => setUrgency(u)}
              >
                {u.charAt(0).toUpperCase() + u.slice(1)}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="border-border-subtle bg-bg-surface"
          />
        </div>
        <div className="space-y-1">
          <Label>Address (optional)</Label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="border-border-subtle bg-bg-surface"
          />
        </div>
        {canAssign ? (
          <div className="space-y-1">
            <Label>Assign to</Label>
            <Select
              value={assignTo || 'none'}
              onValueChange={(v) => setAssignTo(v === 'none' || !v ? '' : v)}
            >
              <SelectTrigger className="border-border-subtle bg-bg-surface">
                <SelectValue placeholder="Leave unassigned" />
              </SelectTrigger>
              <SelectContent className="border-border-subtle bg-bg-elevated">
                <SelectItem value="none">Unassigned</SelectItem>
                {assignable.map((a) => (
                  <SelectItem key={a.user_id} value={a.user_id}>
                    {a.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending}
            className="border border-accent-primary/30 bg-accent-primary text-bg-app"
            onClick={() => void submit()}
          >
            Create
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function RequestDetailDrawer({
  request,
  updates,
  nameMap,
  viewerId,
  supervisionPlus,
  assignable,
  onClose,
  onUpdated,
}: {
  request: RequestRow
  updates: Awaited<ReturnType<typeof fetchRequestUpdatesAction>>
  nameMap: NameMap
  viewerId: string
  supervisionPlus: boolean
  assignable: { user_id: string; full_name: string }[]
  onClose: () => void
  onUpdated: () => void
}) {
  const r = request
  const [status, setStatus] = useState<RequestStatus>(r.status)
  const [note, setNote] = useState('')
  const [assignTo, setAssignTo] = useState<string>(r.assigned_to ?? 'none')
  const [supNote, setSupNote] = useState('')
  const [pending, start] = useTransition()

  const isAssignee = r.assigned_to === viewerId
  const mapUrl = r.address
    ? `/map?address=${encodeURIComponent(r.address)}`
    : null

  async function saveAssigneeStatus() {
    start(async () => {
      try {
        if (supervisionPlus) {
          await supervisionUpdateRequestAction({
            requestId: r.id,
            assigned_to: assignTo === 'none' ? null : assignTo,
            status,
            note: supNote.trim() || null,
          })
        } else if (isAssignee) {
          await updateRequestStatusAction({
            requestId: r.id,
            new_status: status,
            note: note.trim() || null,
          })
        }
        onUpdated()
      } catch {
        // handled later
      }
    })
  }

  return (
    <Drawer open={Boolean(r)} onOpenChange={(o) => !o && onClose()} title={r.title}>
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-2">
          <StatusStamp variant="neutral">{r.status.replaceAll('_', ' ')}</StatusStamp>
          <span className="rounded border border-border-subtle px-2 py-0.5 text-xs capitalize">
            {requestTypeLabel(r.request_type)}
          </span>
          <span className="rounded border border-border-subtle px-2 py-0.5 text-xs uppercase">
            {r.urgency}
          </span>
        </div>
        {r.description ? (
          <p className="whitespace-pre-wrap text-text-primary">{r.description}</p>
        ) : null}
        {r.address ? (
          <div>
            <p className="text-text-secondary">{r.address}</p>
            {mapUrl ? (
              <Link
                href={mapUrl}
                className={cn(
                  buttonVariants({ variant: 'link', className: 'px-0 text-accent-teal' })
                )}
              >
                Open in Map
              </Link>
            ) : null}
          </div>
        ) : null}
        <dl className="grid gap-2 text-text-secondary">
          <div>
            <dt>Created by</dt>
            <dd>
              <Link
                href={`/directory?userId=${r.created_by}`}
                className="text-accent-teal hover:underline"
              >
                {nameMap[r.created_by] ?? '—'}
              </Link>
            </dd>
          </div>
          <div>
            <dt>Assigned to</dt>
            <dd>
              {r.assigned_to ? (
                <Link
                  href={`/directory?userId=${r.assigned_to}`}
                  className="text-accent-teal hover:underline"
                >
                  {nameMap[r.assigned_to] ?? '—'}
                </Link>
              ) : (
                '—'
              )}
            </dd>
          </div>
        </dl>

        {isAssignee && !supervisionPlus ? (
          <div className="space-y-2 border-t border-border-subtle pt-3">
            <Label>Update status</Label>
            <Select
              value={status}
              onValueChange={(v) => {
                if (v) setStatus(v as RequestStatus)
              }}
            >
              <SelectTrigger className="border-border-subtle bg-bg-surface">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border-subtle bg-bg-elevated">
                {STATUSES.filter((s) => s !== 'closed').map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replaceAll('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label>Note</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="border-border-subtle bg-bg-surface"
            />
            <Button type="button" size="sm" onClick={() => void saveAssigneeStatus()} disabled={pending}>
              Save status
            </Button>
          </div>
        ) : null}

        {supervisionPlus ? (
          <div className="space-y-2 border-t border-border-subtle pt-3">
            <Label>Assign / reassign</Label>
            <Select
              value={assignTo}
              onValueChange={(v) => setAssignTo(v ?? 'none')}
            >
              <SelectTrigger className="border-border-subtle bg-bg-surface">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border-subtle bg-bg-elevated">
                <SelectItem value="none">Unassigned</SelectItem>
                {assignable.map((a) => (
                  <SelectItem key={a.user_id} value={a.user_id}>
                    {a.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => {
                if (v) setStatus(v as RequestStatus)
              }}
            >
              <SelectTrigger className="border-border-subtle bg-bg-surface">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border-subtle bg-bg-elevated">
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replaceAll('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label>Note (optional)</Label>
            <Textarea
              value={supNote}
              onChange={(e) => setSupNote(e.target.value)}
              rows={2}
              className="border-border-subtle bg-bg-surface"
            />
            <Button type="button" size="sm" onClick={() => void saveAssigneeStatus()} disabled={pending}>
              Save changes
            </Button>
          </div>
        ) : null}

        <div className="border-t border-border-subtle pt-3">
          <h3 className="mb-2 text-xs font-semibold uppercase text-accent-primary">Audit trail</h3>
          <ul className="space-y-3">
            {updates.map((u) => (
              <li key={u.id} className="border-l-2 border-accent-primary/40 pl-3 text-xs">
                <p className="font-mono text-text-secondary">
                  {new Date(u.created_at).toLocaleString()} — {nameMap[u.updated_by] ?? 'User'}
                </p>
                <p className="text-text-primary">
                  {(u.previous_status ?? '—').replaceAll('_', ' ')} →{' '}
                  {(u.new_status ?? '—').replaceAll('_', ' ')}
                </p>
                {u.note ? <p className="text-text-secondary">{u.note}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Drawer>
  )
}
