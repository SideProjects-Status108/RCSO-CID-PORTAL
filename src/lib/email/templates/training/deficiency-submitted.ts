import { escapeHtml } from './_escape'

export type DeficiencySubmittedEmailProps = {
  coordinatorLabel: string
  ditName: string
  ftoName: string
  weekLabel: string
  competencies: { label: string; score: number }[]
  formId: string
}

export function buildDeficiencySubmittedEmail(p: DeficiencySubmittedEmailProps) {
  const subject = `Deficiency form submitted — ${p.ditName}`
  const rows = p.competencies
    .map((c) => `<li>${escapeHtml(c.label)} — score ${c.score}</li>`)
    .join('')
  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<p>${escapeHtml(p.coordinatorLabel)},</p>
<p>A deficiency form was submitted for <strong>${escapeHtml(p.ditName)}</strong> (FTO: <strong>${escapeHtml(
    p.ftoName
  )}</strong>, week <strong>${escapeHtml(p.weekLabel)}</strong>).</p>
<ul>${rows}</ul>
<p style="font-family:monospace;font-size:12px">Form id: ${escapeHtml(p.formId)}</p>
</body></html>`
  const text = `Deficiency submitted for ${p.ditName} / FTO ${p.ftoName} / ${p.weekLabel}.\nForm: ${p.formId}\n`
  return { subject, html, text }
}
