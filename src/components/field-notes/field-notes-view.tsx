'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Download, Link2, Plus, Trash2 } from 'lucide-react'

import type { FieldNoteRow } from '@/types/field-notes'
import {
  createFieldNoteAction,
  deleteFieldNoteAction,
  setFieldNoteSharedAction,
  updateFieldNoteAction,
} from '@/lib/field-notes/actions'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

type FieldNotesViewProps = {
  initialNotes: FieldNoteRow[]
  viewerId: string
  isSupervisionPlus: boolean
}

type Draft = {
  title: string
  incident_date: string
  location_description: string
  narrative: string
  evidence_notes: string
  persons_of_interest: string
  follow_up_actions: string
}

function emptyDraft(): Draft {
  return {
    title: '',
    incident_date: '',
    location_description: '',
    narrative: '',
    evidence_notes: '',
    persons_of_interest: '',
    follow_up_actions: '',
  }
}

function draftFromNote(n: FieldNoteRow): Draft {
  return {
    title: n.title,
    incident_date: n.incident_date ?? '',
    location_description: n.location_description ?? '',
    narrative: n.narrative ?? '',
    evidence_notes: n.evidence_notes ?? '',
    persons_of_interest: n.persons_of_interest ?? '',
    follow_up_actions: n.follow_up_actions ?? '',
  }
}

