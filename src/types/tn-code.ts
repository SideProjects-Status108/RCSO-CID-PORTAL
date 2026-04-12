export type TnTitleRow = {
  id: string
  title_number: number
  title_name: string
  description: string | null
  last_ingested_at: string | null
  last_ingest_skipped: number | null
}

export type TnChapterRow = {
  id: string
  title_id: string
  chapter_number: string
  chapter_name: string
  last_ingested_at: string | null
}

export type TnSectionListRow = {
  id: string
  chapter_id: string
  title_id: string
  section_number: string
  section_title: string
}

export type TnSectionDetailRow = TnSectionListRow & {
  section_text: string
  source_url: string | null
  last_ingested_at: string | null
  tn_chapters: {
    chapter_number: string
    chapter_name: string
    tn_titles: {
      title_number: number
      title_name: string
      last_ingested_at: string | null
    }
  }
}

export type TnCodeTreeTitle = TnTitleRow & {
  tn_chapters: (TnChapterRow & { tn_sections: TnSectionListRow[] })[]
}

export type TnSectionWithBreadcrumb = TnSectionListRow & {
  tn_chapters: TnChapterRow & {
    tn_titles: Pick<TnTitleRow, 'title_number' | 'title_name'>
  }
}

export type TnBookmarkListItem = {
  id: string
  section_id: string
  created_at: string
  tn_sections: TnSectionWithBreadcrumb
}

export type TnRecentListItem = {
  id: string
  section_id: string
  viewed_at: string
  tn_sections: TnSectionWithBreadcrumb
}

export type TnCodeSearchRpcRow = {
  id: string
  section_number: string
  section_title: string
  section_text: string
  title_number: number
  /** Present when DB function returns title display name (companion search breadcrumbs). */
  title_name?: string
  chapter_number: string
  chapter_name: string
  rank: number
}
