'use client'

import { useEffect, useState, useTransition } from 'react'
import { Check } from 'lucide-react'

import { ActivityLogger } from '@/components/training/activity-logger'
import { cn } from '@/lib/utils'
import type { ActivityExposure, ActivityTemplate } from '@/types/training'

export type ActivityListSummaryProps = {
  dit_record_id: string
  week_start_date: string
  week_end_date: string
  default_fto_id: string
  fto_options?: { id: string; name: string }[]
  refreshKey?: number
}

export function ActivityListSummary({
  dit_record_id,
  week_start_date,
  week_end_date,
  default_fto_id,
  fto_options,
  refreshKey = 0,
}: ActivityListSummaryProps) {
  const [templates, setTemplates] = useState<ActivityTemplate[]>([])
  const [exposures, setExposures] = useState<ActivityExposure[]>([])
  const [tick, setTick] = useState(0)
  const [, start] = useTransition()

  const bump = () => setTick((n) => n + 1)

  useEffect(() => {
    start(async () => {
      const [tRes, eRes] = await Promise.all([
        fetch('/api/training/activity-templates', { credentials: 'same-origin' }),
        fetch(
          `/api/training/activities?dit_record_id=${encodeURIComponent(dit_record_id)}&week_start=${encodeURIComponent(week_start_date)}`,
          { credentials: 'same-origin' }
        ),
      ])
      const tj = (await tRes.json()) as { templates?: ActivityTemplate[] }
      const ej = (await eRes.json()) as { exposures?: ActivityExposure[] }
      if (tRes.ok) setTemplates(tj.templates ?? [])
      if (eRes.ok) setExposures(ej.exposures ?? [])
    })
  }, [dit_record_id, week_start_date, refreshKey, tick])

  const byTemplate = (tid: string) => exposures.filter((e) => e.activity_template_id === tid)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-primary">
          Activity log (this week)
        </h3>
        <ActivityLogger
          dit_record_id={dit_record_id}
          week_start_date={week_start_date}
          week_end_date={week_end_date}
          default_fto_id={default_fto_id}
          fto_options={fto_options}
          onActivityLogged={bump}
        />
      </div>

      <div className="space-y-4">
        {templates.map((tpl) => {
          const rows = byTemplate(tpl.id)
          const required = tpl.required_exposures_phase_1
          const done = rows.length
          const complete = required > 0 && done >= required
          return (
            <div key={tpl.id} className="rounded-lg border border-border-subtle bg-bg-surface p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-text-primary">{tpl.activity_name}</p>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-xs',
                    complete ? 'text-emerald-400' : 'text-text-secondary'
                  )}
                >
                  {complete ? <Check className="size-3.5" aria-hidden /> : null}
                  {done} of {required} required
                </span>
              </div>
              {rows.length === 0 ? (
                <p className="mt-2 text-xs text-text-secondary">No entries yet.</p>
              ) : (
                <ul className="mt-2 space-y-1 text-xs text-text-secondary">
                  {rows.map((r) => (
                    <li key={r.id} className="flex flex-wrap gap-x-2 border-t border-border-subtle pt-1 first:border-0 first:pt-0">
                      <span>{r.exposure_date}</span>
                      <span>FTO {r.fto_id.slice(0, 8)}…</span>
                      <span>{r.case_complaint_number ?? '—'}</span>
                      <span className="capitalize">{r.role}</span>
                      <span>{r.duration_minutes != null ? `${r.duration_minutes} min` : '—'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
