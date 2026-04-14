'use client'

import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  History,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'

import { BottomSheet } from '@/components/companion/bottom-sheet'
import { TnCodeMarkdown } from '@/components/tn-code/tn-code-markdown'
import { CompanionCard } from '@/components/companion/companion-card'
import { setTnBookmarkAction } from '@/app/(dashboard)/tn-code/actions'
import type { TnBookmarkListItem, TnCodeSearchRpcRow, TnRecentListItem } from '@/types/tn-code'
import { hapticSuccess } from '@/lib/haptic'
import { cn } from '@/lib/utils'

type ApiSectionDetail = {
  id: string
  section_number: string
  section_title: string
  section_text: string
  tn_chapters: {
    chapter_name: string
    tn_titles: { title_number: number; title_name: string }
  }
}

function truncate(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

function breadcrumbFromSearchRow(r: TnCodeSearchRpcRow): string {
  const title = r.title_name?.trim() || `TITLE ${r.title_number}`
  return `${r.chapter_name} → ${title}`
}

function breadcrumbFromSection(s: ApiSectionDetail): string {
  const ch = s.tn_chapters?.chapter_name ?? ''
  const t = s.tn_chapters?.tn_titles?.title_name ?? `TITLE ${s.tn_chapters?.tn_titles?.title_number ?? ''}`
  return `${ch} → ${t}`
}

function sectionFromBookmark(b: TnBookmarkListItem): {
  id: string
  section_number: string
  section_title: string
  snippet: string
  crumb: string
} {
  const sec = b.tn_sections
  const crumb = `${sec.tn_chapters.chapter_name} → ${sec.tn_chapters.tn_titles.title_name}`
  return {
    id: sec.id,
    section_number: sec.section_number,
    section_title: sec.section_title,
    snippet: '',
    crumb,
  }
}

function sectionFromRecent(r: TnRecentListItem) {
  const sec = r.tn_sections
  const crumb = `${sec.tn_chapters.chapter_name} → ${sec.tn_chapters.tn_titles.title_name}`
  return {
    id: sec.id,
    section_number: sec.section_number,
    section_title: sec.section_title,
    snippet: '',
    crumb,
  }
}

export function CompanionTnCodeView({
  initialBookmarks,
  initialRecents,
  initialBookmarkSectionIds,
}: {
  initialBookmarks: TnBookmarkListItem[]
  initialRecents: TnRecentListItem[]
  initialBookmarkSectionIds: string[]
}) {
  const router = useRouter()
  const [, startRefresh] = useTransition()
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState<'search' | 'bookmarks' | 'recents'>('search')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<TnCodeSearchRpcRow[]>([])
  const [searchFetchError, setSearchFetchError] = useState(false)
  const [searchRetryToken, setSearchRetryToken] = useState(0)

  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(
    () => new Set(initialBookmarkSectionIds)
  )
  const [openSectionId, setOpenSectionId] = useState<string | null>(null)
  const [sectionDetail, setSectionDetail] = useState<ApiSectionDetail | null>(null)
  const [sectionLoading, setSectionLoading] = useState(false)

  const [summaryText, setSummaryText] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => window.clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (tab !== 'search') return
    if (!debouncedQuery) {
      setSearchResults([])
      setSearchFetchError(false)
      return
    }
    let cancelled = false
    setSearchLoading(true)
    setSearchFetchError(false)
    void fetch(`/api/tn-code/search?q=${encodeURIComponent(debouncedQuery)}&limit=20`)
      .then(async (r) => {
        if (!r.ok) throw new Error('bad status')
        return r.json() as Promise<{ results?: TnCodeSearchRpcRow[] }>
      })
      .then((j) => {
        if (!cancelled) setSearchResults(j.results ?? [])
      })
      .catch(() => {
        if (!cancelled) {
          setSearchFetchError(true)
          setSearchResults([])
        }
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [debouncedQuery, tab, searchRetryToken])

  useEffect(() => {
    if (tab === 'search') {
      const id = window.requestAnimationFrame(() => searchInputRef.current?.focus())
      return () => window.cancelAnimationFrame(id)
    }
  }, [tab])

  const refresh = useCallback(() => {
    startRefresh(() => router.refresh())
  }, [router])

  const openSection = useCallback(
    async (sectionId: string) => {
      setOpenSectionId(sectionId)
      setSectionDetail(null)
      setSummaryText(null)
      setSummaryOpen(false)
      setSectionLoading(true)
      try {
        const res = await fetch(`/api/tn-code/sections/${sectionId}`)
        const j = (await res.json()) as { section?: ApiSectionDetail }
        setSectionDetail(j.section ?? null)
        void fetch('/api/tn-code/recents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sectionId }),
        }).finally(() => refresh())
      } finally {
        setSectionLoading(false)
      }
    },
    [refresh]
  )

  const bookmarked = openSectionId ? bookmarkIds.has(openSectionId) : false

  const toggleBookmark = async () => {
    if (!openSectionId) return
    const next = !bookmarked
    try {
      await setTnBookmarkAction(openSectionId, next)
      hapticSuccess()
      setBookmarkIds((prev) => {
        const n = new Set(prev)
        if (next) n.add(openSectionId)
        else n.delete(openSectionId)
        return n
      })
      refresh()
    } catch {
      /* ignore */
    }
  }

  const removeBookmark = async (sectionId: string) => {
    try {
      await setTnBookmarkAction(sectionId, false)
      setBookmarkIds((prev) => {
        const n = new Set(prev)
        n.delete(sectionId)
        return n
      })
      refresh()
    } catch {
      /* ignore */
    }
  }

  const runAiSummary = async () => {
    if (!openSectionId) return
    setSummaryLoading(true)
    setSummaryText('')
    setSummaryOpen(true)
    try {
      const res = await fetch('/api/tn-code/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId: openSectionId }),
      })
      const ct = res.headers.get('content-type') ?? ''
      if (!res.ok || !res.body || !ct.includes('ndjson')) {
        let err = 'Could not load summary.'
        try {
          const j = (await res.json()) as { error?: string }
          if (j.error) err = j.error
        } catch {
          /* ignore */
        }
        setSummaryText(err)
        return
      }
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buffer = ''
      let streamed = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += dec.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          let msg: { type: string; text?: string; message?: string }
          try {
            msg = JSON.parse(line) as typeof msg
          } catch {
            continue
          }
          if (msg.type === 'token' && msg.text) {
            streamed += msg.text
            setSummaryText(streamed)
          }
          if (msg.type === 'error' && msg.message) {
            setSummaryText(msg.message)
          }
        }
      }
    } catch {
      setSummaryText('Could not load summary.')
    } finally {
      setSummaryLoading(false)
    }
  }

  const ResultCard = ({
    id,
    section_number,
    section_title,
    snippet,
    crumb,
    onOpen,
    trailing,
  }: {
    id: string
    section_number: string
    section_title: string
    snippet: string
    crumb: string
    onOpen: () => void
    trailing?: ReactNode
  }) => (
    <div className="flex gap-2 rounded-lg border border-border-subtle bg-bg-surface p-3">
      <button type="button" className="min-w-0 flex-1 text-left" onClick={onOpen}>
        <p className="font-heading text-sm font-semibold tabular-nums text-accent-primary">
          {section_number}
        </p>
        <p className="mt-0.5 font-sans text-sm font-medium text-text-primary">{section_title}</p>
        {snippet ? <p className="mt-1 font-sans text-xs text-text-secondary">{snippet}</p> : null}
        <p className="mt-1 font-sans text-[11px] text-text-disabled">{crumb}</p>
      </button>
      {trailing}
    </div>
  )

  const bookmarkRows = useMemo(() => initialBookmarks.map(sectionFromBookmark), [initialBookmarks])
  const recentRows = useMemo(() => initialRecents.map(sectionFromRecent), [initialRecents])

  return (
    <div className="pb-2">
      <h1 className="font-heading text-lg font-semibold uppercase tracking-wide text-text-primary">
        TN Code
      </h1>

      <div className="mt-3 flex rounded-md border border-border-subtle bg-bg-elevated p-0.5 text-sm font-medium">
        {(
          [
            { id: 'search' as const, label: 'Search' },
            { id: 'bookmarks' as const, label: 'Bookmarks' },
            { id: 'recents' as const, label: 'Recents' },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={cn(
              'min-h-10 flex-1 rounded-sm px-1 font-heading text-xs font-semibold uppercase tracking-wide transition-colors',
              tab === id ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-secondary'
            )}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'search' ? (
        <div className="mt-4 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-text-disabled" />
            <input
              ref={searchInputRef}
              className="min-h-12 w-full rounded-md border border-border-subtle bg-bg-elevated py-2 pl-11 pr-3 text-base text-text-primary placeholder:text-text-disabled"
              placeholder="Search sections…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search Tennessee Code"
            />
          </div>
          {searchLoading ? (
            <p className="flex items-center gap-2 font-sans text-sm text-text-secondary">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Searching…
            </p>
          ) : searchFetchError && debouncedQuery ? (
            <CompanionCard
              role="button"
              tabIndex={0}
              className="flex cursor-pointer items-center gap-3"
              onClick={() => setSearchRetryToken((n) => n + 1)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSearchRetryToken((n) => n + 1)
                }
              }}
            >
              <RefreshCw className="size-6 shrink-0 text-accent-primary" strokeWidth={1.75} />
              <div>
                <p className="font-heading text-sm font-semibold text-text-primary">Something went wrong</p>
                <p className="mt-0.5 font-sans text-xs text-text-secondary">Tap to retry</p>
              </div>
            </CompanionCard>
          ) : debouncedQuery && searchResults.length === 0 ? (
            <CompanionCard className="flex flex-col items-center gap-2 py-8 text-center">
              <Search className="size-10 text-text-disabled" strokeWidth={1.5} aria-hidden />
              <p className="font-heading text-sm font-semibold text-text-primary">No results</p>
              <p className="font-sans text-xs text-text-secondary">
                No sections matched &quot;{debouncedQuery}&quot;. Try different keywords.
              </p>
            </CompanionCard>
          ) : (
            <ul className="space-y-2">
              {searchResults.map((r) => (
                <li key={r.id}>
                  <ResultCard
                    id={r.id}
                    section_number={r.section_number}
                    section_title={r.section_title}
                    snippet={truncate(r.section_text, 100)}
                    crumb={breadcrumbFromSearchRow(r)}
                    onOpen={() => void openSection(r.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {tab === 'bookmarks' ? (
        <div className="mt-4 space-y-2">
          {bookmarkRows.length === 0 ? (
            <CompanionCard className="flex flex-col items-center gap-2 py-10 text-center">
              <Bookmark className="size-10 text-accent-primary" strokeWidth={1.5} aria-hidden />
              <p className="font-heading text-sm font-semibold text-text-primary">No bookmarks yet</p>
              <p className="font-sans text-xs text-text-secondary">
                Search for a section and tap the bookmark icon to save it here.
              </p>
            </CompanionCard>
          ) : (
            bookmarkRows.map((row) => (
              <ResultCard
                key={row.id}
                id={row.id}
                section_number={row.section_number}
                section_title={row.section_title}
                snippet={row.snippet}
                crumb={row.crumb}
                onOpen={() => void openSection(row.id)}
                trailing={
                  <button
                    type="button"
                    className="flex size-12 shrink-0 items-center justify-center rounded-md border border-border-subtle text-danger"
                    aria-label="Remove bookmark"
                    onClick={() => void removeBookmark(row.id)}
                  >
                    <Trash2 className="size-5" />
                  </button>
                }
              />
            ))
          )}
        </div>
      ) : null}

      {tab === 'recents' ? (
        <div className="mt-4 space-y-2">
          {recentRows.length === 0 ? (
            <CompanionCard className="flex flex-col items-center gap-2 py-10 text-center">
              <History className="size-10 text-accent-primary" strokeWidth={1.5} aria-hidden />
              <p className="font-heading text-sm font-semibold text-text-primary">No recent sections</p>
              <p className="font-sans text-xs text-text-secondary">
                Opened sections are saved here automatically for quick return.
              </p>
            </CompanionCard>
          ) : (
            recentRows.map((row) => (
              <ResultCard
                key={row.id}
                id={row.id}
                section_number={row.section_number}
                section_title={row.section_title}
                snippet={row.snippet}
                crumb={row.crumb}
                onOpen={() => void openSection(row.id)}
              />
            ))
          )}
        </div>
      ) : null}

      <BottomSheet
        open={Boolean(openSectionId)}
        onClose={() => {
          setOpenSectionId(null)
          setSectionDetail(null)
          setSummaryText(null)
          setSummaryOpen(false)
        }}
        title={sectionDetail?.section_number ?? 'Section'}
        panelClassName="max-h-[90dvh]"
        footer={
          <button
            type="button"
            disabled={summaryLoading}
            onClick={() => void runAiSummary()}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-accent-primary/30 bg-accent-primary text-base font-semibold text-bg-app disabled:opacity-50"
          >
            {summaryLoading ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                AI Summary…
              </>
            ) : (
              'AI Summary'
            )}
          </button>
        }
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-heading text-xl font-semibold tabular-nums text-accent-primary">
              {sectionDetail?.section_number ?? (sectionLoading ? '…' : '')}
            </p>
            <p className="font-sans text-xs text-text-disabled">
              {sectionDetail ? breadcrumbFromSection(sectionDetail) : ''}
            </p>
          </div>
          <button
            type="button"
            className="flex size-11 shrink-0 items-center justify-center rounded-md border border-border-subtle"
            aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
            onClick={() => void toggleBookmark()}
            disabled={!openSectionId || sectionLoading}
          >
            <Bookmark
              className={cn('size-6', bookmarked ? 'fill-accent-primary text-accent-primary' : 'text-text-secondary')}
            />
          </button>
        </div>
        {sectionLoading ? (
          <p className="font-sans text-sm text-text-secondary">Loading…</p>
        ) : sectionDetail ? (
          <>
            <p className="font-sans text-sm font-semibold text-text-primary">{sectionDetail.section_title}</p>
            <div
              className="mt-3 max-h-[min(50dvh,420px)] overflow-y-auto text-[15px] leading-relaxed text-text-primary"
              style={{ fontFamily: 'var(--font-poppins), system-ui, sans-serif' }}
            >
              {sectionDetail.section_text.split(/\n\n+/).map((para, i) => (
                <p key={i} className="mb-3 whitespace-pre-wrap last:mb-0">
                  {para}
                </p>
              ))}
            </div>
            {summaryText !== null ? (
              <div className="mt-4 border-t border-border-subtle pt-3">
                <button
                  type="button"
                  className="flex min-h-10 w-full items-center justify-between text-sm font-medium text-text-secondary"
                  onClick={() => setSummaryOpen((o) => !o)}
                >
                  <span>{summaryOpen ? 'Hide AI summary' : 'Show AI summary'}</span>
                  {summaryOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </button>
                {summaryOpen ? (
                  <div className="mt-2 rounded-md border border-border-subtle bg-bg-elevated p-3 text-sm leading-relaxed text-text-primary">
                    {summaryLoading && !summaryText.trim() ? (
                      <p className="mb-2 text-xs text-text-secondary" aria-live="polite">
                        Generating summary…
                      </p>
                    ) : null}
                    <TnCodeMarkdown content={summaryText} />
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-text-secondary">Could not load this section.</p>
        )}
      </BottomSheet>
    </div>
  )
}
