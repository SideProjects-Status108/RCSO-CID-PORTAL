'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { FormFieldDefinition } from '@/types/forms'

function groupBySection(fields: FormFieldDefinition[]) {
  const map = new Map<string, FormFieldDefinition[]>()
  for (const f of fields) {
    const s = f.section?.trim() || 'General'
    if (!map.has(s)) map.set(s, [])
    map.get(s)!.push(f)
  }
  return [...map.entries()]
}

export function FormFieldsEditor({
  fields,
  values,
  onChange,
  disabled,
}: {
  fields: FormFieldDefinition[]
  values: Record<string, unknown>
  onChange: (id: string, value: unknown) => void
  disabled?: boolean
}) {
  const sections = groupBySection(fields)

  return (
    <div className="space-y-10">
      {sections.map(([sectionName, sectionFields]) => (
        <section key={sectionName} className="space-y-4">
          <div className="border-b border-border-subtle pb-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-accent-gold">
              {sectionName}
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {sectionFields.map((field) => (
              <FieldRow
                key={field.id}
                field={field}
                value={values[field.id]}
                onChange={onChange}
                disabled={disabled}
                className={field.type === 'textarea' ? 'sm:col-span-2' : ''}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function FieldRow({
  field,
  value,
  onChange,
  disabled,
  className,
}: {
  field: FormFieldDefinition
  value: unknown
  onChange: (id: string, value: unknown) => void
  disabled?: boolean
  className?: string
}) {
  const id = `field-${field.id}`
  const requiredStar = field.required ? (
    <span className="text-danger" aria-hidden>
      {' '}
      *
    </span>
  ) : null
  const reqText = field.required ? <span className="sr-only">(required)</span> : null

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className="text-text-primary">
        {field.label}
        {requiredStar}
        {reqText}
      </Label>

      {field.type === 'textarea' ? (
        <Textarea
          id={id}
          disabled={disabled}
          placeholder={field.placeholder || undefined}
          className="border-border-subtle bg-bg-surface font-serif text-sm leading-relaxed"
          rows={4}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(field.id, e.target.value)}
        />
      ) : null}

      {field.type === 'text' || field.type === 'number' ? (
        <Input
          id={id}
          disabled={disabled}
          type={field.type === 'number' ? 'number' : 'text'}
          placeholder={field.placeholder || undefined}
          className="border-border-subtle bg-bg-surface"
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) =>
            onChange(
              field.id,
              field.type === 'number'
                ? e.target.value === ''
                  ? ''
                  : Number(e.target.value)
                : e.target.value
            )
          }
        />
      ) : null}

      {field.type === 'date' ? (
        <Input
          id={id}
          type="date"
          disabled={disabled}
          className="border-border-subtle bg-bg-surface"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(field.id, e.target.value)}
        />
      ) : null}

      {field.type === 'select' ? (
        <Select
          value={typeof value === 'string' ? value : ''}
          disabled={disabled}
          onValueChange={(v) => {
            if (v == null) onChange(field.id, '')
            else onChange(field.id, v)
          }}
        >
          <SelectTrigger id={id} className="border-border-subtle bg-bg-surface">
            <SelectValue placeholder={field.placeholder || 'Select…'} />
          </SelectTrigger>
          <SelectContent className="border-border-subtle bg-bg-elevated">
            {field.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {field.type === 'checkbox' ? (
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id={id}
            disabled={disabled}
            checked={value === true}
            onCheckedChange={(c) => onChange(field.id, c === true)}
          />
          <span className="text-sm text-text-secondary">Yes</span>
        </div>
      ) : null}

      {field.type === 'signature' ? (
        <div className="rounded border-2 border-dashed border-border-subtle bg-bg-app px-3 py-2">
          <Input
            id={id}
            disabled={disabled}
            placeholder="Type your full legal name to sign"
            className="border-0 bg-transparent font-serif text-lg tracking-wide focus-visible:ring-0"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            autoComplete="off"
          />
        </div>
      ) : null}
    </div>
  )
}