export function FieldNotesView({
  initialNotes,
  viewerId,
  isSupervisionPlus,
}: FieldNotesViewProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [localNotes, setLocalNotes] = useState<FieldNoteRow[]>(initialNotes)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft())
  const [error, setError] = useState<string | null>(null)
  const [copyMsg, setCopyMsg] = useState<string | null>(null)

  useEffect(() => {
    setLocalNotes(initialNotes)
  }, [initialNotes])

  const selected = useMemo(
    () => localNotes.find((n) => n.id === selectedId) ?? null,
    [localNotes, selectedId]
  )

  const canEdit = Boolean(selected && selected.created_by === viewerId)

  useEffect(() => {
    if (!selected) {
      setDraft(emptyDraft())
      return
    }
    setDraft(draftFromNote(selected))
  }, [selected])

  useEffect(() => {
    if (selectedId) return
    if (localNotes.length === 0) return
    setSelectedId(localNotes[0]!.id)
  }, [localNotes, selectedId])

  const shareUrl =
    typeof window !== 'undefined' && selected?.share_token
      ? `${window.location.origin}/field-notes/share/${selected.share_token}`
      : ''

  const handleNew = () => {
    setError(null)
    startTransition(async () => {
      try {
        const id = await createFieldNoteAction()
        setSelectedId(id)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not create note')
      }
    })
  }

  const handleSave = () => {
    if (!selected || !canEdit) return
    setError(null)
    startTransition(async () => {
      try {
        await updateFieldNoteAction({
          id: selected.id,
          title: draft.title,
          incident_date: draft.incident_date || null,
          location_description: draft.location_description || null,
          narrative: draft.narrative || null,
          evidence_notes: draft.evidence_notes || null,
          persons_of_interest: draft.persons_of_interest || null,
          follow_up_actions: draft.follow_up_actions || null,
        })
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Save failed')
      }
    })
  }

  const handleDelete = () => {
    if (!selected || !canEdit) return
    if (!window.confirm('Delete this field note permanently?')) return
    setError(null)
    startTransition(async () => {
      try {
        await deleteFieldNoteAction(selected.id)
        setSelectedId(null)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Delete failed')
      }
    })
  }

  const handleSharedToggle = (checked: boolean) => {
    if (!selected || !canEdit) return
    setError(null)
    startTransition(async () => {
      try {
        await setFieldNoteSharedAction({ id: selected.id, is_shared: checked })
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not update sharing')
      }
    })
  }

  const copyShareLink = async () => {
    if (!shareUrl) return
    setCopyMsg(null)
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopyMsg('Link copied')
      window.setTimeout(() => setCopyMsg(null), 2500)
    } catch {
      setCopyMsg('Copy failed — select and copy manually')
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold uppercase tracking-wide text-text-primary">
            Field notes
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">
            Capture structured scene observations, export to Word, or share a read-only link with
            your team.
          </p>
        </div>
        <Button
          type="button"
          onClick={handleNew}
          disabled={pending}
          className="shrink-0 gap-2 bg-accent-primary text-white hover:bg-accent-primary-hover"
        >
          <Plus className="size-4" strokeWidth={1.75} aria-hidden />
          New note
        </Button>
      </div>

      {error ? (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,260px)_1fr]">
        <aside className="rounded-lg border border-border-subtle bg-bg-surface p-3">
          <h2 className="px-2 pb-2 font-heading text-[10px] font-medium uppercase tracking-wide text-text-secondary">
            Notes
          </h2>
          {localNotes.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-text-secondary">
              No notes yet. Create one to get started.
            </p>
          ) : (
            <ul className="max-h-[min(70vh,32rem)] space-y-1 overflow-y-auto pr-1">
              {localNotes.map((n) => {
                const active = n.id === selectedId
                const foreign = n.created_by !== viewerId
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(n.id)}
                      className={cn(
                        'flex w-full flex-col gap-0.5 rounded-md px-2 py-2 text-left text-sm transition-colors',
                        active
                          ? 'bg-accent-primary-muted/45 text-text-primary'
                          : 'text-text-secondary hover:bg-bg-elevated/50 hover:text-text-primary'
                      )}
                    >
                      <span className="truncate font-medium">{n.title}</span>
                      <span className="font-mono text-[10px] text-text-secondary">
                        {new Date(n.updated_at).toLocaleString()}
                        {foreign && isSupervisionPlus ? (
                          <span className="ml-2 text-accent-teal"> · team</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        <main className="min-w-0 space-y-5 rounded-lg border border-border-subtle bg-bg-surface p-5">
          {!selected ? (
            <p className="text-sm text-text-secondary">Select a note or create a new one.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle pb-4">
                {selected ? (
                  <a
                    href={`/api/field-notes/${selected.id}/docx`}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
                  >
                    <Download className="size-4" strokeWidth={1.75} aria-hidden />
                    Export Word
                  </a>
                ) : null}
                {canEdit ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 border-danger/30 text-danger hover:bg-danger/10"
                      onClick={handleDelete}
                      disabled={pending}
                    >
                      <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
                      Delete
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-accent-primary text-white hover:bg-accent-primary-hover"
                      onClick={handleSave}
                      disabled={pending}
                    >
                      Save
                    </Button>
                  </>
                ) : null}
              </div>

              {!canEdit ? (
                <p className="rounded-md border border-border-subtle bg-bg-elevated/40 px-3 py-2 text-xs text-text-secondary">
                  You are viewing this note in read-only mode (supervision). Only the author can
                  edit or change sharing.
                </p>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="fn-title">Title</Label>
                <Input
                  id="fn-title"
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  disabled={!canEdit}
                  className="font-medium"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fn-date">Incident date</Label>
                  <Input
                    id="fn-date"
                    type="date"
                    value={draft.incident_date}
                    onChange={(e) => setDraft((d) => ({ ...d, incident_date: e.target.value }))}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="fn-loc">Location description</Label>
                  <Textarea
                    id="fn-loc"
                    rows={2}
                    value={draft.location_description}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, location_description: e.target.value }))
                    }
                    disabled={!canEdit}
                    className="resize-y"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fn-narr">Narrative</Label>
                <Textarea
                  id="fn-narr"
                  rows={5}
                  value={draft.narrative}
                  onChange={(e) => setDraft((d) => ({ ...d, narrative: e.target.value }))}
                  disabled={!canEdit}
                  className="resize-y"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fn-ev">Evidence & observations</Label>
                <Textarea
                  id="fn-ev"
                  rows={4}
                  value={draft.evidence_notes}
                  onChange={(e) => setDraft((d) => ({ ...d, evidence_notes: e.target.value }))}
                  disabled={!canEdit}
                  className="resize-y"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fn-poi">Persons of interest</Label>
                <Textarea
                  id="fn-poi"
                  rows={3}
                  value={draft.persons_of_interest}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, persons_of_interest: e.target.value }))
                  }
                  disabled={!canEdit}
                  className="resize-y"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fn-fu">Follow-up actions</Label>
                <Textarea
                  id="fn-fu"
                  rows={3}
                  value={draft.follow_up_actions}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, follow_up_actions: e.target.value }))
                  }
                  disabled={!canEdit}
                  className="resize-y"
                />
              </div>

              {canEdit ? (
                <div className="space-y-3 rounded-lg border border-border-subtle bg-bg-elevated/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary">Share read-only link</p>
                      <p className="text-xs text-text-secondary">
                        Anyone with the link can view this note. Turn off to revoke access.
                      </p>
                    </div>
                    <Switch
                      checked={selected.is_shared}
                      onCheckedChange={handleSharedToggle}
                      disabled={pending}
                    />
                  </div>
                  {selected.is_shared ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <code className="min-w-0 flex-1 truncate rounded border border-border-subtle bg-bg-app px-2 py-1.5 font-mono text-[11px] text-accent-primary">
                        {shareUrl || 'Save and reload to generate link preview'}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-2"
                        onClick={() => void copyShareLink()}
                        disabled={!shareUrl}
                      >
                        <Link2 className="size-4" strokeWidth={1.75} aria-hidden />
                        Copy link
                      </Button>
                    </div>
                  ) : null}
                  {copyMsg ? <p className="text-xs text-accent-teal">{copyMsg}</p> : null}
                </div>
              ) : null}

              <p className="text-center text-xs text-text-secondary">
                <Link href="/dashboard" className="text-accent-primary hover:underline">
                  Back to dashboard
                </Link>
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
