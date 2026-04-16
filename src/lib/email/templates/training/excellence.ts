import { escapeHtml } from './_escape'

export type ExcellenceEmailProps = {
  ditName: string
  ftoName: string
  competencyLabel: string
  explanation: string
  recipientsSummary: string
}

export function buildExcellenceEmail(p: ExcellenceEmailProps) {
  const subject = `Excellence recognition — ${p.competencyLabel}`
  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<p>${escapeHtml(p.ditName)},</p>
<p>Your FTO <strong>${escapeHtml(p.ftoName)}</strong> recognized excellence in <strong>${escapeHtml(
    p.competencyLabel
  )}</strong>.</p>
<blockquote style="border-left:3px solid #0d9488;padding-left:12px;margin:12px 0">${escapeHtml(p.explanation).replaceAll(
    '\n',
    '<br/>'
  )}</blockquote>
<p style="font-size:12px;color:#666">Shared with: ${escapeHtml(p.recipientsSummary)}</p>
</body></html>`
  const text = `Excellence: ${p.competencyLabel}\n${p.explanation}\n— ${p.ftoName}\n`
  return { subject, html, text }
}
