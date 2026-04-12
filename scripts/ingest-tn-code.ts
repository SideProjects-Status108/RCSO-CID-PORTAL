/**
 * Ingest Tennessee Code HTML from local Archive.org-derived corpus files.
 * Reads scripts/tn-code-source/*.html — never fetches remote URLs.
 *
 * Usage:
 *   npm run ingest:tn-code
 *   npx tsx scripts/ingest-tn-code.ts --title 39
 *
 * After changing chapter-title parsing, re-run the command above to refresh
 * `tn_chapters.chapter_name` (upserts overwrite existing rows per title/chapter).
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

import * as cheerio from 'cheerio'
import type { Element } from 'domhandler'
import { config as loadEnv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

loadEnv({ path: path.resolve(process.cwd(), '.env.local') })

const SOURCE_DIR = path.join(process.cwd(), 'scripts', 'tn-code-source')
const IN_SCOPE_TITLES = [36, 37, 38, 39, 40, 55, 57] as const

const SECTION_HEAD_RE =
  /^(\d{1,2}-\d{1,4}-\d{1,4})(?:[\s.:]+)(.*)$/i

function parseArgs(): { titleFilter: number | null } {
  const argv = process.argv.slice(2)
  const i = argv.indexOf('--title')
  if (i === -1 || !argv[i + 1]) return { titleFilter: null }
  const n = parseInt(argv[i + 1]!, 10)
  if (!Number.isFinite(n)) return { titleFilter: null }
  return { titleFilter: n }
}

function hasRepealedOrReservedLabel(text: string): boolean {
  const t = text.toLowerCase()
  return t.includes('[repealed]') || t.includes('[reserved]')
}

function isMinimalRepealedBody(text: string): boolean {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length === 0) return true
  const lower = t.toLowerCase()
  if (lower.length < 80) {
    if (/^(repealed|reserved)\.?$/i.test(lower)) return true
    if (/^(repealed|reserved)\s+by\s+/i.test(lower) && lower.length < 60) return true
  }
  return false
}

function normalizeChapterKey(titleNum: number, chapterPart: string): string {
  const ch = chapterPart.replace(/^0+/, '') || '0'
  return `${titleNum}-${ch}`
}

/** One HTML file per title: gov.tn.tca.title.39.html or gov.tn.tca.title.09.html */
function resolveTitleHtmlPath(titleNum: number): string | null {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.warn(`[tn-code] Source directory missing: ${SOURCE_DIR}`)
    return null
  }

  const padded2 = `gov.tn.tca.title.${String(titleNum).padStart(2, '0')}.html`
  const unpadded = `gov.tn.tca.title.${titleNum}.html`

  for (const name of [...new Set([padded2, unpadded])]) {
    const p = path.join(SOURCE_DIR, name)
    if (fs.existsSync(p)) return p
  }

  const re = new RegExp(`^gov\\.tn\\.tca\\.title\\.0*${titleNum}\\.html$`, 'i')
  for (const f of fs.readdirSync(SOURCE_DIR)) {
    if (re.test(f)) return path.join(SOURCE_DIR, f)
  }

  return null
}

type ParsedSection = {
  sectionNumber: string
  sectionTitle: string
  sectionText: string
  chapterNumber: string
}

function elementPlainText($: cheerio.CheerioAPI, el: Element): string {
  return $(el)
    .text()
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripTagsHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ')
}

