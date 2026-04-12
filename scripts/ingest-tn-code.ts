/**
 * Ingest Tennessee Code HTML from local Archive.org-derived corpus files.
 * Reads scripts/tn-code-source/*.html — never fetches remote URLs.
 *
 * Usage:
 *   npx tsx scripts/ingest-tn-code.ts
 *   npx tsx scripts/ingest-tn-code.ts --title 39
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

function listHtmlFiles(): string[] {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.warn(`[tn-code] Source directory missing: ${SOURCE_DIR}`)
    return []
  }
  return fs
    .readdirSync(SOURCE_DIR)
    .filter((f) => f.toLowerCase().endsWith('.html'))
    .map((f) => path.join(SOURCE_DIR, f))
}

function matchTitleChapterFromFilename(
  basename: string
): { title: number; chapterPart: string } | null {
  const base = basename.replace(/\.html$/i, '')
  const m =
    base.match(/^(\d{1,2})[-_](\d{1,4})$/i) ||
    base.match(/^t(\d{1,2})[-_]?c?(\d{1,4})$/i) ||
    base.match(/^title\s*(\d{1,2})[-_\s]+ch(?:apter)?\s*(\d{1,4})$/i)
  if (!m) return null
  return { title: parseInt(m[1]!, 10), chapterPart: m[2]! }
}

function inferTitleChapterFromHeading(
  heading: string,
  fallbackTitle: number | null
): { title: number; chapterPart: string } | null {
  const m = heading.match(/(?:title\s*)?(\d{1,2})\s*[-–—]\s*(\d{1,4})/i)
  if (m) return { title: parseInt(m[1]!, 10), chapterPart: m[2]! }
  const chOnly = heading.match(/chapter\s*(\d{1,4})/i)
  if (chOnly && fallbackTitle != null) {
    return { title: fallbackTitle, chapterPart: chOnly[1]! }
  }
  return null
}

type ParsedSection = {
  sectionNumber: string
  sectionTitle: string
  sectionText: string
}

function elementPlainText($: cheerio.CheerioAPI, el: Element): string {
  return $(el)
    .text()
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isLikelySectionHeadingText(t: string): boolean {
  return SECTION_HEAD_RE.test(t.replace(/\s+/g, ' ').trim())
}

function parseSectionsFromHtml(
  $: cheerio.CheerioAPI,
  titleNum: number,
  chapterNumber: string,
  onSkip: (msg: string) => void
): ParsedSection[] {
  const body = $('body').length ? $('body') : $.root()
  const candidates = body
    .find('h2, h3, h4, h5, h6, p, div, font, center, li')
    .toArray()

  const sections: ParsedSection[] = []

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
    const m = line.match(SECTION_HEAD_RE)
    if (!m) continue

    let sectionNumber = m[1]!.trim()
    const sectionTitle = (m[2] ?? '').trim()

    const parts = sectionNumber.split('-').map((x) => parseInt(x, 10))
    if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) continue
    const [t0, c0, s0] = parts as [number, number, number]
    sectionNumber = `${t0}-${c0}-${s0}`

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

    sections.push({
      sectionNumber,
      sectionTitle: sectionTitle || '(untitled)',
      sectionText,
    })
    i = j - 1
  }

  return sections
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

  const files = listHtmlFiles()
  if (files.length === 0) {
    console.warn('[tn-code] No HTML files found. Place corpus under scripts/tn-code-source/')
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

    const titleFiles = files.filter((fp) => {
      const base = path.basename(fp)
      const fromName = matchTitleChapterFromFilename(base)
      if (fromName && fromName.title === titleNum) return true
      return base.startsWith(`${titleNum}-`) || base.toLowerCase().startsWith(`t${titleNum}`)
    })

    const processFile = async (filePath: string) => {
      const base = path.basename(filePath)
      const html = fs.readFileSync(filePath, 'utf8')
      const $ = cheerio.load(html)

      let tc =
        matchTitleChapterFromFilename(base) ??
        inferTitleChapterFromHeading(chapterHeadingText($), titleNum)

      if (!tc || tc.title !== titleNum) {
        tc = matchTitleChapterFromFilename(
          base.replace(/[^a-z0-9-_]+/gi, '-')
        )
      }
      if (!tc || tc.title !== titleNum) {
        console.error(`[tn-code] Could not resolve title/chapter for file ${base} — skipped`)
        return
      }

      const chapterNumber = normalizeChapterKey(tc.title, tc.chapterPart)
      const chHeading = chapterHeadingText($)
      if (hasRepealedOrReservedLabel(chHeading)) {
        console.log(`Title ${titleNum} | Chapter ${chapterNumber} SKIPPED (repealed chapter)`)
        skipped += 1
        return
      }

      const chapterName =
        chHeading.replace(/\s+/g, ' ').trim() || `Chapter ${chapterNumber}`

      const { data: chRows, error: chErr } = await admin
        .from('tn_chapters')
        .upsert(
          {
            title_id: titleId,
            chapter_number: chapterNumber,
            chapter_name: chapterName,
            last_ingested_at: new Date().toISOString(),
          },
          { onConflict: 'title_id,chapter_number' }
        )
        .select('id')

      const chRow = chRows?.[0]
      if (chErr || !chRow) {
        console.error(`[tn-code] Chapter upsert failed ${chapterNumber}:`, chErr?.message)
        return
      }

      chaptersUpserted += 1
      const chapterId = chRow.id as string

      const parsed = parseSectionsFromHtml($, titleNum, chapterNumber, (msg) => {
        skipped += 1
        console.log(msg)
      })
      const nowIso = new Date().toISOString()
      const sourceUrl = `https://archive.org/local-corpus/${encodeURIComponent(base)}`

      for (const sec of parsed) {
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

    for (const fp of titleFiles) {
      try {
        await processFile(fp)
      } catch (e) {
        console.error(`[tn-code] Error processing ${path.basename(fp)}:`, e)
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
