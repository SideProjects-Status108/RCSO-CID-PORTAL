import { NextResponse } from 'next/server'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { isTrainingWriter } from '@/lib/training/access'
import { fetchDitRecordByUserId } from '@/lib/training/queries'
import {
  listJournalEntries,
  listJournalReviews,
  upsertJournalEntry,
} from '@/lib/training/journal-queries'

/**
 * GET /api/training/journal-entries?dit_record_id=...
 *
 * DITs may only list their own entries (no dit_record_id needed — resolved
 * from session). Training writers may pass dit_record_id explicitly. FTOs
 * paired with the DIT may read via RLS — we still require dit_record_id
 * for explicitness in that case.
 */
export async function GET(request: Request) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  let ditRecordId = url.searchParams.get('dit_record_id')?.trim() || null
  if (!ditRecordId) {
    const own = await fetchDitRecordByUserId(session.user.id)
    if (!own) {
      return NextResponse.json(
        { error: 'dit_record_id is required (no DIT record for this user)' },
        { status: 400 }
      )
    }
    ditRecordId = own.id
  }

  const since = url.searchParams.get('since') ?? undefined
  const limit = Number(url.searchParams.get('limit') ?? '60') || 60

  const entries = await listJournalEntries(ditRecordId, { since, limit })
  const reviews = await listJournalReviews(entries.map((e) => e.id))
  return NextResponse.json({ entries, reviews })
}

type PostBody = {
  dit_record_id?: string
  entry_date?: string
  body?: string
}

/**
 * POST /api/training/journal-entries — creates or updates today's (or
 * any date's) journal entry. Entry is unique per (DIT, date), so repeat
 * POSTs on the same date overwrite.
 */
export async function POST(request: Request) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: PostBody
  try {
    body = (await request.json()) as PostBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const entryDate = (body.entry_date ?? '').trim()
  const text = (body.body ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
    return NextResponse.json({ error: 'entry_date must be YYYY-MM-DD' }, { status: 400 })
  }
  if (text.length < 1) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 })
  }

  // Resolve target DIT record. Training writers may post for any DIT;
  // other callers may only post for their own record.
  let ditRecordId = body.dit_record_id?.trim() || null
  const writer = isTrainingWriter(session.profile)
  if (!ditRecordId || !writer) {
    const own = await fetchDitRecordByUserId(session.user.id)
    if (!own) {
      return NextResponse.json(
        { error: 'No DIT record for this user; cannot write journal' },
        { status: 403 }
      )
    }
    ditRecordId = own.id
  }

  try {
    const entry = await upsertJournalEntry({
      ditRecordId,
      entryDate,
      body: text,
      createdBy: session.user.id,
    })
    return NextResponse.json({ entry })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to save journal entry'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