/** Split on <br> so "CHAPTER 1<br>GENERAL PROVISIONS" becomes separate lines. */
function elementLinesFromBr($: cheerio.CheerioAPI, el: Element): string[] {
  const rawHtml = $(el).html() ?? ''
  return rawHtml
    .split(/<br\s*\/?>/gi)
    .map((part) =>
      stripTagsHtml(part)
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter((line) => line.length > 0)
}

/** Title-case words (handles ALL CAPS Archive.org headings). */
function titleCaseWords(s: string): string {
  const t = s.replace(/\s+/g, ' ').trim().toLowerCase()
  if (!t) return ''
  return t.replace(/\b[a-z]/g, (c) => c.toUpperCase())
}

function extractChapterDescriptorFromLines(lines: string[]): {
  chapterNum: number
  descriptor: string
} | null {
  if (lines.length === 0) return null
  const first = lines[0]!.replace(/\s+/g, ' ').trim()
  const m = first.match(/^CHAPTER\s+(\d+)\b\.?\s*(.*)$/i)
  if (!m) return null
  const chapterNum = parseInt(m[1]!, 10)
  if (!Number.isFinite(chapterNum)) return null
  const restFirst = (m[2] ?? '').replace(/^[\u2014\u2013\-–—.:]\s*/, '').trim()
  const other = lines
    .slice(1)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  const rawDesc = [restFirst, ...other].join(' ').replace(/\s+/g, ' ').trim()
  const descriptor = rawDesc ? titleCaseWords(rawDesc) : ''
  return { chapterNum, descriptor }
}

/** Scan chapterheading blocks and inline CHAPTER lines (short blocks only). */
function collectChapterNamesFromHeadings(
  $: cheerio.CheerioAPI,
  titleNum: number
): Map<string, string> {
  const out = new Map<string, string>()
  const seen = new Set<Element>()

  const record = (el: Element) => {
    if (seen.has(el)) return
    seen.add(el)
    const lines = elementLinesFromBr($, el)
    const parsed = extractChapterDescriptorFromLines(lines)
    if (!parsed) return
    const key = normalizeChapterKey(titleNum, String(parsed.chapterNum))
    if (parsed.descriptor) out.set(key, parsed.descriptor)
  }

  const body = $('body').length ? $('body') : $.root()
  body.find('p.chapterheading, .chapterheading, [class*="chapterheading"]').each((_, el) => {
    record(el as Element)
  })

  body.find('p, h2, h3, h4, h5, h6, center').each((_, el) => {
    const $el = $(el)
    const cls = ($el.attr('class') ?? '').toLowerCase()
    if (cls.includes('chapterheading')) {
      record(el as Element)
      return
    }
    const lines = elementLinesFromBr($, el as Element)
    if (lines.length === 0 || !/^CHAPTER\s+\d/i.test(lines[0] ?? '')) return
    const plainOneLine = elementPlainText($, el as Element)
    if (plainOneLine.length > 400) return
    record(el as Element)
  })

  return out
}

function descriptorFromCollapsedChapterLine(line: string): string {
  const t = line.replace(/\s+/g, ' ').trim()
  const m = t.match(/^CHAPTER\s+\d+\b\.?\s*(.+)$/i)
  const raw = m ? m[1]!.replace(/^[\u2014\u2013\-–—.:]\s*/, '').trim() : ''
  return raw ? titleCaseWords(raw) : ''
}

function chapterFallbackLabel(chapterKey: string): string {
  const parts = chapterKey.split('-')
  const last = parts[parts.length - 1] ?? chapterKey
  const n = parseInt(last.replace(/^0+/, '') || '0', 10)
  return Number.isFinite(n) && n > 0 ? `Chapter ${n}` : `Chapter ${chapterKey}`
}

function isLikelySectionHeadingText(t: string): boolean {
  return SECTION_HEAD_RE.test(t.replace(/\s+/g, ' ').trim())
}

function isLikelyChapterHeadingLine(line: string): boolean {
  const compact = line.replace(/\s+/g, ' ').trim()
  if (SECTION_HEAD_RE.test(compact)) return false
  // Only treat explicit "CHAPTER n" lines as running headings. Patterns like
  // "39-1 Miscellaneous…" are TOC rows and must not override real chapter titles.
  return /^CHAPTER\s+\d/i.test(compact)
}

function parseSectionsFromTitleDocument(
  $: cheerio.CheerioAPI,
  titleNum: number,
  onSkip: (msg: string) => void
): { sections: ParsedSection[]; chapterNames: Map<string, string> } {
  const headingChapterNames = collectChapterNamesFromHeadings($, titleNum)
  const body = $('body').length ? $('body') : $.root()
  const candidates = body
    .find('h2, h3, h4, h5, h6, p, div, font, center, li')
    .toArray()

  const sections: ParsedSection[] = []
  const chapterNames = new Map<string, string>(headingChapterNames)
  let lastChapterHeading = ''

  const skipBlockFromIndex = (startIndex: number): number => {
    let j = startIndex + 1
    for (; j < candidates.length; j++) {
      const nextEl = candidates[j]!
      const nextText = elementPlainText($, nextEl)
      if (!nextText) continue
      const nextLine = nextText.replace(/\s+/g, ' ').trim()
      if (isLikelySectionHeadingText(nextLine)) {
        const nm = nextLine.match(SECTION_HEAD_RE)
        if (nm) break
      }
    }
    return j - 1
  }

  for (let i = 0; i < candidates.length; i++) {
    const el = candidates[i]!
    const rawText = elementPlainText($, el)
    if (!rawText) continue
    const line = rawText.replace(/\s+/g, ' ').trim()

    if (isLikelyChapterHeadingLine(line)) {
      if (hasRepealedOrReservedLabel(line)) {
        lastChapterHeading = ''
      } else {
        lastChapterHeading = line.slice(0, 300)
      }
      continue
    }

    const m = line.match(SECTION_HEAD_RE)
    if (!m) continue

    let sectionNumber = m[1]!.trim()
    const sectionTitle = (m[2] ?? '').trim()

    const parts = sectionNumber.split('-').map((x) => parseInt(x, 10))
    if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) continue
    const [t0, c0, s0] = parts as [number, number, number]
    sectionNumber = `${t0}-${c0}-${s0}`

    if (t0 !== titleNum) {
      continue
    }

    const chapterNumber = normalizeChapterKey(t0, String(c0))

    if (hasRepealedOrReservedLabel(sectionTitle) || hasRepealedOrReservedLabel(line)) {
      onSkip(
        `Title ${titleNum} | Chapter ${chapterNumber} | Section ${sectionNumber} SKIPPED (repealed)`
      )
      i = skipBlockFromIndex(i)
      continue
    }

    const buf: string[] = []
    let j = i + 1
    for (; j < candidates.length; j++) {
      const nextEl = candidates[j]!
      const nextText = elementPlainText($, nextEl)
      if (!nextText) continue
      const nextLine = nextText.replace(/\s+/g, ' ').trim()
      if (isLikelySectionHeadingText(nextLine)) {
        const nm = nextLine.match(SECTION_HEAD_RE)
        if (nm) break
      }
      buf.push(nextText)
    }

    const sectionText = buf.join('\n\n').trim()
    if (isMinimalRepealedBody(sectionText)) {
      onSkip(
        `Title ${titleNum} | Chapter ${chapterNumber} | Section ${sectionNumber} SKIPPED (repealed)`
      )
      i = j - 1
      continue
    }

    if (!chapterNames.has(chapterNumber)) {
      const fromLast = lastChapterHeading
        ? descriptorFromCollapsedChapterLine(lastChapterHeading)
        : ''
      const nm = (fromLast || chapterFallbackLabel(chapterNumber)).slice(0, 400)
      if (!hasRepealedOrReservedLabel(nm)) {
        chapterNames.set(chapterNumber, nm)
      }
    }

    sections.push({
      sectionNumber,
      sectionTitle: sectionTitle || '(untitled)',
      sectionText,
      chapterNumber,
    })
    i = j - 1
  }

  return { sections, chapterNames }
}

