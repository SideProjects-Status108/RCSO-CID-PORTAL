import { escapeHtml } from './_escape'

export type CoachingScheduledEmailProps = {
  ditName: string
  ftoName: string
  coordinatorName: string
  competencySummary: string
  meetingWhen: string
  planNotes: string | null
}

export function buildCoachingScheduledEmail(p: CoachingScheduledEmailProps) {
  const subject = `Coaching meeting scheduled — ${p.ditName}`
  const notes = p.planNotes?.trim()
    ? `<p><strong>Plan / notes:</strong><br/>${escapeHtml(p.planNotes.trim()).replaceAll('\n', '<br/>')}</p>`
    : ''
  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<p>${escapeHtml(p.ditName)},</p>
<p>Coordinator <strong>${escapeHtml(p.coordinatorName)}</strong> scheduled a coaching touchpoint with your FTO <strong>${escapeHtml(
    p.ftoName
  )}</strong>.</p>
<p><strong>Focus:</strong> ${escapeHtml(p.competencySummary)}</p>
<p><strong>When:</strong> ${escapeHtml(p.meetingWhen)}</p>
${notes}
</body></html>`
  const text = `Coaching scheduled for ${p.ditName}. FTO ${p.ftoName}. When: ${p.meetingWhen}. ${p.competencySummary}\n`
  return { subject, html, text }
}
