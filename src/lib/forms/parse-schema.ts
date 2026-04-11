import * as z from 'zod'

import type { FormFieldDefinition, FormFieldType } from '@/types/forms'

const fieldTypes: z.ZodType<FormFieldType> = z.enum([
  'text',
  'textarea',
  'date',
  'select',
  'checkbox',
  'signature',
  'number',
])

const fieldDefSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    type: fieldTypes,
    required: z.boolean(),
    options: z.array(z.string()).optional().default([]),
    placeholder: z.string().optional().nullable(),
    section: z.string().optional().nullable(),
  })
  .transform(
    (o): FormFieldDefinition => ({
      ...o,
      options: o.options ?? [],
      placeholder: o.placeholder ?? '',
      section: o.section ?? '',
    })
  )

export function parseFieldsSchema(raw: unknown): FormFieldDefinition[] {
  const arr = z.array(z.unknown()).safeParse(raw)
  if (!arr.success) return []
  const out: FormFieldDefinition[] = []
  for (const item of arr.data) {
    const r = fieldDefSchema.safeParse(item)
    if (r.success) out.push(r.data)
  }
  return out
}
