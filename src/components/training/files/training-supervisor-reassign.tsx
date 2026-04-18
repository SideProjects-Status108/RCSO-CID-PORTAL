'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { assignTrainingSupervisorAction } from '@/app/(dashboard)/training/actions'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export type EligibleSupervisor = {
  id: string
  full_name: string
  role: string
  badge_number: string | null
}

type Props = {
  currentId: string | null
  eligible: EligibleSupervisor[]
}

export function TrainingSupervisorReassignButton({ currentId, eligible }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const submit = (targetId: string | null) => {
    setError(null)
    startTransition(async () => {
      const res = await assignTrainingSupervisorAction(targetId)
      if (!res.ok) {
        setError(res.message)
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button size="sm" variant="secondary">
            {currentId ? 'Reassign' : 'Assign'}
          </Button>
        }
      />
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b border-border-subtle px-3 py-2">
          <div className="text-sm font-semibold text-text-primary">Assign Training Supervisor</div>
          <p className="mt-0.5 text-xs text-text-tertiary">
            Pick from active supervision / supervision-admin / FTO Coordinator profiles. Only one
            person holds the seat at a time.
          </p>
        </div>
        <ul className="max-h-72 overflow-y-auto py-1">
          {eligible.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-text-tertiary">
              No eligible profiles found.
            </li>
          ) : (
            eligible.map((p) => {
              const isCurrent = p.id === currentId
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={pending || isCurrent}
                    onClick={() => submit(p.id)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-bg-subtle disabled:opacity-50"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium text-text-primary">{p.full_name}</span>
                      <span className="truncate text-xs text-text-tertiary">
                        {formatRole(p.role)}
                        {p.badge_number ? ` · #${p.badge_number}` : ''}
                      </span>
                    </span>
                    {isCurrent ? (
                      <span className="shrink-0 rounded-full bg-bg-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                        Current
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })
          )}
        </ul>
        <div className="flex items-center justify-between border-t border-border-subtle px-3 py-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending || !currentId}
            onClick={() => submit(null)}
          >
            Vacate seat
          </Button>
          {error ? (
            <span className="text-xs text-red-400" role="alert">
              {error}
            </span>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function formatRole(role: string): string {
  switch (role) {
    case 'supervision_admin':
      return 'Supervision Admin'
    case 'supervision':
      return 'Supervision'
    case 'fto_coordinator':
      return 'FTO Coordinator'
    default:
      return role
  }
}
