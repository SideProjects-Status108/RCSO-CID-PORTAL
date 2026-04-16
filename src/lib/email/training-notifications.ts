/**
 * Training-related email delivery is not wired to a provider yet.
 * Templates live under `templates/training/`; this module logs previews in development.
 */
export function logTrainingEmailPreview(kind: string, subject: string, html: string, to?: string) {
  if (process.env.NODE_ENV !== 'development') return
  const preview = html.replace(/\s+/g, ' ').trim().slice(0, 280)
  console.info(`[training-email:${kind}] to=${to ?? '(n/a)'} subject=${subject} preview=${preview}…`)
}
