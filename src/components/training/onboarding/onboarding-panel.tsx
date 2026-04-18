'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { CreateProfileModal } from '@/components/training/onboarding/create-profile-modal'
import { SurveyStatusCard, type SurveyStatus } from '@/components/training/onboarding/survey-status-card'
import { MeetingBriefCard } from '@/components/training/onboarding/meeting-brief-card'
import type { CreateDitOnboardingResult } from '@/app/(dashboard)/training/actions'

export function OnboardingPanel() {
  const [modalOpen, setModalOpen] = useState(false)
  const [activeDit, setActiveDit] = useState<{
    ditRecordId: string
    ditUserId: string
    displayName: string
    initialStatus: SurveyStatus
  } | null>(null)

  function handleCreated(result: CreateDitOnboardingResult) {
    if (!result.ok) return
    setActiveDit({
      ditRecordId: result.dit_record_id,
      ditUserId: result.dit_user_id,
      displayName: result.display_name,
      initialStatus: {
        status: 'pending',
        completed_count: 0,
        pending_count: 1,
        expires_at: result.survey_expires_at,
        learning_style_data: null,
      },
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-text-secondary">
          {activeDit
            ? `Active intake: ${activeDit.displayName}`
            : 'Start a new DIT intake. Survey and meeting brief appear once the profile is created.'}
        </p>
        <Button type="button" size="sm" onClick={() => setModalOpen(true)}>
          <UserPlus aria-hidden />
          Create profile
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <SurveyStatusCard
          ditRecordId={activeDit?.ditRecordId ?? null}
          initialStatus={activeDit?.initialStatus}
        />
        <MeetingBriefCard />
      </div>

      <CreateProfileModal open={modalOpen} onOpenChange={setModalOpen} onCreated={handleCreated} />
    </div>
  )
}
