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

function formatValue(field: FormFieldDefinition, value: unknown): string {
  if (field.type === 'checkbox') return value === true ? 'Yes' : 'No'
  if (value === null || value === undefined) return '—'
  if (typeof value === 'number') return String(value)
  const s = String(value).trim()
  return s.length ? s : '—'
}

export function FormValuesReadonly({
  fields,
  values,
}: {
  fields: FormFieldDefinition[]
  values: Record<string, unknown>
}) {
  const sections = groupBySection(fields)

  return (
    <div className="space-y-8 text-sm">
      {sections.map(([sectionName, sectionFields]) => (
        <section key={sectionName} className="space-y-3">
          <h3 className="border-b border-border-subtle pb-1 text-xs font-semibold uppercase tracking-wide text-accent-gold">
            {sectionName}
          </h3>
          <dl className="grid gap-3 sm:grid-cols-2">
            {sectionFields.map((f) => (
              <div key={f.id} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <dt className="text-text-secondary">{f.label}</dt>
                <dd className="mt-0.5 whitespace-pre-wrap font-medium text-text-primary">
                  {formatValue(f, values[f.id])}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  )
}
