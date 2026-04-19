import 'server-only'

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

/**
 * Server-side PDF generation for the Detective in Training completion
 * certificate. Pure function over `CertificatePdfInput` + an optional
 * array of signer images/names — no Supabase, no fetch — so this is
 * easy to unit test and cheap to regenerate.
 */

export type CertificatePdfSigner = {
  role: 'fto_coordinator' | 'training_supervisor' | 'lt' | 'cpt'
  role_label: string
  signer_name: string
  signer_badge: string | null
  signed_at: string | null
  /** Full data URL (data:image/png;base64,...) or null if not yet signed. */
  signature_image: string | null
}

export type CertificatePdfInput = {
  dit_full_name: string
  dit_badge_number: string | null
  program_start_date: string | null
  program_end_date: string | null
  effective_graduation_date: string | null
  issued_at: string | null
  signers: CertificatePdfSigner[]
  agency_name?: string
  division_name?: string
}

const PAGE_W = 792
const PAGE_H = 612
const GOLD = rgb(0.72, 0.55, 0.11)
const INK = rgb(0.07, 0.09, 0.14)
const SUB = rgb(0.32, 0.35, 0.43)
const LINE = rgb(0.78, 0.8, 0.85)

function formatIsoDate(iso: string | null): string {
  if (!iso) return '—'
  const ymd = iso.slice(0, 10)
  const [y, m, d] = ymd.split('-').map((n) => Number(n))
  if (!y || !m || !d) return ymd
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  return `${months[m - 1]} ${d}, ${y}`
}

function drawCenteredText(
  page: import('pdf-lib').PDFPage,
  text: string,
  opts: {
    y: number
    size: number
    font: import('pdf-lib').PDFFont
    color?: import('pdf-lib').RGB
    pageWidth?: number
  },
): void {
  const width = opts.font.widthOfTextAtSize(text, opts.size)
  const pw = opts.pageWidth ?? PAGE_W
  page.drawText(text, {
    x: (pw - width) / 2,
    y: opts.y,
    size: opts.size,
    font: opts.font,
    color: opts.color ?? INK,
  })
}

export async function renderCertificatePdf(input: CertificatePdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([PAGE_W, PAGE_H])

  const serif = await pdf.embedFont(StandardFonts.TimesRoman)
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold)
  const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic)
  const sans = await pdf.embedFont(StandardFonts.Helvetica)

  page.drawRectangle({
    x: 24,
    y: 24,
    width: PAGE_W - 48,
    height: PAGE_H - 48,
    borderColor: GOLD,
    borderWidth: 2,
  })
  page.drawRectangle({
    x: 32,
    y: 32,
    width: PAGE_W - 64,
    height: PAGE_H - 64,
    borderColor: GOLD,
    borderWidth: 0.5,
  })

  drawCenteredText(page, input.agency_name ?? "Rockdale County Sheriff's Office", {
    y: PAGE_H - 70,
    size: 14,
    font: sans,
    color: SUB,
  })
  drawCenteredText(page, input.division_name ?? 'Criminal Investigations Division', {
    y: PAGE_H - 90,
    size: 11,
    font: sans,
    color: SUB,
  })

  drawCenteredText(page, 'Certificate of Completion', {
    y: PAGE_H - 150,
    size: 30,
    font: serifBold,
    color: INK,
  })
  drawCenteredText(page, 'Detective in Training Program', {
    y: PAGE_H - 178,
    size: 14,
    font: serifItalic,
    color: GOLD,
  })

  drawCenteredText(page, 'This certifies that', {
    y: PAGE_H - 230,
    size: 12,
    font: serif,
    color: SUB,
  })

  const nameLine = input.dit_badge_number
    ? `${input.dit_full_name} — Badge #${input.dit_badge_number}`
    : input.dit_full_name
  drawCenteredText(page, nameLine, {
    y: PAGE_H - 270,
    size: 22,
    font: serifBold,
    color: INK,
  })

  const bodyLines = [
    'has successfully completed the Detective in Training Program, satisfying all required',
    'weekly evaluations, practical exercises, and field performance milestones.',
  ]
  bodyLines.forEach((line, i) => {
    drawCenteredText(page, line, {
      y: PAGE_H - 310 - i * 18,
      size: 12,
      font: serif,
      color: INK,
    })
  })

  const periodLine = `Program period: ${formatIsoDate(input.program_start_date)} — ${formatIsoDate(
    input.program_end_date,
  )}`
  drawCenteredText(page, periodLine, {
    y: PAGE_H - 360,
    size: 11,
    font: sans,
    color: SUB,
  })
  drawCenteredText(page, `Effective graduation: ${formatIsoDate(input.effective_graduation_date)}`, {
    y: PAGE_H - 378,
    size: 11,
    font: sans,
    color: SUB,
  })

  const signers = input.signers
  const slotCount = Math.max(signers.length, 1)
  const slotWidth = (PAGE_W - 120) / slotCount
  const baseY = 120
  signers.forEach((s, i) => {
    const cx = 60 + slotWidth * (i + 0.5)
    page.drawLine({
      start: { x: cx - 70, y: baseY + 28 },
      end: { x: cx + 70, y: baseY + 28 },
      thickness: 0.8,
      color: LINE,
    })

    if (s.signature_image) {
      embedSignatureImage(pdf, page, s.signature_image, {
        centerX: cx,
        bottomY: baseY + 30,
        maxWidth: 130,
        maxHeight: 34,
      }).catch(() => {
        /* swallow — we still draw the label below */
      })
    }

    const label = s.role_label
    const labelW = sans.widthOfTextAtSize(label, 9)
    page.drawText(label, {
      x: cx - labelW / 2,
      y: baseY + 14,
      size: 9,
      font: sans,
      color: SUB,
    })

    const nameLine = s.signer_badge ? `${s.signer_name} #${s.signer_badge}` : s.signer_name
    const nameW = sans.widthOfTextAtSize(nameLine, 10)
    page.drawText(nameLine, {
      x: cx - nameW / 2,
      y: baseY,
      size: 10,
      font: sans,
      color: INK,
    })

    const date = formatIsoDate(s.signed_at)
    const dateW = sans.widthOfTextAtSize(date, 9)
    page.drawText(date, {
      x: cx - dateW / 2,
      y: baseY - 12,
      size: 9,
      font: sans,
      color: SUB,
    })
  })

  const issuedLine = input.issued_at
    ? `Issued ${formatIsoDate(input.issued_at)}`
    : 'Issued — pending'
  page.drawText(issuedLine, {
    x: 48,
    y: 44,
    size: 8,
    font: sans,
    color: SUB,
  })

  return await pdf.save()
}

async function embedSignatureImage(
  pdf: PDFDocument,
  page: import('pdf-lib').PDFPage,
  dataUrl: string,
  box: { centerX: number; bottomY: number; maxWidth: number; maxHeight: number },
): Promise<void> {
  const match = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(dataUrl)
  if (!match) return
  const kind = match[1].toLowerCase()
  const bytes = Buffer.from(match[2], 'base64')
  const img = kind === 'png' ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes)

  const scale = Math.min(box.maxWidth / img.width, box.maxHeight / img.height, 1)
  const w = img.width * scale
  const h = img.height * scale
  page.drawImage(img, {
    x: box.centerX - w / 2,
    y: box.bottomY,
    width: w,
    height: h,
  })
}
