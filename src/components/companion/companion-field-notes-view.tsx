'use client'

import Link from 'next/link'
import { useState } from 'react'

import { BottomSheet } from '@/components/companion/bottom-sheet'
import { CompanionCard } from '@/components/companion/companion-card'
import type { FieldNoteRow } from '@/types/field-notes'

function formatIncidentDate(isoDate: string | null): string {
  if (!isoDate) return '—'
  const t = Date.parse(`${isoDate}T12:00:00`)
  if (Number.isNaN(t)) return isoDate
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(t)
}

function NoteBlock({ label, text }: { label: string; text: string | null }) {
  if (!text?.trim()) return null
  return (
    <div>
      <h3 className="font-heading text-xs font-semibold uppercase tracking-wide text-text-secondary">
        {label}
      </h3>
      <p className="mt-1 whitespace-pre-wrap font-sans text-sm text-text-primary">{text.trim()}</p>
    </div>
  )
}

export function CompanionFieldNotesView({ initialNotes }: { initialNotes: FieldNoteRow[] }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<FieldNoteRow | null>(null)

  const openNote = (n: FieldNoteRow) => {
    setSelected(n)
    setOpen(true)
  }

  const closeSheet = () => {
    setOpen(false)
    setSelected(null)
  }

  if (initialNotes.length === 0) {
    return (
      <CompanionCard className="flex flex-col items-center gap-2 py-12 text-center">
        <p className="font-heading text-sm font-semibold text-text-primary">No field notes yet.</p>
        <p className="font-sans text-xs text-text-secondary">
          Notes you create on desktop will appear here for quick reference.
        </p>
      </CompanionCard>
    )
  }

  return (
    <>
      <ul className="space-y-2 pb-4">
        {initialNotes.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => openNote(n)}
              className="w-full rounded-lg border border-border-subtle bg-bg-surface p-3 text-left transition-colors hover:bg-bg-elevated active:bg-bg-elevated"
            >
              <p className="font-medium text-text-primary">{n.title || 'Untitled'}</p>
              <p className="mt-1 text-xs text-text-secondary">
                {formatIncidentDate(n.incident_date)}
                {n.location_description?.trim() ? ` · ${n.location_description.trim()}` : ''}
              </p>
            </button>
          </li>
        ))}
      </ul>

      <BottomSheet
        open={open && selected != null}
        onClose={closeSheet}
        title={selected?.title?.trim() || 'Field note'}
        footer={
          <Link
            href="/tools/field-notes"
            className="flex min-h-12 items-center justify-center rounded-md border border-accent-primary/30 bg-accent-primary text-center text-base font-semibold text-bg-app hover:bg-accent-primary-hover"
          >
            View on Desktop
          </Link>
        }
      >
        {selected ? (
          <div className="space-y-4">
            <div className="text-xs text-text-secondary">
              <span className="font-medium text-text-primary">Incident: </span>
              {formatIncidentDate(selected.incident_date)}
            </div>
            {selected.location_description?.trim() ? (
              <div className="text-xs text-text-secondary">
                <span className="font-medium text-text-primary">Location: </span>
                {selected.location_description.trim()}
              </div>
            ) : null}
            <NoteBlock label="Narrative" text={selected.narrative} />
            <NoteBlock label="Evidence" text={selected.evidence_notes} />
            <NoteBlock label="Persons of interest" text={selected.persons_of_interest} />
            <NoteBlock label="Follow-up" text={selected.follow_up_actions} />
          </div>
        ) : null}
      </BottomSheet>
    </>
  )
}
