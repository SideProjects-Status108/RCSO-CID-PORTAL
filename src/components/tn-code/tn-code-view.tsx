'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import {
  BookmarkIcon,
  ClipboardIcon,
  Loader2Icon,
  MenuIcon,
  SendHorizontal,
  SparklesIcon,
  XIcon,
} from 'lucide-react'

import { setTnBookmarkAction } from '@/app/(dashboard)/tn-code/actions'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type {
  TnBookmarkListItem,
  TnCodeSearchRpcRow,
  TnCodeTreeTitle,
  TnRecentListItem,
  TnSectionDetailRow,
} from '@/types/tn-code'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type MainTab = 'browse' | 'search' | 'ai-lookup' | 'bookmarks' | 'recents'

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightExcerpt(text: string, query: string): string {
  const excerpt = text.slice(0, 320)
  const base = escapeHtml(excerpt)
  const terms = query
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/["']/g, ''))
    .filter((t) => t.length > 1)
    .slice(0, 10)

  let out = base
  for (const term of terms) {
    const re = new RegExp(`(${escapeRegExp(term)})`, 'gi')
    out = out.replace(
      re,
      '<mark class="rounded bg-accent-gold/20 px-0.5 text-text-primary">$1</mark>'
    )
  }
  return out
}

function formatIngested(iso: string | null | undefined) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
  } catch {
    return '—'
  }
}

function truncateTitle(s: string, max = 42) {
  if (s.length <= max) return s
  return `${s.slice(0, max - 1)}…`
}

function chapterNumericSuffix(chapterNumber: string): string {
  const parts = chapterNumber.split('-')
  return parts.length >= 2 ? parts[parts.length - 1]! : chapterNumber
}

/** Browse tree: "Ch. 1 — General Provisions" */
function formatChapterBrowseLabel(chapterNumber: string, chapterName: string): string {
  const num = chapterNumericSuffix(chapterNumber).replace(/^0+/, '') || chapterNumber
  return `Ch. ${num} — ${truncateTitle(chapterName, 44)}`
}

type TnCodeViewProps = {
  tree: TnCodeTreeTitle[]
  initialBookmarkIds: string[]
  initialBookmarks: TnBookmarkListItem[]
  initialRecents: TnRecentListItem[]
}

