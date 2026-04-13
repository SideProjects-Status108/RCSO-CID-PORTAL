'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Plus } from 'lucide-react'

import type { Profile } from '@/types/profile'
import type { ScheduleEventRow, ScheduleEventType } from '@/types/schedule'
import {
  deleteScheduleEventAction,
  saveScheduleEventAction,
} from '@/app/(dashboard)/schedule/actions'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/app/drawer'
import { Modal } from '@/components/app/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { EventTypeBadge } from '@/components/app/event-type-badge'
import { StatusStamp } from '@/components/app/status-stamp'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/lib/use-media-query'

const ScheduleCalendar = dynamic(
  () =>
    import('@/components/schedule/schedule-calendar').then((m) => m.ScheduleCalendar),
  { ssr: false, loading: () => <p className="text-sm text-text-secondary">Loading calendar…</p> }
)

const eventTypes: ScheduleEventType[] = [
  'regular',
  'on_call',
  'vacation',
  'school',
  'in_service',
  'fto_shift',
]

const eventFormSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  event_type: z.enum([
    'regular',
    'on_call',
    'vacation',
    'school',
    'in_service',
    'fto_shift',
  ]),
  assigned_to: z.string().uuid(),
  start_datetime: z.string().min(1),
  end_datetime: z.string().min(1),
  is_all_day: z.boolean(),
  status: z.enum(['draft', 'published']),
  notes: z.string().optional(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'custom']),
  recurrence_custom: z.string().optional(),
})

type EventFormValues = z.infer<typeof eventFormSchema>

export type SchedulePagePayload = {
  session: { user: { id: string; email: string | undefined }; profile: Profile }
  events: ScheduleEventRow[]
  assignable: { user_id: string; full_name: string }[]
  currentOnCall: ScheduleEventRow | null
  upcomingOnCall: ScheduleEventRow[]
  myUpcoming: ScheduleEventRow[]
  canManageSchedule: boolean
  ftcOnly: boolean
  userIdFilter: string | null
  personnelByUserId: Record<
    string,
    {
      id: string
      user_id: string | null
      full_name: string
      badge_number: string | null
      phone_cell: string | null
    }
  >
}

type ScheduleViewProps = {
  data: SchedulePagePayload
}

