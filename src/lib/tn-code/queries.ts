import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type {
  TnBookmarkListItem,
  TnCodeTreeTitle,
  TnRecentListItem,
  TnSectionDetailRow,
  TnTitleRow,
} from '@/types/tn-code'

function compareCodeKeys(a: string, b: string): number {
  const pa = a.split('-').map((x) => parseInt(x, 10))
  const pb = b.split('-').map((x) => parseInt(x, 10))
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? 0
    const nb = pb[i] ?? 0
    if (na !== nb) return na - nb
  }
  return 0
}

export async function fetchTnCodeTree(): Promise<TnCodeTreeTitle[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tn_titles')
    .select(
      `
      id,
      title_number,
      title_name,
      description,
      last_ingested_at,
      last_ingest_skipped,
      tn_chapters (
        id,
        title_id,
        chapter_number,
        chapter_name,
        last_ingested_at,
        tn_sections (
          id,
          chapter_id,
          title_id,
          section_number,
          section_title
        )
      )
    `
    )
    .order('title_number', { ascending: true })

  if (error || !data) return []

  const titles = data as unknown as TnCodeTreeTitle[]
  for (const t of titles) {
    t.tn_chapters?.sort((a, b) => compareCodeKeys(a.chapter_number, b.chapter_number))
    for (const c of t.tn_chapters ?? []) {
      c.tn_sections?.sort((a, b) => compareCodeKeys(a.section_number, b.section_number))
    }
  }
  return titles
}

export async function fetchTnSectionDetail(id: string): Promise<TnSectionDetailRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tn_sections')
    .select(
      `
      id,
      chapter_id,
      title_id,
      section_number,
      section_title,
      section_text,
      source_url,
      last_ingested_at,
      tn_chapters (
        chapter_number,
        chapter_name,
        tn_titles ( title_number, title_name, last_ingested_at )
      )
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  return data as unknown as TnSectionDetailRow
}

export async function fetchTnBookmarksForUser(
  userId: string
): Promise<TnBookmarkListItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tn_bookmarks')
    .select(
      `
      id,
      section_id,
      created_at,
      tn_sections (
        id,
        chapter_id,
        title_id,
        section_number,
        section_title,
        tn_chapters (
          id,
          title_id,
          chapter_number,
          chapter_name,
          last_ingested_at,
          tn_titles ( title_number, title_name )
        )
      )
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data as unknown as TnBookmarkListItem[]
}

export async function fetchTnRecentsForUser(
  userId: string,
  limit = 20
): Promise<TnRecentListItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tn_recents')
    .select(
      `
      id,
      section_id,
      viewed_at,
      tn_sections (
        id,
        chapter_id,
        title_id,
        section_number,
        section_title,
        tn_chapters (
          id,
          title_id,
          chapter_number,
          chapter_name,
          last_ingested_at,
          tn_titles ( title_number, title_name )
        )
      )
    `
    )
    .eq('user_id', userId)
    .order('viewed_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data as unknown as TnRecentListItem[]
}

export async function fetchBookmarkSectionIds(userId: string): Promise<Set<string>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tn_bookmarks')
    .select('section_id')
    .eq('user_id', userId)

  if (error || !data) return new Set()
  return new Set(data.map((r) => String(r.section_id)))
}

export async function fetchTnIngestionStatus(): Promise<
  (TnTitleRow & { chapter_count: number; section_count: number })[]
> {
  const supabase = await createClient()
  const { data: titles, error } = await supabase
    .from('tn_titles')
    .select('id, title_number, title_name, description, last_ingested_at, last_ingest_skipped')
    .order('title_number', { ascending: true })

  if (error || !titles) return []

  const out: (TnTitleRow & { chapter_count: number; section_count: number })[] = []

  for (const t of titles as TnTitleRow[]) {
    const [{ count: chCount }, { count: secCount }] = await Promise.all([
      supabase
        .from('tn_chapters')
        .select('*', { count: 'exact', head: true })
        .eq('title_id', t.id),
      supabase
        .from('tn_sections')
        .select('*', { count: 'exact', head: true })
        .eq('title_id', t.id),
    ])
    out.push({
      ...t,
      chapter_count: chCount ?? 0,
      section_count: secCount ?? 0,
    })
  }

  return out
}