function chapterHeadingText($: cheerio.CheerioAPI): string {
  const h1 = $('h1').first().text().trim()
  if (h1) return h1
  const titleTag = $('title').first().text().trim()
  return titleTag || ''
}

async function main() {
  const { titleFilter } = parseArgs()
  const titlesToRun =
    titleFilter != null
      ? IN_SCOPE_TITLES.filter((t) => t === titleFilter)
      : [...IN_SCOPE_TITLES]

  if (titlesToRun.length === 0) {
    console.error('[tn-code] No matching title in scope.')
    process.exit(1)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('[tn-code] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: titleRows, error: titleErr } = await admin
    .from('tn_titles')
    .select('id, title_number')
    .in('title_number', titlesToRun)

  if (titleErr || !titleRows?.length) {
    console.error('[tn-code] Failed to load tn_titles:', titleErr?.message)
    process.exit(1)
  }

  const titleIdByNumber = new Map<number, string>()
  for (const r of titleRows) {
    titleIdByNumber.set(r.title_number as number, r.id as string)
  }

  for (const titleNum of titlesToRun) {
    let chaptersUpserted = 0
    let sectionsInserted = 0
    let skipped = 0

    const titleId = titleIdByNumber.get(titleNum)
    if (!titleId) {
      console.error(`[tn-code] Title ${titleNum} not seeded in tn_titles — skipping.`)
      continue
    }

    const filePath = resolveTitleHtmlPath(titleNum)
    if (!filePath) {
      console.error(
        `[tn-code] No file for title ${titleNum}. Expected gov.tn.tca.title.${String(titleNum).padStart(2, '0')}.html or gov.tn.tca.title.${titleNum}.html under ${SOURCE_DIR}`
      )
      continue
    }

    const base = path.basename(filePath)
    const html = fs.readFileSync(filePath, 'utf8')

    console.log(`[tn-code] Using title file: ${base}`)
    if (process.env.TN_CODE_DEBUG_HTML === '1') {
      console.log(`[tn-code] --- First 1000 characters (debug) ---`)
      console.log(html.slice(0, 1000))
      console.log(`[tn-code] --- End first 1000 characters ---`)
    }

    const $ = cheerio.load(html)

    const docHeading = chapterHeadingText($)
    if (hasRepealedOrReservedLabel(docHeading)) {
      console.log(`Title ${titleNum} SKIPPED (repealed/reserved in document heading)`)
      skipped += 1
      continue
    }

    const { sections: parsed, chapterNames } = parseSectionsFromTitleDocument(
      $,
      titleNum,
      (msg) => {
        skipped += 1
        console.log(msg)
      }
    )

    const chapterKeys = [...new Set(parsed.map((s) => s.chapterNumber))]
    console.log(
      `[tn-code] Parse result: ${parsed.length} section(s) across ${chapterKeys.length} chapter key(s): ${chapterKeys.slice(0, 15).join(', ')}${chapterKeys.length > 15 ? ', …' : ''}`
    )

    const sectionsByChapter = new Map<string, ParsedSection[]>()
    for (const s of parsed) {
      if (!sectionsByChapter.has(s.chapterNumber)) {
        sectionsByChapter.set(s.chapterNumber, [])
      }
      sectionsByChapter.get(s.chapterNumber)!.push(s)
    }

    const nowIso = new Date().toISOString()
    const sourceUrl = `https://archive.org/local-corpus/${encodeURIComponent(base)}`

    for (const chapterNumber of chapterKeys) {
      const secs = sectionsByChapter.get(chapterNumber) ?? []
      if (secs.length === 0) continue

      const chapterName =
        chapterNames.get(chapterNumber) ?? chapterFallbackLabel(chapterNumber)

      const { data: chRows, error: chErr } = await admin
        .from('tn_chapters')
        .upsert(
          {
            title_id: titleId,
            chapter_number: chapterNumber,
            chapter_name: chapterName,
            last_ingested_at: nowIso,
          },
          { onConflict: 'title_id,chapter_number' }
        )
        .select('id')

      const chRow = chRows?.[0]
      if (chErr || !chRow) {
        console.error(`[tn-code] Chapter upsert failed ${chapterNumber}:`, chErr?.message)
        continue
      }

      chaptersUpserted += 1
      const chapterId = chRow.id as string

      for (const sec of secs) {
        const { error: secErr } = await admin.from('tn_sections').upsert(
          {
            chapter_id: chapterId,
            title_id: titleId,
            section_number: sec.sectionNumber,
            section_title: sec.sectionTitle,
            section_text: sec.sectionText,
            source_url: sourceUrl,
            last_ingested_at: nowIso,
          },
          { onConflict: 'section_number' }
        )

        if (secErr) {
          console.error(
            `[tn-code] Section upsert failed ${sec.sectionNumber}:`,
            secErr.message
          )
          continue
        }

        sectionsInserted += 1
        console.log(
          `Title ${titleNum} | Chapter ${chapterNumber} | Section ${sec.sectionNumber} ✓`
        )
      }
    }

    const { error: updErr } = await admin
      .from('tn_titles')
      .update({
        last_ingested_at: new Date().toISOString(),
        last_ingest_skipped: skipped,
      })
      .eq('id', titleId)

    if (updErr) {
      console.error(`[tn-code] Failed to update title metadata:`, updErr.message)
    }

    console.log(
      `Title ${titleNum} complete: ${chaptersUpserted} chapters, ${sectionsInserted} sections inserted, ${skipped} skipped`
    )
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
