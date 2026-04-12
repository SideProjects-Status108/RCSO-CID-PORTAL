'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import { saveFormDraftAction, submitFormAction } from '@/app/(dashboard)/forms/actions'
import type { FormSubmissionRow, FormTemplateRow } from '@/types/forms'
import { Button } from '@/components/ui/button'
import { FormFieldsEditor } from '@/components/forms/form-fields-editor'
import { CaseCombobox } from '@/components/forms/case-combobox'
import { Label } from '@/components/ui/label'

function emptyValues(template: FormTemplateRow): Record<string, unknown> {
  const o: Record<string, unknown> = {}
  for (const f of template.fields_schema) {
    if (f.type === 'checkbox') o[f.id] = false
    else o[f.id] = ''
  }
  return o
}

export function FormNewClient({
  template,
  draft,
  initialCaseLabel,
}: {
  template: FormTemplateRow
  draft: FormSubmissionRow | null
  initialCaseLabel: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [submissionId, setSubmissionId] = useState<string | null>(draft?.id ?? null)
  const [caseId, setCaseId] = useState<string | null>(draft?.case_id ?? null)
  const [caseLabel, setCaseLabel] = useState<string | null>(initialCaseLabel)

  const initialValues = useMemo(() => {
    const base = emptyValues(template)
    const data = draft?.form_data
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      for (const k of Object.keys(base)) {
        if (k in data) base[k] = (data as Record<string, unknown>)[k] as unknown
      }
      for (const k of Object.keys(data)) {
        if (!(k in base)) base[k] = (data as Record<string, unknown>)[k]
      }
    }
    return base
  }, [template, draft])

  const [values, setValues] = useState<Record<string, unknown>>(initialValues)

  const showCaseLink = (template.category ?? '').toLowerCase() === 'case'

  function setField(id: string, value: unknown) {
    setValues((prev) => ({ ...prev, [id]: value }))
  }

  function persist(mode: 'draft' | 'submit') {
    setError(null)
    startTransition(async () => {
      try {
        if (mode === 'draft') {
          const res = await saveFormDraftAction({
            submissionId,
            templateId: template.id,
            formData: values,
            caseId,
          })
          setSubmissionId(res.id)
          router.refresh()
        } else {
          const res = await submitFormAction({
            submissionId,
            templateId: template.id,
            formData: values,
            caseId,
          })
          setSubmissionId(res.id)
          router.push('/forms')
          router.refresh()
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Request failed')
      }
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link
          href="/forms"
          className="text-sm text-accent-teal hover:underline"
        >
          ← Forms library
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-text-primary">{template.name}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Complete all required fields. Use <strong>Save draft</strong> to return later, or{' '}
          <strong>Submit</strong> to file the form.
          {template.requires_approval
            ? ' This form is routed to supervision for approval after submission.'
            : ' This form is recorded as approved upon submission.'}
        </p>
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="rounded-lg border border-border-subtle bg-bg-surface p-6 shadow-sm">
        <header className="mb-6 border-b border-border-subtle pb-4">
          <p className="font-heading text-xs font-semibold uppercase tracking-widest text-accent-primary">
            CID PORTAL
          </p>
          <p className="mt-1 text-sm text-text-secondary">Internal use — official record</p>
        </header>

        {showCaseLink ? (
          <div className="mb-8 space-y-2">
            <Label>Linked case (optional)</Label>
            <CaseCombobox
              valueId={caseId}
              valueLabel={caseLabel}
              onSelect={(id, label) => {
                setCaseId(id)
                setCaseLabel(label)
              }}
              disabled={pending}
            />
            <p className="text-xs text-text-secondary">
              Search by case number. Only cases you are assigned to or created appear.
            </p>
          </div>
        ) : null}

        <FormFieldsEditor
          fields={template.fields_schema}
          values={values}
          onChange={setField}
          disabled={pending}
        />

        <div className="mt-8 flex flex-wrap gap-3 border-t border-border-subtle pt-6">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            className="border-border-subtle"
            onClick={() => void persist('draft')}
          >
            Save draft
          </Button>
          <Button
            type="button"
            disabled={pending}
            className="border border-accent-primary/30 bg-accent-primary text-bg-app"
            onClick={() => void persist('submit')}
          >
            Submit
          </Button>
        </div>
      </div>
    </div>
  )
}
