'use client'

import { useCallback, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ClipboardList,
  FileQuestion,
  GraduationCap,
  RefreshCw,
  Search as SearchIcon,
} from 'lucide-react'

import { BottomSheet } from '@/components/companion/bottom-sheet'
import { CompanionCard } from '@/components/companion/companion-card'
import { CompanionFlash } from '@/components/companion/companion-flash'
import { DetectiveActivityFormSheet } from '@/components/companion/forms/DetectiveActivityFormSheet'
import { DITObservationFormSheet } from '@/components/companion/forms/DITObservationFormSheet'
import { CaseIntakeFormSheet } from '@/components/companion/forms/CaseIntakeFormSheet'
import { GeneralRequestFormSheet } from '@/components/companion/forms/GeneralRequestFormSheet'
import { FormValuesReadonly } from '@/components/forms/form-values-readonly'
import { StatusStamp } from '@/components/app/status-stamp'
import { getSubmissionDetailAction } from '@/app/(dashboard)/forms/actions'
import { submissionStatusForStamp } from '@/lib/forms/submission-status-display'
import type { CompanionFormSubmissionListItem } from '@/lib/companion/forms-queries'
import type { PersonnelDirectoryRow } from '@/types/personnel'
import type { SubmissionDetail } from '@/lib/forms/queries'
import { hapticSuccess } from '@/lib/haptic'
import { cn } from '@/lib/utils'

type SheetKey =
  | 'detective_activity'
  | 'dit_observation'
  | 'case_intake'
  | 'general'
  | null

const tileBtn =
  'flex min-h-[7.5rem] flex-col items-start justify-end gap-1 rounded-lg border border-border-subtle bg-bg-surface p-3 text-left transition-colors active:bg-bg-elevated'

