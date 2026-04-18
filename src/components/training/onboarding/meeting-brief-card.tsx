'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

const CHECKLIST = [
  '10-week program overview',
  'Probationary phase expectations',
  'Dress code and schedules',
  'Division areas',
  'Case management',
  'Chain of command',
  'Weekly evaluation process',
  'Equipment list',
] as const

export function MeetingBriefCard() {
  const [checks, setChecks] = useState<boolean[]>(() => CHECKLIST.map(() => false))

  function toggle(i: number) {
    setChecks((prev) => {
      const next = [...prev]
      next[i] = !next[i]
      return next
    })
  }

  return (
    <div className="flex h-full flex-col gap-2 rounded-lg border border-border-subtle bg-bg-app/40 p-3 print:border-0 print:bg-transparent">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Onboarding meeting brief
        </h3>
        <span className="text-[10px] text-text-secondary">
          {checks.filter(Boolean).length}/{CHECKLIST.length}
        </span>
      </div>

      <ul className="space-y-1.5">
        {CHECKLIST.map((item, i) => (
          <li key={item} className="flex items-center gap-2 text-sm">
            <Checkbox
              id={`meeting-brief-${i}`}
              checked={checks[i]}
              onCheckedChange={() => toggle(i)}
            />
            <label
              htmlFor={`meeting-brief-${i}`}
              className={cn(
                'cursor-pointer select-none text-text-primary',
                checks[i] && 'text-text-secondary line-through'
              )}
            >
              {item}
            </label>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1 print:hidden">
        <Button type="button" size="sm" variant="outline" disabled title="Schedule Meeting lands in a later prompt">
          Schedule meeting
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => typeof window !== 'undefined' && window.print()}
        >
          Print
        </Button>
        <Button type="button" size="sm" variant="outline" disabled title="Email PDF lands in a later prompt">
          Email
        </Button>
      </div>
    </div>
  )
}
