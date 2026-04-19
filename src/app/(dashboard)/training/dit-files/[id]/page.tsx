import { notFound, redirect } from 'next/navigation'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { fetchDitDetailPayload } from '@/lib/training/dit-detail'
import { DitDetailHeader } from '@/components/training/files/detail/dit-detail-header'
import { DitStatusBanner } from '@/components/training/files/detail/status-banner'
import { DitDetailTabNav, parseTabParam } from '@/components/training/files/detail/tab-nav'
import { DitOverviewTab } from '@/components/training/files/detail/overview-tab'
import { AbsencesTab } from '@/components/training/files/detail/absences-tab'
import { JournalTab } from '@/components/training/files/detail/journal-tab'
import { ActivityTab } from '@/components/training/files/detail/activity-tab'
import { CasesTab } from '@/components/training/files/detail/cases-tab'
import { ScheduleTab } from '@/components/training/files/detail/schedule-tab'
import { PblesTab } from '@/components/training/files/detail/pbles-tab'
import { WeeklyTab } from '@/components/training/files/detail/weekly-tab'

export const dynamic = 'force-dynamic'

export default async function TrainingDitDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')

  const { id } = await params
  const { tab: tabParam } = await searchParams

  const payload = await fetchDitDetailPayload(id)
  if (!payload) notFound()

  const activeTab = parseTabParam(tabParam)

  const openAbsenceNote = payload.openAbsence
    ? `Absence since ${payload.openAbsence.start_date} (${payload.openAbsence.kind})`
    : null

  return (
    <div className="space-y-5">
      <DitDetailHeader payload={payload} />

      <DitStatusBanner
        status={payload.record.status}
        expectedGraduationDate={payload.record.expected_graduation_date}
        openAbsenceNote={openAbsenceNote}
      />

      <DitDetailTabNav recordId={payload.record.id} active={activeTab} />

      <div>
        {activeTab === 'overview' ? (
          <DitOverviewTab payload={payload} />
        ) : activeTab === 'absences' ? (
          <AbsencesTab ditRecordId={payload.record.id} />
        ) : activeTab === 'journal' ? (
          <JournalTab ditRecordId={payload.record.id} />
        ) : activeTab === 'activity' ? (
          <ActivityTab ditRecordId={payload.record.id} />
        ) : activeTab === 'cases' ? (
          <CasesTab ditRecordId={payload.record.id} />
        ) : activeTab === 'schedule' ? (
          <ScheduleTab ditRecordId={payload.record.id} />
        ) : activeTab === 'pbles' ? (
          <PblesTab ditRecordId={payload.record.id} />
        ) : activeTab === 'weekly' ? (
          <WeeklyTab ditRecordId={payload.record.id} />
        ) : null}
      </div>
    </div>
  )
}
