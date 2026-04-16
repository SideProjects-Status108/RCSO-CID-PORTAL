import { escapeHtml } from './_escape'

export type EscalationEmailProps = {
  recipientLabel: string
  level: 'sgt' | 'lt'
  ditName: string
  ftoName: string
  formId: string
  notes: string | null
}

export function buildEscalationEmail(p: EscalationEmailProps) {
  const tier = p.level === 'lt' ? 'Lieutenant' : 'Sergeant'
  const subject = `Deficiency escalated (${tier}) — ${p.ditName}`
  const notes = p.notes?.trim()
    ? `<p><strong>Notes:</strong><br/>${escapeHtml(p.notes.trim()).replaceAll('\n', '<br/>')}</p>`
    : ''
  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<p>${escapeHtml(p.recipientLabel)},</p>
<p>A deficiency workflow was escalated to <strong>${tier}</strong> for <strong>${escapeHtml(
    p.ditName
  )}</strong> (FTO <strong>${escapeHtml(p.ftoName)}</strong>).</p>
<p style="font-family:monospace;font-size:12px">Form id: ${escapeHtml(p.formId)}</p>
${notes}
</body></html>`
  const text = `Escalation (${tier}) for ${p.ditName} / FTO ${p.ftoName}. Form ${p.formId}\n`
  return { subject, html, text }
}
