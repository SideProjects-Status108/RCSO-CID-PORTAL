'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'

import { searchCasesAction } from '@/app/(dashboard)/forms/actions'
import { buttonVariants } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type CaseOption = { id: string; case_number: string }

export function CaseCombobox({
  valueId,
  valueLabel,
  onSelect,
  disabled,
}: {
  valueId: string | null
  valueLabel: string | null
  onSelect: (id: string | null, caseNumber: string | null) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<CaseOption[]>([])
  const [pending, startTransition] = useTransition()

  const search = useCallback((q: string) => {
    startTransition(async () => {
      const rows = await searchCasesAction(q)
      setOptions(rows)
    })
  }, [])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => search(query), 200)
    return () => clearTimeout(t)
  }, [open, query, search])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          buttonVariants({ variant: 'outline' }),
          'h-auto min-h-9 w-full justify-between border-border-subtle bg-bg-surface py-2 text-left font-normal',
          !valueLabel && 'text-text-secondary'
        )}
      >
        <span className="truncate">{valueLabel ?? 'Search case number…'}</span>
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] border-border-subtle bg-bg-elevated p-2" align="start">
        <Input
          placeholder="Type case number…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-2 border-border-subtle bg-bg-surface"
        />
        <div className="max-h-48 space-y-0.5 overflow-y-auto text-sm">
          <button
            type="button"
            className="flex w-full items-center rounded px-2 py-1.5 text-left text-text-secondary hover:bg-bg-app"
            onClick={() => {
              onSelect(null, null)
              setOpen(false)
            }}
          >
            No case linked
          </button>
          {pending ? (
            <p className="px-2 py-2 text-text-secondary">Searching…</p>
          ) : null}
          {options.map((c) => (
            <button
              key={c.id}
              type="button"
              className={cn(
                'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-bg-app',
                c.id === valueId && 'bg-accent-gold/15'
              )}
              onClick={() => {
                onSelect(c.id, c.case_number)
                setOpen(false)
              }}
            >
              {c.id === valueId ? <Check className="size-4 text-accent-gold" /> : (
                <span className="size-4 shrink-0" />
              )}
              <span className="font-mono text-text-primary">{c.case_number}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
