'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Plus } from 'lucide-react'

import {
  listPersonnelAction,
  savePersonnelAction,
  uploadPersonnelPhotoAction,
  deactivatePersonnelAction,
} from '@/app/(dashboard)/directory/actions'
import { hasRole, UserRole, USER_ROLE_VALUES, type UserRoleValue } from '@/lib/auth/roles'
import type { PersonnelDirectoryRow } from '@/types/personnel'
import {
  personnelFormSchema,
  type PersonnelFormValues,
} from '@/lib/validations/personnel'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Drawer } from '@/components/app/drawer'
import { Modal } from '@/components/app/modal'
import { AppAvatar } from '@/components/app/app-avatar'
import { RoleBadge } from '@/components/app/role-badge'
import { StatusStamp } from '@/components/app/status-stamp'
import type { PersonnelListFilters } from '@/lib/directory/queries'

type DirectoryViewProps = {
  initialRows: PersonnelDirectoryRow[]
  units: string[]
  viewerRole: UserRoleValue
  canManageDirectory: boolean
  canDeactivate: boolean
  /** Open profile drawer for this auth user id when present. */
  highlightUserId?: string | null
}

export function DirectoryView({
  initialRows,
  units,
  viewerRole,
  canManageDirectory,
  canDeactivate,
  highlightUserId,
}: DirectoryViewProps) {
  const [rows, setRows] = useState(initialRows)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('active')
  const [unit, setUnit] = useState<string>('all')
  const [systemRole, setSystemRole] = useState<string>('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState<PersonnelDirectoryRow | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PersonnelDirectoryRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const highlightOpenedRef = useRef(false)

  const filters = useMemo<PersonnelListFilters>(
    () => ({
      search,
      status,
      unit: unit === 'all' ? undefined : unit,
      systemRole:
        systemRole === 'all'
          ? 'all'
          : (systemRole as UserRoleValue),
    }),
    [search, status, unit, systemRole]
  )

  const refresh = useCallback(() => {
    startTransition(async () => {
      setError(null)
      try {
        const next = await listPersonnelAction(filters)
        setRows(next)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load directory')
      }
    })
  }, [filters])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!highlightUserId || highlightOpenedRef.current) return
    const row = rows.find((r) => r.user_id === highlightUserId)
    if (row) {
      highlightOpenedRef.current = true
      setSelected(row)
      setDrawerOpen(true)
    }
  }, [highlightUserId, rows])

  const form = useForm<PersonnelFormValues>({
    resolver: zodResolver(personnelFormSchema),
  })

  useEffect(() => {
    if (!modalOpen) return
    if (editing) {
      form.reset({
        id: editing.id,
        user_id: editing.user_id,
        full_name: editing.full_name,
        badge_number: editing.badge_number,
        role_label: editing.role_label,
        system_role: editing.system_role,
        unit: editing.unit,
        assignment: editing.assignment,
        phone_cell: editing.phone_cell,
        phone_office: editing.phone_office,
        email: editing.email,
        photo_url: editing.photo_url,
        notes: editing.notes,
        is_active: editing.is_active,
      })
    } else {
      form.reset({
        full_name: '',
        system_role: UserRole.detective,
        is_active: true,
      })
    }
  }, [modalOpen, editing, form])

  function openDrawer(row: PersonnelDirectoryRow) {
    setSelected(row)
    setDrawerOpen(true)
  }

  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(row: PersonnelDirectoryRow) {
    setEditing(row)
    setModalOpen(true)
    setDrawerOpen(false)
  }

  async function onSavePersonnel(values: PersonnelFormValues) {
    setError(null)
    try {
      await savePersonnelAction(values)
      setModalOpen(false)
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    }
  }

  async function onDeactivate(id: string) {
    if (!confirm('Deactivate this person? They will be hidden from the active roster.')) return
    setError(null)
    try {
      await deactivatePersonnelAction(id)
      setDrawerOpen(false)
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Deactivate failed')
    }
  }

  const showInactiveFilter = hasRole(viewerRole, [
    UserRole.admin,
    UserRole.supervision_admin,
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Directory</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">
          CID personnel roster: search by name, badge, or unit, open a card for full
          contact details, and manage roster entries if you have directory admin rights.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        <div className="min-w-[200px] flex-1 space-y-1">
          <Label className="text-text-secondary">Search</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, badge, or unit"
            className="border-border-subtle bg-bg-surface text-text-primary"
          />
        </div>
        <div className="w-full space-y-1 md:w-40">
          <Label className="text-text-secondary">Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as typeof status)}
          >
            <SelectTrigger className="border-border-subtle bg-bg-surface text-text-primary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border-subtle bg-bg-elevated text-text-primary">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              {showInactiveFilter ? (
                <SelectItem value="inactive">Inactive</SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full space-y-1 md:w-44">
          <Label className="text-text-secondary">Unit</Label>
          <Select
            value={unit}
            onValueChange={(v) => setUnit(typeof v === 'string' ? v : 'all')}
          >
            <SelectTrigger className="border-border-subtle bg-bg-surface text-text-primary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border-subtle bg-bg-elevated text-text-primary">
              <SelectItem value="all">All units</SelectItem>
              {units.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full space-y-1 md:w-48">
          <Label className="text-text-secondary">Role</Label>
          <Select
            value={systemRole}
            onValueChange={(v) =>
              setSystemRole(typeof v === 'string' ? v : 'all')
            }
          >
            <SelectTrigger className="border-border-subtle bg-bg-surface text-text-primary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border-subtle bg-bg-elevated text-text-primary">
              <SelectItem value="all">All roles</SelectItem>
              {USER_ROLE_VALUES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r.replaceAll('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canManageDirectory ? (
          <Button
            type="button"
            onClick={openCreate}
            className="border border-accent-primary/30 bg-accent-primary text-bg-app hover:bg-accent-primary-hover"
          >
            <Plus className="size-4" />
            Add Personnel
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border-subtle bg-bg-surface">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border-subtle bg-bg-elevated/40 text-xs uppercase tracking-wide text-text-secondary">
            <tr>
              <th className="px-3 py-2">Person</th>
              <th className="px-3 py-2">Badge</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2">Cell</th>
            </tr>
          </thead>
          <tbody>
            {pending && rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-text-secondary">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-text-secondary">
                  No personnel match these filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-b border-border-subtle transition-colors hover:border-l-2 hover:border-l-accent-primary hover:bg-bg-elevated/30"
                  onClick={() => openDrawer(row)}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="relative">
                        <AppAvatar name={row.full_name} photoUrl={row.photo_url} size="sm" />
                        {row.is_active ? (
                          <span
                            className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-bg-surface"
                            aria-label="Active"
                          />
                        ) : null}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-text-primary">
                            {row.full_name}
                          </span>
                          {!row.is_active ? (
                            <StatusStamp variant="muted">Inactive</StatusStamp>
                          ) : null}
                        </div>
                        <RoleBadge role={row.system_role} className="mt-0.5" />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-accent-primary">
                    {row.badge_number ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">
                    {row.role_label ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">{row.unit ?? '—'}</td>
                  <td className="px-3 py-2 text-text-secondary">
                    {row.phone_cell ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Drawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={selected?.full_name ?? 'Profile'}
      >
        {selected ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <AppAvatar name={selected.full_name} photoUrl={selected.photo_url} size="lg" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <RoleBadge role={selected.system_role} />
                  {!selected.is_active ? (
                    <StatusStamp variant="muted">Inactive</StatusStamp>
                  ) : null}
                </div>
                <p className="font-mono text-sm text-accent-primary">
                  {selected.badge_number ?? '—'}
                </p>
                <p className="text-sm text-text-secondary">{selected.role_label ?? '—'}</p>
              </div>
            </div>
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-text-disabled">Unit</dt>
                <dd className="text-text-primary">{selected.unit ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-text-disabled">Assignment</dt>
                <dd className="text-text-primary">{selected.assignment ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-text-disabled">Cell</dt>
                <dd className="text-text-primary">{selected.phone_cell ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-text-disabled">Office</dt>
                <dd className="text-text-primary">{selected.phone_office ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-text-disabled">Email</dt>
                <dd className="text-text-primary break-all">{selected.email ?? '—'}</dd>
              </div>
              {selected.notes ? (
                <div>
                  <dt className="text-text-disabled">Notes</dt>
                  <dd className="text-text-primary whitespace-pre-wrap">{selected.notes}</dd>
                </div>
              ) : null}
            </dl>
            {selected.user_id ? (
              <Link
                href={`/schedule?userId=${encodeURIComponent(selected.user_id)}`}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'default' }),
                  'inline-flex w-full justify-center border-accent-teal/40 text-accent-teal hover:bg-accent-teal/10'
                )}
              >
                View schedule
              </Link>
            ) : (
              <p className="text-xs text-text-disabled">
                No linked portal account — schedule filtering by this person is unavailable.
              </p>
            )}
            {canManageDirectory ? (
              <Button
                type="button"
                variant="outline"
                className="w-full border-accent-primary/40 text-accent-primary"
                onClick={() => openEdit(selected)}
              >
                Edit
              </Button>
            ) : null}
            {canDeactivate && selected.is_active ? (
              <Button
                type="button"
                variant="outline"
                className="w-full border-danger/40 text-danger hover:bg-danger/10"
                onClick={() => onDeactivate(selected.id)}
              >
                Deactivate
              </Button>
            ) : null}
          </div>
        ) : null}
      </Drawer>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Edit personnel' : 'Add personnel'}
        className="max-w-xl"
      >
        <form
          className="space-y-3"
          onSubmit={form.handleSubmit((v) => void onSavePersonnel(v))}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Full name</Label>
              <Input
                className="border-border-subtle bg-bg-app"
                {...form.register('full_name')}
              />
            </div>
            <div className="space-y-1">
              <Label>Badge number</Label>
              <Input
                className="border-border-subtle bg-bg-app"
                {...form.register('badge_number')}
              />
            </div>
            <div className="space-y-1">
              <Label>Portal user id (optional)</Label>
              <Input
                className="border-border-subtle bg-bg-app"
                placeholder="auth.users UUID"
                {...form.register('user_id')}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Duty title</Label>
              <Input
                className="border-border-subtle bg-bg-app"
                {...form.register('role_label')}
              />
            </div>
            <div className="space-y-1">
              <Label>System role</Label>
              <Select
                value={form.watch('system_role')}
                onValueChange={(v) =>
                  form.setValue('system_role', v as UserRoleValue, { shouldValidate: true })
                }
              >
                <SelectTrigger className="border-border-subtle bg-bg-app">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border-subtle bg-bg-elevated">
                  {USER_ROLE_VALUES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r.replaceAll('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Unit</Label>
              <Input className="border-border-subtle bg-bg-app" {...form.register('unit')} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Assignment</Label>
              <Input
                className="border-border-subtle bg-bg-app"
                {...form.register('assignment')}
              />
            </div>
            <div className="space-y-1">
              <Label>Cell phone</Label>
              <Input
                className="border-border-subtle bg-bg-app"
                {...form.register('phone_cell')}
              />
            </div>
            <div className="space-y-1">
              <Label>Office phone</Label>
              <Input
                className="border-border-subtle bg-bg-app"
                {...form.register('phone_office')}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Email</Label>
              <Input className="border-border-subtle bg-bg-app" {...form.register('email')} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Notes (admin scope)</Label>
              <Textarea
                className="border-border-subtle bg-bg-app"
                rows={3}
                {...form.register('notes')}
              />
            </div>
            {editing ? (
              <div className="flex items-center gap-2 sm:col-span-2">
                <Switch
                  checked={form.watch('is_active') ?? true}
                  onCheckedChange={(c) => form.setValue('is_active', c)}
                />
                <span className="text-sm text-text-secondary">Active roster member</span>
              </div>
            ) : null}
            {editing?.id ? (
              <div className="space-y-1 sm:col-span-2">
                <Label>Photo</Label>
                <Input
                  type="file"
                  accept="image/*"
                  className="border-border-subtle bg-bg-app"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file || !editing?.id) return
                    const fd = new FormData()
                    fd.set('personnelId', editing.id)
                    fd.set('file', file)
                    try {
                      await uploadPersonnelPhotoAction(fd)
                      refresh()
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Upload failed')
                    }
                  }}
                />
              </div>
            ) : null}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="border border-accent-primary/30 bg-accent-primary text-bg-app hover:bg-accent-primary-hover"
            >
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