export function ScheduleView({ data }: ScheduleViewProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const narrowCalendar = useMediaQuery('(max-width: 639px)')
  const [calView, setCalView] = useState<'dayGridMonth' | 'timeGridWeek' | 'listWeek'>(
    'dayGridMonth'
  )

  useEffect(() => {
    if (narrowCalendar) {
      setCalView((v) => (v === 'dayGridMonth' ? 'listWeek' : v))
    }
  }, [narrowCalendar])
  const [typeFilters, setTypeFilters] = useState<Record<ScheduleEventType, boolean>>(
    () =>
      Object.fromEntries(eventTypes.map((t) => [t, true])) as Record<
        ScheduleEventType,
        boolean
      >
  )
  const [personFilter, setPersonFilter] = useState<string>(
    data.userIdFilter ?? 'all'
  )
  const [drawerEvent, setDrawerEvent] = useState<ScheduleEventRow | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ScheduleEventRow | null>(null)

  const canAdd = data.canManageSchedule || data.ftcOnly

  const filteredEvents = useMemo(() => {
    return data.events.filter((e) => {
      if (!typeFilters[e.event_type]) return false
      if (personFilter !== 'all' && e.assigned_to !== personFilter) return false
      return true
    })
  }, [data.events, typeFilters, personFilter])

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: '',
      event_type: 'regular',
      is_all_day: false,
      status: 'draft',
      recurrence: 'none',
      notes: '',
      assigned_to: data.session.user.id,
      start_datetime: '',
      end_datetime: '',
    },
  })

  function openCreate() {
    setEditing(null)
    const start = new Date()
    start.setMinutes(0, 0, 0)
    const end = new Date(start)
    end.setHours(end.getHours() + 1)
    form.reset({
      title: '',
      event_type: data.ftcOnly ? 'fto_shift' : 'regular',
      assigned_to: data.session.user.id,
      start_datetime: toLocalInput(start),
      end_datetime: toLocalInput(end),
      is_all_day: false,
      status: 'draft',
      notes: '',
      recurrence: 'none',
      recurrence_custom: '',
    })
    setModalOpen(true)
  }

  function openEdit(ev: ScheduleEventRow) {
    setEditing(ev)
    form.reset({
      id: ev.id,
      title: ev.title,
      event_type: ev.event_type,
      assigned_to: ev.assigned_to,
      start_datetime: toLocalInput(new Date(ev.start_datetime)),
      end_datetime: toLocalInput(new Date(ev.end_datetime)),
      is_all_day: ev.is_all_day,
      status: ev.status,
      notes: ev.notes ?? '',
      recurrence: ev.is_recurring && ev.recurrence_rule === 'FREQ=DAILY' ? 'daily' : ev.is_recurring && ev.recurrence_rule === 'FREQ=WEEKLY' ? 'weekly' : ev.is_recurring ? 'custom' : 'none',
      recurrence_custom:
        ev.recurrence_rule &&
        ev.recurrence_rule !== 'FREQ=DAILY' &&
        ev.recurrence_rule !== 'FREQ=WEEKLY'
          ? ev.recurrence_rule
          : '',
    })
    setDrawerEvent(null)
    setModalOpen(true)
  }

  async function onSubmit(values: EventFormValues) {
    startTransition(async () => {
      try {
        await saveScheduleEventAction({
          id: values.id,
          title: values.title,
          event_type: values.event_type,
          assigned_to: values.assigned_to,
          start_datetime: new Date(values.start_datetime).toISOString(),
          end_datetime: new Date(values.end_datetime).toISOString(),
          is_all_day: values.is_all_day,
          status: values.status,
          notes: values.notes,
          recurrence: values.recurrence,
          recurrence_custom: values.recurrence_custom,
        })
        setModalOpen(false)
        router.refresh()
      } catch {
        // surfaced via toast in later phase
      }
    })
  }

  async function onDelete(id: string) {
    if (!confirm('Delete this event?')) return
    startTransition(async () => {
      await deleteScheduleEventAction(id)
      setModalOpen(false)
      setDrawerEvent(null)
      router.refresh()
    })
  }

  const legend = (
    <div className="flex flex-wrap gap-3 rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-xs text-text-secondary">
      <span className="font-medium text-text-primary">Legend</span>
      {eventTypes.map((t) => (
        <label key={t} className="flex cursor-pointer items-center gap-1.5">
          <Checkbox
            checked={typeFilters[t]}
            onCheckedChange={(c) =>
              setTypeFilters((prev) => ({ ...prev, [t]: Boolean(c) }))
            }
          />
          <EventTypeBadge type={t} />
        </label>
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Schedule</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">
          Unit calendar with published visibility rules, on-call board (live data on each
          request), and your personal schedule list.
        </p>
      </div>

      <Tabs defaultValue="unit">
        <TabsList className="border border-border-subtle bg-bg-surface">
          <TabsTrigger value="unit">Unit calendar</TabsTrigger>
          <TabsTrigger value="mine">My schedule</TabsTrigger>
        </TabsList>
        <TabsContent value="unit" className="space-y-4 pt-4">
          <OnCallBoard
            current={data.currentOnCall}
            upcoming={data.upcomingOnCall}
            personnelByUserId={data.personnelByUserId}
          />
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="min-w-[200px] flex-1 space-y-1">
              <Label className="text-text-secondary">Filter by person</Label>
              <Select
                value={personFilter}
                onValueChange={(v) =>
                  setPersonFilter(typeof v === 'string' ? v : 'all')
                }
              >
                <SelectTrigger className="border-border-subtle bg-bg-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border-subtle bg-bg-elevated">
                  <SelectItem value="all">Everyone</SelectItem>
                  {data.assignable.map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id}>
                      {p.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={calView === 'dayGridMonth' ? 'default' : 'outline'}
                className={cn(
                  calView === 'dayGridMonth' &&
                    'border-accent-primary/30 bg-accent-primary text-bg-app'
                )}
                onClick={() => setCalView('dayGridMonth')}
              >
                Month
              </Button>
              <Button
                type="button"
                variant={calView === 'timeGridWeek' ? 'default' : 'outline'}
                className={cn(
                  calView === 'timeGridWeek' &&
                    'border-accent-primary/30 bg-accent-primary text-bg-app'
                )}
                onClick={() => setCalView('timeGridWeek')}
              >
                Week
              </Button>
              <Button
                type="button"
                variant={calView === 'listWeek' ? 'default' : 'outline'}
                className={cn(
                  calView === 'listWeek' &&
                    'border-accent-primary/30 bg-accent-primary text-bg-app'
                )}
                onClick={() => setCalView('listWeek')}
              >
                Agenda
              </Button>
            </div>
            {canAdd ? (
              <Button
                type="button"
                onClick={openCreate}
                className="border border-accent-primary/30 bg-accent-primary text-bg-app hover:bg-accent-primary-hover"
              >
                <Plus className="size-4" />
                Add event
              </Button>
            ) : null}
          </div>
          {legend}
          <ScheduleCalendar
            key={calView}
            events={filteredEvents}
            initialView={calView}
            onEventClick={(ev) => setDrawerEvent(ev)}
          />
        </TabsContent>
        <TabsContent value="mine" className="space-y-3 pt-4">
          <h2 className="text-lg font-medium text-text-primary">
            Today + next 14 days
          </h2>
          <MyScheduleList events={data.myUpcoming} />
        </TabsContent>
      </Tabs>

      <Drawer
        open={Boolean(drawerEvent)}
        onOpenChange={(o) => !o && setDrawerEvent(null)}
        title={drawerEvent?.title ?? 'Event'}
      >
        {drawerEvent ? (
          <EventDrawerBody
            event={drawerEvent}
            personnel={data.personnelByUserId[drawerEvent.assigned_to]}
            canEdit={
              data.canManageSchedule ||
              (data.ftcOnly &&
                (drawerEvent.event_type === 'fto_shift' ||
                  drawerEvent.event_type === 'school'))
            }
            onEdit={() => openEdit(drawerEvent)}
          />
        ) : null}
      </Drawer>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Edit event' : 'New event'}
        className="max-w-lg"
      >
        <form className="space-y-3" onSubmit={form.handleSubmit((v) => void onSubmit(v))}>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Title</Label>
              <Input className="border-border-subtle bg-bg-app" {...form.register('title')} />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select
                value={form.watch('event_type')}
                onValueChange={(v) => {
                  if (!v) return
                  form.setValue('event_type', v as ScheduleEventType, {
                    shouldValidate: true,
                  })
                }}
                disabled={data.ftcOnly && !data.canManageSchedule}
              >
                <SelectTrigger className="border-border-subtle bg-bg-app">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border-subtle bg-bg-elevated">
                  {(data.ftcOnly && !data.canManageSchedule
                    ? (['fto_shift', 'school'] as const)
                    : eventTypes
                  ).map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replaceAll('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Assigned to</Label>
              <Select
                value={form.watch('assigned_to')}
                onValueChange={(v) => {
                  if (!v) return
                  form.setValue('assigned_to', v)
                }}
              >
                <SelectTrigger className="border-border-subtle bg-bg-app">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border-subtle bg-bg-elevated">
                  {data.assignable.map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id}>
                      {p.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Start</Label>
              <Input
                type="datetime-local"
                className="border-border-subtle bg-bg-app"
                {...form.register('start_datetime')}
              />
            </div>
            <div className="space-y-1">
              <Label>End</Label>
              <Input
                type="datetime-local"
                className="border-border-subtle bg-bg-app"
                {...form.register('end_datetime')}
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Switch
                checked={form.watch('is_all_day')}
                onCheckedChange={(c) => form.setValue('is_all_day', c)}
              />
              <span className="text-sm text-text-secondary">All day</span>
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Switch
                checked={form.watch('status') === 'published'}
                onCheckedChange={(c) =>
                  form.setValue('status', c ? 'published' : 'draft')
                }
              />
              <span className="text-sm text-text-secondary">Published</span>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Recurrence</Label>
              <Select
                value={form.watch('recurrence')}
                onValueChange={(v) => {
                  if (!v) return
                  form.setValue('recurrence', v as EventFormValues['recurrence'])
                }}
              >
                <SelectTrigger className="border-border-subtle bg-bg-app">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border-subtle bg-bg-elevated">
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="custom">Custom (RRULE)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.watch('recurrence') === 'custom' ? (
              <div className="space-y-1 sm:col-span-2">
                <Label>RRULE</Label>
                <Textarea
                  className="border-border-subtle bg-bg-app font-mono text-xs"
                  rows={2}
                  {...form.register('recurrence_custom')}
                />
              </div>
            ) : null}
            <div className="space-y-1 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea
                className="border-border-subtle bg-bg-app"
                rows={3}
                {...form.register('notes')}
              />
            </div>
          </div>
          <div className="flex justify-between gap-2 pt-2">
            {editing ? (
              <Button
                type="button"
                variant="outline"
                className="border-danger/40 text-danger"
                disabled={pending}
                onClick={() => onDelete(editing.id)}
              >
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={pending}
                className="border border-accent-primary/30 bg-accent-primary text-bg-app"
              >
                Save
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function OnCallBoard({
  current,
  upcoming,
  personnelByUserId,
}: {
  current: ScheduleEventRow | null
  upcoming: ScheduleEventRow[]
  personnelByUserId: SchedulePagePayload['personnelByUserId']
}) {
  const currentPerson = current ? personnelByUserId[current.assigned_to] : null
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border-2 border-accent-primary/50 bg-bg-surface p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-accent-primary">
          Currently on-call
        </h2>
        {current && currentPerson ? (
          <div className="mt-3 space-y-1">
            <p className="text-2xl font-semibold text-text-primary">
              {currentPerson.full_name}
            </p>
            <p className="font-mono text-lg text-accent-primary">
              {currentPerson.badge_number ?? '—'}
            </p>
            <a
              href={`tel:${currentPerson.phone_cell ?? ''}`}
              className="block text-xl text-accent-teal hover:underline"
            >
              {currentPerson.phone_cell ?? '—'}
            </a>
            <Link
              href={`/directory`}
              className="text-xs text-text-secondary hover:text-accent-teal"
            >
              Open directory record
            </Link>
          </div>
        ) : (
          <p className="mt-3 text-sm text-text-secondary">No on-call window is active now.</p>
        )}
      </div>
      <div className="rounded-lg border border-border-subtle bg-bg-surface p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Next on-call (7 days)
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          {upcoming.length === 0 ? (
            <li className="text-text-secondary">No upcoming on-call shifts.</li>
          ) : (
            upcoming.map((e) => {
              const p = personnelByUserId[e.assigned_to]
              return (
                <li
                  key={e.id}
                  className="flex flex-col border-b border-border-subtle pb-2 last:border-0"
                >
                  <span className="font-medium text-text-primary">
                    {p?.full_name ?? 'Unknown'}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {new Date(e.start_datetime).toLocaleString()} →{' '}
                    {new Date(e.end_datetime).toLocaleString()}
                  </span>
                  {p?.id ? (
                    <Link
                      className="text-xs text-accent-teal hover:underline"
                      href={`/directory`}
                    >
                      Directory
                    </Link>
                  ) : null}
                </li>
              )
            })
          )}
        </ul>
      </div>
    </div>
  )
}

function MyScheduleList({ events }: { events: ScheduleEventRow[] }) {
  const groups = useMemo(() => {
    const m = new Map<string, ScheduleEventRow[]>()
    for (const e of events) {
      const day = e.start_datetime.slice(0, 10)
      if (!m.has(day)) m.set(day, [])
      m.get(day)!.push(e)
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [events])

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-4">
      {groups.length === 0 ? (
        <p className="text-sm text-text-secondary">No upcoming published events.</p>
      ) : (
        groups.map(([day, list]) => (
          <div key={day}>
            <h3
              className={cn(
                'mb-2 text-sm font-semibold',
                day === today ? 'text-accent-primary' : 'text-text-secondary'
              )}
            >
              {day === today ? 'Today · ' : ''}
              {day}
            </h3>
            <ul className="space-y-2">
              {list.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm"
                >
                  <EventTypeBadge type={e.event_type} />
                  <span className="font-medium text-text-primary">{e.title}</span>
                  <StatusStamp
                    variant={e.status === 'published' ? 'teal' : 'muted'}
                  >
                    {e.status}
                  </StatusStamp>
                  <span className="text-text-secondary">
                    {new Date(e.start_datetime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {' — '}
                    {new Date(e.end_datetime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  )
}

function EventDrawerBody({
  event,
  personnel,
  canEdit,
  onEdit,
}: {
  event: ScheduleEventRow
  personnel?: SchedulePagePayload['personnelByUserId'][string]
  canEdit: boolean
  onEdit: () => void
}) {
  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <EventTypeBadge type={event.event_type} />
        <StatusStamp variant={event.status === 'published' ? 'teal' : 'muted'}>
          {event.status}
        </StatusStamp>
      </div>
      <p className="text-text-secondary">
        {new Date(event.start_datetime).toLocaleString()} —{' '}
        {new Date(event.end_datetime).toLocaleString()}
      </p>
      {personnel ? (
        <p className="text-text-primary">
          Assigned:{' '}
          <span className="font-medium">{personnel.full_name}</span> (
          {personnel.badge_number ?? '—'})
        </p>
      ) : null}
      {event.notes ? (
        <p className="whitespace-pre-wrap text-text-secondary">{event.notes}</p>
      ) : null}
      {canEdit ? (
        <Button
          type="button"
          className="w-full border border-accent-primary/30 bg-accent-primary text-bg-app"
          onClick={onEdit}
        >
          Edit
        </Button>
      ) : null}
    </div>
  )
}
