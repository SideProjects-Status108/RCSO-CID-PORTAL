import { escapeHtml } from './_escape'

export type UnobservedCompetenciesEmailProps = {
  ditName: string
  weekLabel: string
  ftoName: string
  items: { label: string; key: string }[]
  portalUrl?: string
}

export function buildUnobservedCompetenciesEmail(p: UnobservedCompetenciesEmailProps) {
  const subject = `Weekly training: competencies not observed (${p.weekLabel})`
  const list = p.items.length
    ? `<ul>${p.items.map((i) => `<li>${escapeHtml(i.label)}</li>`).join('')}</ul>`
    : '<p>No unobserved competency rows for this week.</p>'
  const link = p.portalUrl
    ? `<p><a href="${escapeHtml(p.portalUrl)}">Open training portal</a></p>`
    : ''
  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<p>${escapeHtml(p.ditName)},</p>
<p>Your FTO <strong>${escapeHtml(p.ftoName)}</strong> submitted the weekly evaluation for <strong>${escapeHtml(
    p.weekLabel
  )}</strong>. The following weekly competencies were <strong>not observed</strong> (no numeric score entered):</p>
${list}
<p>Work with your FTO to log exposures and get observed on these areas.</p>
${link}
<p style="font-size:12px;color:#666">Richland County Sheriff’s Office — CID Portal (training notification)</p>
</body></html>`
  const text = `${p.ditName},\n\nWeekly competencies not observed for ${p.weekLabel} (FTO: ${p.ftoName}):\n${p.items.map((i) => `- ${i.label}`).join('\n') || '(none)'}\n`
  return { subject, html, text }
}
