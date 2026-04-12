'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Mail, MessageSquare, Phone, X } from 'lucide-react'

import { BottomSheet } from '@/components/companion/bottom-sheet'
import { CompanionCard } from '@/components/companion/companion-card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { PersonnelDirectoryRow } from '@/types/personnel'
import type { UserRoleValue } from '@/lib/auth/roles'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase()
}

function roleDisplay(row: PersonnelDirectoryRow) {
  return row.role_label?.trim() || row.system_role.replaceAll('_', ' ')
}

type Chip = { id: string; label: string }

export function CompanionDirectoryView({
  initialRows,
  units,
}: {
  initialRows: PersonnelDirectoryRow[]
  units: string[]
}) {
  const [search, setSearch] = useState('')
  const [unitFilter, setUnitFilter] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<UserRoleValue | 'all'>('all')
  const [selected, setSelected] = useState<PersonnelDirectoryRow | null>(null)

  const roleChips: Chip[] = useMemo(() => {
    const s = new Set<UserRoleValue>()
    for (const r of initialRows) {
      s.add(r.system_role)
    }
    return [...s]
      .sort()
      .map((r) => ({ id: r, label: r.replaceAll('_', ' ') }))
  }, [initialRows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return initialRows.filter((r) => {
      if (unitFilter !== 'all' && (r.unit ?? '') !== unitFilter) return false
      if (roleFilter !== 'all' && r.system_role !== roleFilter) return false
      if (!q) return true
      return (
        r.full_name.toLowerCase().includes(q) ||
        (r.badge_number?.toLowerCase().includes(q) ?? false) ||
        (r.unit?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [initialRows, search, unitFilter, roleFilter])

  const telHref = (raw: string | null | undefined) => {
    if (!raw) return null
    const cleaned = raw.replace(/[^\d+]/g, '')
    return cleaned ? `tel:${cleaned}` : null
  }

  const smsHref = (raw: string | null | undefined) => {
    if (!raw) return null
    const cleaned = raw.replace(/[^\d+]/g, '')
    return cleaned ? `sms:${cleaned}` : null
  }

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-lg font-semibold uppercase tracking-wide text-text-primary">
        Directory
      </h1>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search name, badge, or unit"
        className="border-border-subtle bg-bg-surface"
        aria-label="Search directory"
      />

      <div className="-mx-1 flex gap-2 overflow-x-auto pb-1">
        <FilterChip active={unitFilter === 'all' && roleFilter === 'all'} onClick={() => {
          setUnitFilter('all')
          setRoleFilter('all')
        }}>
          All
        </FilterChip>
        {units.map((u) => (
          <FilterChip
            key={u}
            active={unitFilter === u}
            onClick={() => {
              setUnitFilter(u)
              setRoleFilter('all')
            }}
          >
            {u}
          </FilterChip>
        ))}
        {roleChips.map((c) => (
          <FilterChip
            key={c.id}
            active={roleFilter === c.id}
            onClick={() => {
              setRoleFilter(c.id as UserRoleValue)
              setUnitFilter('all')
            }}
          >
            {c.label}
          </FilterChip>
        ))}
      </div>

      <ul className="space-y-2">
        {filtered.map((row) => (
          <li key={row.id}>
            <CompanionCard
              className="flex cursor-pointer gap-3 p-3"
              onClick={() => setSelected(row)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSelected(row)
                }
              }}
              role="button"
              tabIndex={0}
            >
              <Avatar photoUrl={row.photo_url} name={row.full_name} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-text-primary">{row.full_name}</p>
                <p className="text-xs capitalize text-text-secondary">
                  {roleDisplay(row)}
                  {row.unit ? ` · ${row.unit}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {row.phone_cell ? (
                  <>
                    <a
                      href={telHref(row.phone_cell) ?? undefined}
                      onClick={(e) => e.stopPropagation()}
                      className="flex size-11 items-center justify-center rounded-lg border border-border-subtle text-accent-gold hover:bg-bg-elevated"
                      aria-label="Call cell"
                    >
                      <Phone className="size-4" strokeWidth={1.75} />
                    </a>
                    <a
                      href={smsHref(row.phone_cell) ?? undefined}
                      onClick={(e) => e.stopPropagation()}
                      className="flex size-11 items-center justify-center rounded-lg border border-border-subtle text-accent-teal hover:bg-bg-elevated"
                      aria-label="Text cell"
                    >
                      <MessageSquare className="size-4" strokeWidth={1.75} />
                    </a>
                  </>
                ) : (
                  <span className="flex size-11 items-center justify-center text-text-disabled" title="No cell">
                    <Phone className="size-4 opacity-40" strokeWidth={1.75} />
                  </span>
                )}
              </div>
            </CompanionCard>
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-text-secondary">No matching personnel.</p>
      ) : null}

      <BottomSheet
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        panelClassName="max-h-[min(92dvh,720px)]"
      >
        {selected ? (
          <ProfileSheetBody
            row={selected}
            telHref={telHref}
            smsHref={smsHref}
            onClose={() => setSelected(null)}
          />
        ) : null}
      </BottomSheet>
    </div>
  )
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-accent-gold/50 bg-accent-gold/15 text-accent-gold'
          : 'border-border-subtle bg-bg-surface text-text-secondary'
      )}
    >
      {children}
    </button>
  )
}

function Avatar({ photoUrl, name }: { photoUrl: string | null; name: string }) {
  const [broken, setBroken] = useState(false)
  if (photoUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt=""
        className="size-11 shrink-0 rounded-full border border-border-subtle object-cover"
        onError={() => setBroken(true)}
      />
    )
  }
  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-bg-elevated font-mono text-xs font-semibold text-accent-gold">
      {initials(name)}
    </div>
  )
}

function ProfileSheetBody({
  row,
  telHref,
  smsHref,
  onClose,
}: {
  row: PersonnelDirectoryRow
  telHref: (s: string | null | undefined) => string | null
  smsHref: (s: string | null | undefined) => string | null
  onClose: () => void
}) {
  const cellTel = telHref(row.phone_cell)
  const cellSms = smsHref(row.phone_cell)
  const officeTel = telHref(row.phone_office)

  return (
    <div className="relative space-y-4">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-0 top-0 size-10 text-text-secondary hover:text-text-primary"
        onClick={onClose}
        aria-label="Close"
      >
        <X className="size-5" strokeWidth={1.75} />
      </Button>

      <div className="flex flex-col items-center gap-2 pt-2">
        <LargeAvatar photoUrl={row.photo_url} name={row.full_name} />
        <p className="text-center text-xl font-semibold text-text-primary">{row.full_name}</p>
        <p className="font-mono text-sm text-accent-gold">{row.badge_number ?? '—'}</p>
        <p className="text-center text-sm capitalize text-text-secondary">
          {roleDisplay(row)}
          {row.unit ? ` · ${row.unit}` : ''}
        </p>
        {row.assignment?.trim() ? (
          <p className="text-center text-xs text-text-secondary">{row.assignment.trim()}</p>
        ) : null}
      </div>

      <div className="space-y-3 border-t border-border-subtle pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary">
          Contact
        </p>
        {row.phone_cell ? (
          <div className="flex flex-wrap gap-2">
            {cellTel ? (
              <a
                href={cellTel}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'inline-flex gap-2 border-accent-gold/40'
                )}
              >
                <Phone className="size-4 text-accent-gold" strokeWidth={1.75} />
                Call cell
              </a>
            ) : null}
            {cellSms ? (
              <a
                href={cellSms}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'inline-flex gap-2 border-accent-teal/40'
                )}
              >
                <MessageSquare className="size-4 text-accent-teal" strokeWidth={1.75} />
                Text cell
              </a>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-text-secondary">Cell phone not available.</p>
        )}
        {row.phone_office && officeTel ? (
          <div>
            <p className="mb-1 text-xs text-text-secondary">Office</p>
            <a
              href={officeTel}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'inline-flex gap-2')}
            >
              <Phone className="size-4" strokeWidth={1.75} />
              {row.phone_office}
            </a>
          </div>
        ) : null}
        {row.email ? (
          <div>
            <p className="mb-1 text-xs text-text-secondary">Email</p>
            <a
              href={`mailto:${row.email}`}
              className="inline-flex items-center gap-2 text-sm text-accent-teal underline"
            >
              <Mail className="size-4" strokeWidth={1.75} />
              {row.email}
            </a>
          </div>
        ) : null}
      </div>

      {row.user_id ? (
        <Link
          href={`/app/schedule?viewAs=${encodeURIComponent(row.user_id)}`}
          onClick={onClose}
          className={cn(
            buttonVariants({ size: 'default' }),
            'flex w-full justify-center bg-accent-primary text-white hover:bg-accent-primary-hover'
          )}
        >
          View schedule
        </Link>
      ) : null}
    </div>
  )
}

function LargeAvatar({ photoUrl, name }: { photoUrl: string | null; name: string }) {
  const [broken, setBroken] = useState(false)
  if (photoUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt=""
        className="size-20 rounded-full border border-border-subtle object-cover"
        onError={() => setBroken(true)}
      />
    )
  }
  return (
    <div className="flex size-20 items-center justify-center rounded-full border border-border-subtle bg-bg-elevated font-mono text-lg font-semibold text-accent-gold">
      {initials(name)}
    </div>
  )
}