export function CompanionFormsView({
  userDisplayName,
  showDitTile,
  templateIds,
  detectives,
  ditTrainees,
  initialSubmissions,
}: {
  userDisplayName: string
  showDitTile: boolean
  templateIds: {
    detectiveActivity: string | null
    ditObservation: string | null
    caseIntake: string | null
  }
  detectives: Pick<PersonnelDirectoryRow, 'id' | 'full_name'>[]
  ditTrainees: Pick<PersonnelDirectoryRow, 'id' | 'full_name'>[]
  initialSubmissions: CompanionFormSubmissionListItem[]
}) {
  const router = useRouter()
  const [, startNav] = useTransition()
  const [tab, setTab] = useState<'submit' | 'mine'>('submit')
  const [openSheet, setOpenSheet] = useState<SheetKey>(null)
  const [flash, setFlash] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(false)
  const [detail, setDetail] = useState<SubmissionDetail | null>(null)
  const [detailRetryId, setDetailRetryId] = useState<string | null>(null)

  const refresh = useCallback(() => {
    startNav(() => router.refresh())
  }, [router])

  const onSubmitted = useCallback(() => {
    hapticSuccess()
    setFlash({ tone: 'success', text: 'Submitted successfully.' })
    setTab('mine')
    refresh()
  }, [refresh])

  const onError = useCallback((message: string) => {
    setFlash({ tone: 'error', text: message })
  }, [])

  const tiles = useMemo(() => {
    const base: {
      key: SheetKey
      title: string
      desc: string
      icon: typeof ClipboardList
      hidden?: boolean
    }[] = [
      {
        key: 'detective_activity',
        title: 'Detective Activity',
        desc: 'Log hours and case work',
        icon: ClipboardList,
      },
      {
        key: 'dit_observation',
        title: 'DIT Observation',
        desc: 'Daily FTO observation',
        icon: GraduationCap,
        hidden: !showDitTile,
      },
      {
        key: 'case_intake',
        title: 'Case Intake',
        desc: 'New assignment details',
        icon: SearchIcon,
      },
      {
        key: 'general',
        title: 'General Request',
        desc: 'Routine or urgent request',
        icon: FileQuestion,
      },
    ]
    return base.filter((t) => !t.hidden)
  }, [showDitTile])

  async function openSubmissionRow(id: string) {
    setDetailOpen(true)
    setDetailLoading(true)
    setDetailError(false)
    setDetailRetryId(id)
    setDetail(null)
    try {
      const d = await getSubmissionDetailAction(id)
      if (!d) {
        setDetailError(true)
        setDetail(null)
      } else {
        setDetail(d)
        setDetailError(false)
      }
    } catch {
      setDetailError(true)
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div className="pb-4">
      <h1 className="font-heading text-lg font-semibold uppercase tracking-wide text-text-primary">
        Forms
      </h1>

      <CompanionFlash
        message={flash?.text ?? null}
        tone={flash?.tone ?? 'success'}
        onDismiss={() => setFlash(null)}
      />

      <div className="mt-4 flex rounded-md border border-border-subtle bg-bg-elevated p-0.5 text-sm font-medium">
        <button
          type="button"
          className={cn(
            'min-h-10 flex-1 rounded-sm px-2 font-heading text-sm font-medium tracking-wide transition-colors',
            tab === 'submit' ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-secondary'
          )}
          onClick={() => setTab('submit')}
        >
          Submit
        </button>
        <button
          type="button"
          className={cn(
            'min-h-10 flex-1 rounded-sm px-2 font-heading text-sm font-medium tracking-wide transition-colors',
            tab === 'mine' ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-secondary'
          )}
          onClick={() => setTab('mine')}
        >
          My Submissions
        </button>
      </div>

      {tab === 'submit' ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {tiles.map(({ key, title, desc, icon: Icon }) => (
            <button
              key={key ?? 'x'}
              type="button"
              className={tileBtn}
              onClick={() => setOpenSheet(key)}
            >
              <Icon className="size-6 text-accent-primary" strokeWidth={1.5} aria-hidden />
              <span className="text-sm font-semibold text-text-primary">{title}</span>
              <span className="text-xs text-text-secondary">{desc}</span>
            </button>
          ))}
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {initialSubmissions.length === 0 ? (
            <CompanionCard className="flex flex-col items-center gap-2 py-10 text-center">
              <ClipboardList className="size-10 text-accent-primary" strokeWidth={1.5} aria-hidden />
              <p className="font-heading text-sm font-semibold text-text-primary">No submissions yet</p>
              <p className="font-sans text-xs text-text-secondary">
                Use the Submit tab to send a form — it will appear here with status updates.
              </p>
            </CompanionCard>
          ) : (
            initialSubmissions.map((s) => {
              const st = submissionStatusForStamp(s.status)
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    className="flex w-full min-h-[3.25rem] items-center justify-between gap-2 rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-left"
                    onClick={() => openSubmissionRow(s.id)}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">{s.templateName}</p>
                      <p className="text-xs text-text-disabled">
                        {new Date(s.created_at).toLocaleString()}
                      </p>
                    </div>
                    <StatusStamp variant={st.variant}>
                      {st.label}
                    </StatusStamp>
                  </button>
                </li>
              )
            })
          )}
        </ul>
      )}

      <DetectiveActivityFormSheet
        open={openSheet === 'detective_activity'}
        onClose={() => setOpenSheet(null)}
        templateId={templateIds.detectiveActivity}
        detectiveName={userDisplayName}
        onSubmitted={onSubmitted}
        onError={onError}
      />
      <DITObservationFormSheet
        open={openSheet === 'dit_observation'}
        onClose={() => setOpenSheet(null)}
        templateId={templateIds.ditObservation}
        ftoName={userDisplayName}
        ditPersonnel={ditTrainees}
        onSubmitted={onSubmitted}
        onError={onError}
      />
      <CaseIntakeFormSheet
        open={openSheet === 'case_intake'}
        onClose={() => setOpenSheet(null)}
        templateId={templateIds.caseIntake}
        detectives={detectives}
        onSubmitted={onSubmitted}
        onError={onError}
      />
      <GeneralRequestFormSheet
        open={openSheet === 'general'}
        onClose={() => setOpenSheet(null)}
        onSubmitted={onSubmitted}
        onError={onError}
      />

      <BottomSheet
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false)
          setDetail(null)
          setDetailError(false)
          setDetailRetryId(null)
        }}
        title={detail?.template.name ?? 'Submission'}
        panelClassName="max-h-[min(90dvh,720px)]"
      >
        {detailLoading ? (
          <p className="font-sans text-sm text-text-secondary">Loading…</p>
        ) : detailError ? (
          <CompanionCard
            role="button"
            tabIndex={0}
            className="flex cursor-pointer items-center gap-3"
            onClick={() => {
              if (detailRetryId) void openSubmissionRow(detailRetryId)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                if (detailRetryId) void openSubmissionRow(detailRetryId)
              }
            }}
          >
            <RefreshCw className="size-6 shrink-0 text-accent-primary" strokeWidth={1.75} />
            <div>
              <p className="font-heading text-sm font-semibold text-text-primary">Something went wrong</p>
              <p className="mt-0.5 font-sans text-xs text-text-secondary">Tap to retry</p>
            </div>
          </CompanionCard>
        ) : detail ? (
          <div className="space-y-4 font-sans text-sm">
            <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
              <span>Status: {detail.submission.status}</span>
              {detail.case_number ? <span>Case: {detail.case_number}</span> : null}
            </div>
            <FormValuesReadonly
              fields={detail.template.fields_schema}
              values={detail.submission.form_data}
            />
          </div>
        ) : (
          <p className="font-sans text-sm text-text-secondary">Could not load this submission.</p>
        )}
      </BottomSheet>
    </div>
  )
}