export function TnCodeView({
  tree,
  initialBookmarkIds,
  initialBookmarks,
  initialRecents,
}: TnCodeViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const [mainTab, setMainTab] = useState<MainTab>(() => {
    const t = searchParams.get('tab')
    if (t === 'search' || t === 'bookmarks' || t === 'recents' || t === 'ai-lookup') return t
    return 'browse'
  })
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    () => searchParams.get('section')
  )
  const [expandedTitles, setExpandedTitles] = useState<Set<string>>(() => new Set())
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(() => new Set())
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(
    () => new Set(initialBookmarkIds)
  )
  const [bookmarks, setBookmarks] = useState(initialBookmarks)
  const [recents, setRecents] = useState(initialRecents)
  const [sectionDetail, setSectionDetail] = useState<TnSectionDetailRow | null>(null)
  const [sectionLoading, setSectionLoading] = useState(false)
  const [browseSheetOpen, setBrowseSheetOpen] = useState(false)

  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<TnCodeSearchRpcRow[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [lookupInput, setLookupInput] = useState('')
  const [lookupMessage, setLookupMessage] = useState<string | null>(null)

  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false)
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState<string | null>(null)
  const [aiCited, setAiCited] = useState<string[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)
  const [aiHistory, setAiHistory] = useState<string[]>([])

  const treeRef = useRef<HTMLDivElement>(null)

  const syncUrl = useCallback(
    (tab: MainTab, sectionId: string | null) => {
      const p = new URLSearchParams()
      if (tab !== 'browse') p.set('tab', tab)
      if (sectionId) p.set('section', sectionId)
      const qs = p.toString()
      router.replace(qs ? `/tn-code?${qs}` : '/tn-code', { scroll: false })
    },
    [router]
  )

  useEffect(() => {
    setAiSummary(null)
  }, [selectedSectionId])

  useEffect(() => {
    if (!selectedSectionId) {
      setSectionDetail(null)
      return
    }
    let cancelled = false
    setSectionLoading(true)
    void fetch(`/api/tn-code/sections/${selectedSectionId}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        if (j.section) setSectionDetail(j.section as TnSectionDetailRow)
        else setSectionDetail(null)
      })
      .catch(() => {
        if (!cancelled) setSectionDetail(null)
      })
      .finally(() => {
        if (!cancelled) setSectionLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedSectionId])

  useEffect(() => {
    if (!selectedSectionId) return
    void fetch('/api/tn-code/recents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sectionId: selectedSectionId }),
    }).then(() => {
      startTransition(() => router.refresh())
    })
  }, [selectedSectionId, router, startTransition])

  useEffect(() => {
    setBookmarks(initialBookmarks)
    setBookmarkIds(new Set(initialBookmarkIds))
  }, [initialBookmarks, initialBookmarkIds])

  useEffect(() => {
    setRecents(initialRecents)
  }, [initialRecents])

  useEffect(() => {
    if (!selectedSectionId || tree.length === 0) return
    for (const t of tree) {
      for (const c of t.tn_chapters ?? []) {
        if (c.tn_sections?.some((s) => s.id === selectedSectionId)) {
          setExpandedTitles((prev) => new Set(prev).add(t.id))
          setExpandedChapters((prev) => new Set(prev).add(c.id))
          return
        }
      }
    }
  }, [selectedSectionId, tree])

  const selectSection = useCallback(
    (id: string, tab: MainTab = 'browse') => {
      setSelectedSectionId(id)
      setMainTab(tab)
      syncUrl(tab, id)
      requestAnimationFrame(() => {
        const el = treeRef.current?.querySelector(`[data-section-id="${id}"]`)
        el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      })
    },
    [syncUrl]
  )

  const toggleTitle = (id: string) => {
    setExpandedTitles((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const toggleChapter = (id: string) => {
    setExpandedChapters((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const runSearch = useCallback(async () => {
    const q = searchInput.trim()
    setSearchQuery(q)
    if (!q) {
      setSearchResults([])
      return
    }
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/tn-code/search?q=${encodeURIComponent(q)}`)
      const j = (await res.json()) as { results?: TnCodeSearchRpcRow[] }
      setSearchResults(j.results ?? [])
    } finally {
      setSearchLoading(false)
    }
  }, [searchInput])

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setMainTab('search')
    syncUrl('search', selectedSectionId)
    void runSearch()
  }

  const onLookupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLookupMessage(null)
    const raw = lookupInput.trim()
    if (!raw) return
    const res = await fetch(`/api/tn-code/lookup?code=${encodeURIComponent(raw)}`)
    const j = (await res.json()) as { section?: { id: string } | null }
    if (j.section?.id) {
      selectSection(j.section.id, 'browse')
      setLookupMessage(null)
      setBrowseSheetOpen(false)
    } else {
      setLookupMessage(`No section found for ${raw}. Try keyword search.`)
    }
  }

  const bookmarked = selectedSectionId ? bookmarkIds.has(selectedSectionId) : false

  const toggleBookmark = async () => {
    if (!selectedSectionId) return
    const next = !bookmarked
    try {
      await setTnBookmarkAction(selectedSectionId, next)
      setBookmarkIds((prev) => {
        const n = new Set(prev)
        if (next) n.add(selectedSectionId)
        else n.delete(selectedSectionId)
        return n
      })
      startTransition(() => router.refresh())
    } catch {
      /* ignore */
    }
  }

  const removeBookmark = async (sectionId: string) => {
    const supabase = createClient()
    await supabase.from('tn_bookmarks').delete().eq('section_id', sectionId)
    setBookmarkIds((prev) => {
      const n = new Set(prev)
      n.delete(sectionId)
      return n
    })
    if (selectedSectionId === sectionId) {
      /* keep selection */
    }
    startTransition(() => router.refresh())
  }

  const clearRecents = async () => {
    await fetch('/api/tn-code/recents', { method: 'DELETE' })
    setRecents([])
    startTransition(() => router.refresh())
  }

  const copySectionNumber = async () => {
    if (!sectionDetail) return
    try {
      await navigator.clipboard.writeText(sectionDetail.section_number)
    } catch {
      /* ignore */
    }
  }

  const runAiSummary = async (regenerate: boolean) => {
    if (!sectionDetail) return
    setAiSummaryLoading(true)
    try {
      const res = await fetch('/api/tn-code/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId: sectionDetail.id, regenerate }),
      })
      const j = (await res.json()) as { summary?: string; error?: string }
      if (j.summary) setAiSummary(j.summary)
    } finally {
      setAiSummaryLoading(false)
    }
  }

  const copyAiSummary = async () => {
    if (!aiSummary) return
    try {
      await navigator.clipboard.writeText(aiSummary)
    } catch {
      /* ignore */
    }
  }

  const submitAiLookup = async (q?: string) => {
    const text = (q ?? aiQuestion).trim()
    if (!text) return
    setAiThinking(true)
    setAiLoading(true)
    setAiAnswer(null)
    setAiCited([])
    let streamed = ''
    try {
      const res = await fetch('/api/tn-code/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      })
      if (!res.ok || !res.body) {
        setAiAnswer('Request failed. Try again.')
        return
      }
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += dec.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          let msg: {
            type: string
            text?: string
            cited_sections?: string[]
            message?: string
          }
          try {
            msg = JSON.parse(line) as typeof msg
          } catch {
            continue
          }
          if (msg.type === 'meta' && Array.isArray(msg.cited_sections)) {
            setAiCited(msg.cited_sections)
          }
          if (msg.type === 'token' && msg.text) {
            setAiThinking(false)
            streamed += msg.text
            setAiAnswer(streamed)
          }
          if (msg.type === 'error' && msg.message) {
            setAiThinking(false)
            setAiAnswer(msg.message)
          }
        }
      }
      if (streamed.trim()) {
        setAiHistory((h) => [text, ...h.filter((x) => x !== text)].slice(0, 5))
        setAiQuestion('')
      }
    } catch {
      setAiAnswer('Could not load AI response.')
    } finally {
      setAiLoading(false)
      setAiThinking(false)
    }
  }

  const openCitedSection = async (sectionNumber: string) => {
    const res = await fetch(`/api/tn-code/lookup?code=${encodeURIComponent(sectionNumber)}`)
    const j = (await res.json()) as { section?: { id: string } | null }
    if (j.section?.id) selectSection(j.section.id, 'browse')
  }

  const treePanel = (
    <div
      ref={treeRef}
      className="flex max-h-[min(70vh,560px)] flex-col gap-0 overflow-y-auto md:max-h-none md:flex-1"
    >
      {tree.length === 0 ? (
        <p className="p-3 text-sm text-text-secondary">
          No TN Code chapters loaded yet. Run ingestion for a title (see Settings → TN Code
          ingestion).
        </p>
      ) : null}
      {tree.map((title) => {
        const open = expandedTitles.has(title.id)
        return (
          <div key={title.id} className="border-b border-border-subtle/60 last:border-0">
            <button
              type="button"
              onClick={() => toggleTitle(title.id)}
              className={cn(
                'flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-text-primary transition-colors duration-150 ease-linear hover:bg-bg-elevated/40',
                open && 'bg-bg-elevated/20'
              )}
            >
              <span className="pr-2">{title.title_name}</span>
              <span className="text-text-secondary">{open ? '−' : '+'}</span>
            </button>
            <div
              className={cn(
                'grid transition-[grid-template-rows] duration-150 ease-linear',
                open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              )}
            >
              <div className="min-h-0 overflow-hidden">
                {(title.tn_chapters ?? []).map((ch) => {
                  const chOpen = expandedChapters.has(ch.id)
                  return (
                    <div key={ch.id} className="border-t border-border-subtle/40 bg-bg-app/40">
                      <button
                        type="button"
                        onClick={() => toggleChapter(ch.id)}
                        className="flex w-full items-center justify-between px-4 py-1.5 text-left text-xs font-medium text-text-secondary transition-colors duration-150 hover:bg-bg-elevated/30"
                      >
                        <span className="truncate">
                          {formatChapterBrowseLabel(ch.chapter_number, ch.chapter_name)}
                        </span>
                        <span>{chOpen ? '−' : '+'}</span>
                      </button>
                      <div
                        className={cn(
                          'grid transition-[grid-template-rows] duration-150 ease-linear',
                          chOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                        )}
                      >
                        <div className="min-h-0 overflow-hidden">
                          <ul className="pb-1">
                            {(ch.tn_sections ?? []).map((sec) => {
                              const active = sec.id === selectedSectionId
                              return (
                                <li key={sec.id}>
                                  <button
                                    type="button"
                                    data-section-id={sec.id}
                                    onClick={() => {
                                      selectSection(sec.id, 'browse')
                                      setBrowseSheetOpen(false)
                                    }}
                                    className={cn(
                                      'flex w-full gap-2 px-5 py-1.5 text-left text-xs transition-colors duration-150',
                                      active
                                        ? 'border-l-2 border-accent-gold bg-bg-elevated/50 text-text-primary'
                                        : 'border-l-2 border-transparent text-text-secondary hover:bg-bg-elevated/25'
                                    )}
                                  >
                                    <span className="shrink-0 font-mono text-accent-gold">
                                      {sec.section_number}
                                    </span>
                                    <span className="min-w-0 truncate">
                                      {truncateTitle(sec.section_title, 40)}
                                    </span>
                                  </button>
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  const sectionPanel = (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-6">
      {sectionLoading ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-text-secondary">
          <Loader2Icon className="size-5 animate-spin" aria-hidden />
          <span className="text-sm">Loading section…</span>
        </div>
      ) : !sectionDetail ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-text-secondary">
          <p>Select a section from the list to view statute text.</p>
          <p className="max-w-md text-text-disabled">
            This module is a reference tool for in-scope Tennessee Code titles. It does not
            constitute legal advice.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-2xl font-semibold text-accent-gold">
                {sectionDetail.section_number}
              </p>
              <h2 className="mt-1 text-lg font-medium text-text-primary">
                {sectionDetail.section_title}
              </h2>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-border-subtle"
                onClick={() => void toggleBookmark()}
                title={bookmarked ? 'Remove bookmark' : 'Bookmark'}
              >
                <BookmarkIcon
                  className={cn(bookmarked ? 'fill-accent-gold text-accent-gold' : '')}
                  aria-hidden
                />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-border-subtle"
                onClick={() => void copySectionNumber()}
                title="Copy section number"
              >
                <ClipboardIcon aria-hidden />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-border-subtle"
                disabled={aiSummaryLoading}
                title="AI Summary"
                onClick={() => void runAiSummary(false)}
              >
                <SparklesIcon aria-hidden />
                <span className="ml-1 hidden sm:inline">
                  {aiSummaryLoading ? 'Generating…' : 'AI Summary'}
                </span>
              </Button>
            </div>
          </div>
          <hr className="mb-4 border-border-subtle" />
          <div className="mx-auto w-full max-w-[65ch] space-y-3 text-[0.95rem] leading-relaxed text-text-primary">
            {sectionDetail.section_text.split(/\n\n+/).map((para, i) => (
              <p key={i} className="whitespace-pre-wrap">
                {para}
              </p>
            ))}
          </div>
          {aiSummary ? (
            <div className="mx-auto mt-8 w-full max-w-[65ch] rounded-lg border border-border-subtle bg-bg-elevated p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-accent-gold">
                  <SparklesIcon className="size-4" aria-hidden />
                  AI Summary
                </h3>
                <div className="flex gap-1">
                  <Button type="button" size="xs" variant="outline" onClick={() => void runAiSummary(true)}>
                    Regenerate
                  </Button>
                  <Button type="button" size="xs" variant="outline" onClick={() => void copyAiSummary()}>
                    Copy summary
                  </Button>
                </div>
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">{aiSummary}</div>
              <p className="mt-3 text-xs text-text-disabled">
                ⚠ This summary is generated by AI for reference only and does not constitute legal advice.
                Always verify the current statute text and consult qualified legal counsel for legal matters.
              </p>
            </div>
          ) : null}
          <p className="mx-auto mt-8 w-full max-w-[65ch] text-xs text-text-secondary">
            Source: Tennessee Code Annotated via Archive.org
          </p>
          <p className="mx-auto w-full max-w-[65ch] text-xs text-text-secondary">
            Last ingested:{' '}
            {formatIngested(
              sectionDetail.last_ingested_at ??
                sectionDetail.tn_chapters?.tn_titles?.last_ingested_at
            )}
          </p>
          <p className="mx-auto mt-6 w-full max-w-[65ch] text-sm text-text-disabled">
            This content is provided for reference only and does not constitute legal advice.
            Always verify current statute text with official sources.
          </p>
        </>
      )}
    </div>
  )

  const searchTab = (
    <div className="space-y-6 p-4 md:p-6">
      <form onSubmit={onLookupSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1">
          <label htmlFor="tn-code-lookup" className="text-xs font-medium text-text-secondary">
            Code lookup
          </label>
          <Input
            id="tn-code-lookup"
            placeholder="e.g. 39-13-202"
            value={lookupInput}
            onChange={(e) => setLookupInput(e.target.value)}
            className="font-mono"
          />
        </div>
        <Button type="submit" variant="outline" className="border-border-subtle sm:mb-0.5">
          Go to section
        </Button>
      </form>
      {lookupMessage ? (
        <p className="text-sm text-text-secondary" role="status">
          {lookupMessage}
        </p>
      ) : null}

      <div>
        <h3 className="mb-2 text-sm font-medium text-text-primary">Keyword search</h3>
        <form onSubmit={onSearchSubmit} className="flex gap-2">
          <Input
            placeholder="Search statute text…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="outline" className="border-border-subtle shrink-0">
            Search
          </Button>
        </form>
      </div>

      {searchLoading ? (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2Icon className="size-4 animate-spin" aria-hidden />
          Searching…
        </div>
      ) : searchQuery ? (
        <>
          <p className="text-sm text-text-secondary">
            {searchResults.length} results for <span className="font-medium">{searchQuery}</span>
          </p>
          {searchResults.length === 0 ? (
            <p className="text-sm text-text-secondary">
              No results for {searchQuery} — try different keywords
            </p>
          ) : (
            <ul className="space-y-3">
              {searchResults.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className="w-full rounded-lg border border-border-subtle bg-bg-surface p-3 text-left transition-colors hover:bg-bg-elevated/30"
                    onClick={() => {
                      selectSection(r.id, 'browse')
                    }}
                  >
                    <div className="font-mono text-sm text-accent-gold">{r.section_number}</div>
                    <div className="text-sm font-medium text-text-primary">{r.section_title}</div>
                    <div className="mt-0.5 text-xs text-text-secondary">
                      Title {r.title_number} › Chapter {r.chapter_number}
                    </div>
                    <div
                      className="mt-2 line-clamp-3 text-xs text-text-secondary"
                      dangerouslySetInnerHTML={{
                        __html: highlightExcerpt(r.section_text, searchQuery),
                      }}
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="text-sm text-text-secondary">
          Enter keywords and press Search to run full-text search across ingested sections.
        </p>
      )}
    </div>
  )

  const aiLookupTab = (
    <div className="space-y-4 p-4 md:p-6">
      {aiHistory.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {aiHistory.map((h) => (
            <button
              key={h}
              type="button"
              className="rounded-full border border-border-subtle bg-bg-surface px-2 py-0.5 text-xs text-text-secondary hover:bg-bg-elevated/40"
              onClick={() => void submitAiLookup(h)}
            >
              {h.length > 48 ? `${h.slice(0, 48)}…` : h}
            </button>
          ))}
        </div>
      ) : null}
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          void submitAiLookup()
        }}
      >
        <Input
          placeholder="Ask a question about Tennessee law…"
          value={aiQuestion}
          onChange={(e) => setAiQuestion(e.target.value)}
          className="flex-1"
          disabled={aiLoading}
        />
        <Button
          type="submit"
          variant="outline"
          className="shrink-0 gap-1 border-border-subtle"
          disabled={aiLoading}
        >
          <SendHorizontal className="size-4" aria-hidden />
          Ask
        </Button>
      </form>
      {aiThinking ? (
        <div
          className="flex items-center gap-2 text-sm text-text-secondary"
          aria-live="polite"
        >
          <span className="relative flex size-4">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-primary/40" />
            <span className="relative inline-flex size-4 rounded-full bg-accent-primary/80" />
          </span>
          <span className="animate-pulse">Searching statutes and drafting an answer…</span>
        </div>
      ) : null}
      {aiAnswer ? (
        <div className="space-y-3 rounded-lg border border-border-subtle bg-bg-surface p-4">
          <p className="text-sm font-semibold text-text-primary">This is not legal advice</p>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">{aiAnswer}</div>
          <div>
            <p className="mb-1 text-xs font-medium text-text-secondary">Cited sections</p>
            <ul className="flex flex-wrap gap-2">
              {aiCited.map((num) => (
                <li key={num}>
                  <button
                    type="button"
                    className="font-mono text-sm text-accent-gold underline"
                    onClick={() => void openCitedSection(num)}
                  >
                    {num}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-text-disabled">
            ⚠ This response is generated by AI for reference only and does not constitute legal advice.
            Always verify the current statute text and consult qualified legal counsel for legal matters.
          </p>
        </div>
      ) : null}
    </div>
  )

  const bookmarksTab = (
    <div className="p-4 md:p-6">
      {bookmarks.length === 0 ? (
        <p className="text-sm text-text-secondary">
          No bookmarks yet. Click the bookmark icon on any section to save it here.
        </p>
      ) : (
        <ul className="space-y-2">
          {bookmarks.map((b) => {
            const s = b.tn_sections
            const t = s?.tn_chapters?.tn_titles
            const ch = s?.tn_chapters
            return (
              <li
                key={b.id}
                className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-surface"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 p-3 text-left"
                  onClick={() => {
                    selectSection(s.id, 'browse')
                  }}
                >
                  <div className="font-mono text-sm text-accent-gold">{s.section_number}</div>
                  <div className="text-sm text-text-primary">{s.section_title}</div>
                  <div className="text-xs text-text-secondary">
                    Title {t?.title_number} › Chapter {ch?.chapter_number}
                  </div>
                </button>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  className="mr-2 shrink-0 text-text-secondary hover:text-text-primary"
                  aria-label="Remove bookmark"
                  onClick={() => void removeBookmark(s.id)}
                >
                  <XIcon aria-hidden />
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )

  const recentsTab = (
    <div className="p-4 md:p-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-text-primary">Recently viewed</h3>
        {recents.length > 0 ? (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            className="text-text-secondary hover:text-text-primary"
            onClick={() => void clearRecents()}
          >
            Clear all recents
          </Button>
        ) : null}
      </div>
      {recents.length === 0 ? (
        <p className="text-sm text-text-secondary">No recently viewed sections.</p>
      ) : (
        <ul className="space-y-2">
          {recents.map((r) => {
            const s = r.tn_sections
            const t = s?.tn_chapters?.tn_titles
            const ch = s?.tn_chapters
            return (
              <li key={r.id}>
                <button
                  type="button"
                  className="w-full rounded-lg border border-border-subtle bg-bg-surface p-3 text-left transition-colors hover:bg-bg-elevated/30"
                  onClick={() => selectSection(s.id, 'browse')}
                >
                  <div className="font-mono text-sm text-accent-gold">{s.section_number}</div>
                  <div className="text-sm text-text-primary">{s.section_title}</div>
                  <div className="text-xs text-text-secondary">
                    Title {t?.title_number} › Chapter {ch?.chapter_number}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )

  const searchBar = (
    <form
      onSubmit={onSearchSubmit}
      className="flex gap-2 border-b border-border-subtle bg-bg-app px-4 py-3 md:px-6"
    >
      <Input
        placeholder="Search TN Code (keywords)…"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="flex-1"
        aria-label="Search TN Code"
      />
      <Button type="submit" variant="outline" className="border-border-subtle shrink-0">
        Search
      </Button>
    </form>
  )

  const onMainTab = (v: string) => {
    const tab = v as MainTab
    setMainTab(tab)
    syncUrl(tab, selectedSectionId)
  }

  const browseBody = (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <aside className="hidden w-[280px] shrink-0 flex-col border-border-subtle bg-bg-surface md:flex md:border-r">
        {treePanel}
      </aside>
      <div className="flex min-h-0 flex-1 flex-col border-border-subtle md:border-0">
        <div className="flex items-center gap-2 border-b border-border-subtle p-2 md:hidden">
          <Sheet open={browseSheetOpen} onOpenChange={setBrowseSheetOpen}>
            <SheetTrigger
              render={
                <Button type="button" variant="outline" size="sm" className="gap-1">
                  <MenuIcon aria-hidden className="size-4" />
                  Browse titles
                </Button>
              }
            />
            <SheetContent side="left" className="flex w-[min(100%,320px)] flex-col p-0">
              <SheetHeader className="border-b border-border-subtle p-4">
                <SheetTitle className="text-text-primary">Titles & chapters</SheetTitle>
              </SheetHeader>
              <SheetClose className="sr-only" />
              <div className="min-h-0 flex-1 overflow-y-auto">{treePanel}</div>
            </SheetContent>
          </Sheet>
        </div>
        {sectionPanel}
      </div>
    </div>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border-subtle px-4 py-4 md:px-6">
        <h1 className="text-2xl font-semibold text-text-primary">TN Code</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">
          Searchable Tennessee statutes (in-scope titles). Reference only — not legal advice.
        </p>
      </div>

      {searchBar}

      <Tabs value={mainTab} onValueChange={onMainTab} className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border-subtle px-4 md:px-6">
          <TabsList className="border border-border-subtle bg-bg-surface">
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="ai-lookup">AI Lookup</TabsTrigger>
            <TabsTrigger value="bookmarks">Bookmarks</TabsTrigger>
            <TabsTrigger value="recents">Recents</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="browse" className="mt-0 flex min-h-0 flex-1 flex-col">
          {browseBody}
        </TabsContent>
        <TabsContent value="search" className="mt-0 flex-1">
          {searchTab}
        </TabsContent>
        <TabsContent value="ai-lookup" className="mt-0 flex-1">
          {aiLookupTab}
        </TabsContent>
        <TabsContent value="bookmarks" className="mt-0 flex-1">
          {bookmarksTab}
        </TabsContent>
        <TabsContent value="recents" className="mt-0 flex-1">
          {recentsTab}
        </TabsContent>
      </Tabs>
    </div>
  )
}
