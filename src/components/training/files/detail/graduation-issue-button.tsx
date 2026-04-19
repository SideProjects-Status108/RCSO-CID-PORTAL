'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'

type Mode = 'create' | 'issue' | 'reissue'

const LABEL: Record<Mode, string> = {
  create: 'Create certificate',
  issue: 'Issue + open signatures',
  reissue: 'Re-issue',
}

export function GraduationIssueButton({
  ditRecordId,
  mode,
}: {
  ditRecordId: string
  mode: Mode
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    setErr(null)
    const res = await fetch('/api/training/certificates/issue', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dit_record_id: ditRecordId }),
    })
    if (!res.ok) {
      const { error } = (await res.json().catch(() => ({}))) as { error?: string }
      setErr(error ?? `Request failed (${res.status})`)
      return
    }
    startTransition(() => router.refresh())
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="default" size="sm" onClick={submit} disabled={pending}>
        {pending ? 'Working…' : LABEL[mode]}
      </Button>
      {err ? <span className="text-xs text-red-400">{err}</span> : null}
    </div>
  )
}
