/**
 * Training-related email dispatch.
 *
 * This module is the single call-site helper used by API routes and
 * server actions (activity nudges, quiz pass/fail, deficiency, VARK
 * invite, etc.). Actual delivery is provider-pluggable:
 *
 *   - stub   (default, dev-friendly): logs a short preview to the
 *            server console when NODE_ENV === 'development'. No
 *            outbound mail.
 *
 *   - smtp   (SUPABASE SMTP or any standard SMTP): dispatches via
 *            nodemailer using SMTP_* env vars. Implemented as a dynamic
 *            import so nodemailer is never bundled into the edge
 *            runtime; if the module can't load we fall back to stub.
 *
 *   - resend: dispatches via Resend's HTTP API using RESEND_API_KEY.
 *            Lightweight and works on edge.
 *
 * Provider selection:
 *
 *   TRAINING_EMAIL_PROVIDER=stub|smtp|resend
 *
 * If unset, defaults to 'stub'. Call sites do NOT need to change when
 * providers are swapped.
 */

export type TrainingEmailProvider = 'stub' | 'smtp' | 'resend'

export type TrainingEmailPayload = {
  kind: string
  subject: string
  html: string
  to?: string | null
  from?: string | null
  replyTo?: string | null
}

function resolveProvider(): TrainingEmailProvider {
  const v = (process.env.TRAINING_EMAIL_PROVIDER ?? '').trim().toLowerCase()
  if (v === 'smtp' || v === 'resend' || v === 'stub') return v
  return 'stub'
}

function defaultFrom(): string {
  return (
    process.env.TRAINING_EMAIL_FROM ??
    process.env.SMTP_FROM ??
    'RCSO Training <no-reply@rcso.local>'
  )
}

async function sendViaSmtp(payload: TrainingEmailPayload): Promise<boolean> {
  try {
    const host = process.env.SMTP_HOST
    const port = Number(process.env.SMTP_PORT ?? 587)
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS
    if (!host || !user || !pass || !payload.to) return false

    type NodemailerModule = {
      createTransport: (opts: Record<string, unknown>) => {
        sendMail: (msg: Record<string, unknown>) => Promise<unknown>
      }
    }
    // Dynamic import so nodemailer stays out of the edge bundle. Users
    // who want SMTP delivery install the package themselves; if it's
    // missing we silently fall back to the preview log.
    const mod = (await import(
      /* webpackIgnore: true */ 'nodemailer' as string
    ).catch(() => null)) as NodemailerModule | null
    if (!mod?.createTransport) return false
    const transporter = mod.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    })
    await transporter.sendMail({
      from: payload.from ?? defaultFrom(),
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      replyTo: payload.replyTo ?? undefined,
      headers: { 'X-Training-Kind': payload.kind },
    })
    return true
  } catch (err) {
    console.warn('[training-email:smtp] send failed', err)
    return false
  }
}

async function sendViaResend(payload: TrainingEmailPayload): Promise<boolean> {
  try {
    const key = process.env.RESEND_API_KEY
    if (!key || !payload.to) return false
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        from: payload.from ?? defaultFrom(),
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        reply_to: payload.replyTo ?? undefined,
        headers: { 'X-Training-Kind': payload.kind },
      }),
    })
    if (!res.ok) {
      console.warn('[training-email:resend] non-2xx', res.status, await res.text())
      return false
    }
    return true
  } catch (err) {
    console.warn('[training-email:resend] send failed', err)
    return false
  }
}

function logPreview(payload: TrainingEmailPayload) {
  if (process.env.NODE_ENV !== 'development') return
  const preview = payload.html.replace(/\s+/g, ' ').trim().slice(0, 280)
  console.info(
    `[training-email:${payload.kind}] to=${payload.to ?? '(n/a)'} subject=${payload.subject} preview=${preview}…`,
  )
}

/**
 * Fire-and-forget email dispatch. Returns true when delivery was
 * attempted successfully; false otherwise. Never throws — call sites
 * may await or not; delivery failures never block business logic.
 */
export async function dispatchTrainingEmail(
  payload: TrainingEmailPayload,
): Promise<boolean> {
  const provider = resolveProvider()
  if (provider === 'smtp') {
    const ok = await sendViaSmtp(payload)
    if (!ok) logPreview(payload)
    return ok
  }
  if (provider === 'resend') {
    const ok = await sendViaResend(payload)
    if (!ok) logPreview(payload)
    return ok
  }
  logPreview(payload)
  return false
}

/**
 * Back-compat shim for existing call sites that want a synchronous
 * preview log. New code should prefer dispatchTrainingEmail. This
 * helper fires the dispatcher in the background when a recipient is
 * known so live providers still send.
 */
export function logTrainingEmailPreview(
  kind: string,
  subject: string,
  html: string,
  to?: string,
) {
  void dispatchTrainingEmail({ kind, subject, html, to: to ?? null })
}
