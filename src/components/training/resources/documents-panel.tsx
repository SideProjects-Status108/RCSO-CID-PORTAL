'use client'

import { useRef, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_VISIBILITIES,
  type DocumentCategory,
  type DocumentVisibility,
  type TrainingDocument,
} from '@/types/training'

type DocWithUrl = TrainingDocument & { signed_url: string | null }

type Props = {
  initial: DocWithUrl[]
  canManage: boolean
}

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  policy: 'Policy',
  reference: 'Reference',
  form: 'Form',
  training_material: 'Training material',
  other: 'Other',
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentsPanel({ initial, canManage }: Props) {
  const [docs, setDocs] = useState(initial)
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<DocumentCategory>('policy')
  const [visibility, setVisibility] = useState<DocumentVisibility>('all')

  const submit = () => {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      setError('Pick a file to upload')
      return
    }
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    start(async () => {
      setError(null)
      try {
        const form = new FormData()
        form.append('file', file)
        form.append('title', title.trim())
        if (description.trim()) form.append('description', description.trim())
        form.append('category', category)
        form.append('visibility', visibility)

        const res = await fetch('/api/training/documents', { method: 'POST', body: form })
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(j.error ?? 'Upload failed')
        }
        const body = (await res.json()) as { document: DocWithUrl }
        setDocs((prev) => [body.document, ...prev])
        setTitle('')
        setDescription('')
        setCategory('policy')
        setVisibility('all')
        if (fileRef.current) fileRef.current.value = ''
        setOpen(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed')
      }
    })
  }

  const removeDoc = (id: string) => {
    if (!confirm('Delete this document? This cannot be undone.')) return
    start(async () => {
      setError(null)
      try {
        const res = await fetch(`/api/training/documents/${id}`, { method: 'DELETE' })
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(j.error ?? 'Delete failed')
        }
        setDocs((prev) => prev.filter((d) => d.id !== id))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Delete failed')
      }
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Documents</CardTitle>
        {canManage ? (
          <Button size="sm" variant="default" onClick={() => setOpen((v) => !v)}>
            {open ? 'Cancel' : 'Upload document'}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        {open && canManage ? (
          <div className="space-y-3 rounded-md border border-border-subtle bg-bg-elevated p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="doc-file">File (PDF, DOCX, PPTX; max 25 MB)</Label>
                <Input id="doc-file" type="file" ref={fileRef} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="doc-title">Title</Label>
                <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="doc-cat">Category</Label>
                <select
                  id="doc-cat"
                  className="mt-1 h-9 w-full rounded-md border border-border-subtle bg-bg-surface px-2 text-sm"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                >
                  {DOCUMENT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="doc-vis">Visibility</Label>
                <select
                  id="doc-vis"
                  className="mt-1 h-9 w-full rounded-md border border-border-subtle bg-bg-surface px-2 text-sm"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as DocumentVisibility)}
                >
                  {DOCUMENT_VISIBILITIES.map((v) => (
                    <option key={v} value={v}>
                      {v === 'all' ? 'All authed users' : 'Staff only'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="doc-desc">Description</Label>
                <Textarea
                  id="doc-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={submit} disabled={pending} variant="default">
                {pending ? 'Uploading…' : 'Upload'}
              </Button>
            </div>
          </div>
        ) : null}

        {docs.length === 0 ? (
          <p className="text-sm text-text-secondary">No documents uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {docs.map((d) => (
              <li key={d.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-text-primary">{d.title}</span>
                    <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
                      {CATEGORY_LABELS[d.category]}
                    </span>
                    {d.visibility === 'staff' ? (
                      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                        Staff only
                      </span>
                    ) : null}
                  </div>
                  {d.description ? (
                    <p className="mt-1 text-xs text-text-secondary">{d.description}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-text-secondary">
                    {d.mime_type} · {formatBytes(d.byte_size)} · uploaded {d.created_at.slice(0, 10)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {d.signed_url ? (
                    <a
                      href={d.signed_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center rounded-md border border-border-subtle bg-bg-surface px-3 text-xs font-medium text-text-primary hover:bg-bg-elevated"
                    >
                      Download
                    </a>
                  ) : (
                    <span className="text-xs text-text-secondary">URL expired</span>
                  )}
                  {canManage ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeDoc(d.id)}
                      disabled={pending}
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
