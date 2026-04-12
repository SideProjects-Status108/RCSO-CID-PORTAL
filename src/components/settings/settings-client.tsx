'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'

import {
  changePasswordAction,
  inviteUserByEmailAction,
  listProfilesForAdminAction,
  setUserActiveAction,
  updateOwnProfileAction,
  updateUserRoleAction,
  uploadOwnProfilePhotoAction,
  type AdminProfileRow,
} from '@/app/(dashboard)/settings/actions'
import type { Profile } from '@/types/profile'
import type { TnTitleRow } from '@/types/tn-code'
import { USER_ROLE_VALUES, type UserRoleValue } from '@/lib/auth/roles'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type GcalState = {
  gcal_email: string | null
  connected_at: string
  updated_at: string | null
} | null

export function SettingsClient({
  profile,
  email,
  gcal,
  isAdmin,
  tnRows,
}: {
  profile: Profile
  email: string | undefined
  gcal: GcalState
  isAdmin: boolean
  tnRows: (TnTitleRow & { chapter_count: number; section_count: number })[]
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const [, start] = useTransition()
  const [fullName, setFullName] = useState(profile.full_name)
  const [cell, setCell] = useState(profile.phone_cell ?? '')
  const [office, setOffice] = useState(profile.phone_office ?? '')
  const [unit, setUnit] = useState(profile.unit ?? '')
  const [pwCur, setPwCur] = useState('')
  const [pwNext, setPwNext] = useState('')
  const [pwConf, setPwConf] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [adminRows, setAdminRows] = useState<AdminProfileRow[]>([])
  const [inviteEmail, setInviteEmail] = useState('')

  const gcalNotice = (() => {
    const g = sp.get('gcal')
    if (g === 'connected') return 'Google Calendar connected.'
    if (g === 'disconnected') return 'Google Calendar disconnected.'
    if (g === 'error') return 'Google Calendar connection failed.'
    return null
  })()

  const banner = msg ?? gcalNotice

  useEffect(() => {
    if (!isAdmin) return
    void listProfilesForAdminAction().then(setAdminRows)
  }, [isAdmin])

  const saveProfile = () => {
    start(async () => {
      try {
        await updateOwnProfileAction({
          full_name: fullName,
          phone_cell: cell || null,
          phone_office: office || null,
          unit: unit || null,
        })
        setMsg('Profile saved.')
        router.refresh()
      } catch (e) {
        setMsg(e instanceof Error ? e.message : 'Save failed')
      }
    })
  }

  const savePw = () => {
    start(async () => {
      try {
        await changePasswordAction({
          current: pwCur,
          next: pwNext,
          confirm: pwConf,
        })
        setPwCur('')
        setPwNext('')
        setPwConf('')
        setMsg('Password updated.')
      } catch (e) {
        setMsg(e instanceof Error ? e.message : 'Password update failed')
      }
    })
  }

  const onPhoto = (f: FileList | null) => {
    const file = f?.[0]
    if (!file) return
    const fd = new FormData()
    fd.set('file', file)
    start(async () => {
      try {
        await uploadOwnProfilePhotoAction(fd)
        setMsg('Photo updated.')
        router.refresh()
      } catch (e) {
        setMsg(e instanceof Error ? e.message : 'Upload failed')
      }
    })
  }

  const disconnectGcal = () => {
    start(async () => {
      const res = await fetch('/api/gcal/disconnect', { method: 'DELETE' })
      if (res.ok) {
        setMsg('Disconnected.')
        router.replace('/settings')
        router.refresh()
      }
    })
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 md:p-6">
      {banner ? (
        <p className="rounded-md border border-border-subtle bg-bg-elevated px-3 py-2 text-sm text-text-secondary">
          {banner}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-text-primary">Profile</h2>
        <p className="text-sm text-text-secondary">{email}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label>Cell phone</Label>
            <Input value={cell} onChange={(e) => setCell(e.target.value)} />
          </div>
          <div>
            <Label>Office phone</Label>
            <Input value={office} onChange={(e) => setOffice(e.target.value)} />
          </div>
          <div>
            <Label>Unit</Label>
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Photo</Label>
          <Input type="file" accept="image/*" className="mt-1" onChange={(e) => onPhoto(e.target.files)} />
        </div>
        <Button type="button" onClick={() => saveProfile()}>
          Save profile
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-text-primary">Google Calendar</h2>
        {gcal ? (
          <div className="space-y-2 rounded-lg border border-border-subtle bg-bg-surface p-4 text-sm">
            <p className="flex items-center gap-2 text-text-primary">
              <span className="inline-block size-2 rounded-full bg-emerald-500" aria-hidden />
              Connected as {gcal.gcal_email ?? 'Google account'}
            </p>
            <p className="text-text-secondary">Connected {new Date(gcal.connected_at).toLocaleString()}</p>
            {gcal.updated_at ? (
              <p className="text-text-secondary">
                Last token refresh {new Date(gcal.updated_at).toLocaleString()}
              </p>
            ) : null}
            <Button type="button" variant="outline" onClick={() => disconnectGcal()}>
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-text-secondary">
              Sync your schedule events automatically to your primary Google calendar.
            </p>
            <Button type="button" onClick={() => (window.location.href = '/api/gcal/connect')}>
              Connect Google Calendar
            </Button>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-text-primary">Change password</h2>
        <div className="grid max-w-md gap-2">
          <Input type="password" placeholder="Current password" value={pwCur} onChange={(e) => setPwCur(e.target.value)} />
          <Input type="password" placeholder="New password (8+ chars)" value={pwNext} onChange={(e) => setPwNext(e.target.value)} />
          <Input type="password" placeholder="Confirm new password" value={pwConf} onChange={(e) => setPwConf(e.target.value)} />
          <Button type="button" variant="outline" onClick={() => savePw()}>
            Update password
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-dashed border-border-subtle bg-bg-surface/50 p-4 text-sm text-text-secondary">
        <h2 className="mb-1 text-lg font-medium text-text-primary">Notifications</h2>
        Notification preferences coming soon.
      </section>

      {isAdmin ? (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-medium text-text-primary">User management</h2>
            <div className="overflow-x-auto rounded-lg border border-border-subtle">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-bg-elevated text-text-secondary">
                    <th className="px-2 py-2">Name</th>
                    <th className="px-2 py-2">Badge</th>
                    <th className="px-2 py-2">Role</th>
                    <th className="px-2 py-2">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {adminRows.map((r) => (
                    <tr key={r.id} className="border-b border-border-subtle/70">
                      <td className="px-2 py-2">{r.full_name}</td>
                      <td className="px-2 py-2 font-mono text-xs">{r.badge_number ?? '—'}</td>
                      <td className="px-2 py-2">
                        <select
                          className="rounded border border-border-subtle bg-bg-app px-1 text-xs"
                          value={r.role}
                          onChange={(e) => {
                            const v = e.target.value as UserRoleValue
                            start(async () => {
                              await updateUserRoleAction(r.id, v)
                              const rows = await listProfilesForAdminAction()
                              setAdminRows(rows)
                            })
                          }}
                        >
                          {USER_ROLE_VALUES.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={r.is_active}
                          onChange={(e) => {
                            start(async () => {
                              await setUserActiveAction(r.id, e.target.checked)
                              const rows = await listProfilesForAdminAction()
                              setAdminRows(rows)
                            })
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Input
                placeholder="Email to invite"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="max-w-xs"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  start(async () => {
                    try {
                      await inviteUserByEmailAction(inviteEmail)
                      setInviteEmail('')
                      setMsg('Invitation sent.')
                    } catch (e) {
                      setMsg(e instanceof Error ? e.message : 'Invite failed')
                    }
                  })
                }}
              >
                Invite user
              </Button>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-medium text-text-primary">Case types</h2>
            <Link
              href="/operations/case-types"
              className={cn(buttonVariants({ variant: 'outline' }), 'inline-flex')}
            >
              Open case type manager
            </Link>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium text-text-primary">TN Code ingestion</h2>
            <p className="max-w-3xl text-sm text-text-secondary">
              Ingestion runs locally with the service role key. Place HTML corpus files in{' '}
              <code className="rounded bg-bg-surface px-1 font-code text-xs">scripts/tn-code-source/</code>.
            </p>
            <div className="overflow-x-auto rounded-lg border border-border-subtle">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-bg-elevated text-text-secondary">
                    <th className="px-2 py-2">Title</th>
                    <th className="px-2 py-2">Name</th>
                    <th className="px-2 py-2">Last ingested</th>
                    <th className="px-2 py-2 text-right">Chapters</th>
                    <th className="px-2 py-2 text-right">Sections</th>
                    <th className="px-2 py-2">Run</th>
                  </tr>
                </thead>
                <tbody>
                  {tnRows.map((r) => (
                    <tr key={r.id} className="border-b border-border-subtle/70">
                      <td className="px-2 py-2 font-mono text-accent-primary">{r.title_number}</td>
                      <td className="max-w-[200px] truncate px-2 py-2 text-text-primary">{r.title_name}</td>
                      <td className="px-2 py-2 text-text-secondary">
                        {r.last_ingested_at
                          ? new Date(r.last_ingested_at).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : '—'}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">{r.chapter_count}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{r.section_count}</td>
                      <td className="px-2 py-2 align-top">
                        <pre className="max-w-[240px] overflow-x-auto rounded border border-border-subtle bg-bg-surface p-1.5 font-code text-[10px] leading-snug">
                          npm run ingest:tn-code -- --title {r.title_number}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
