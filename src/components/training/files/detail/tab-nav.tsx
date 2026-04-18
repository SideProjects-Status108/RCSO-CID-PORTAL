import Link from 'next/link'

export const DIT_DETAIL_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'weekly', label: 'Weekly Evals' },
  { id: 'activity', label: 'Activity' },
  { id: 'cases', label: 'Cases & Call-Outs' },
  { id: 'notes', label: 'Notes' },
  { id: 'absences', label: 'Absences' },
] as const

export type DitDetailTabId = (typeof DIT_DETAIL_TABS)[number]['id']

export function parseTabParam(value: string | undefined): DitDetailTabId {
  const match = DIT_DETAIL_TABS.find((t) => t.id === value)
  return match ? match.id : 'overview'
}

export function DitDetailTabNav({
  recordId,
  active,
}: {
  recordId: string
  active: DitDetailTabId
}) {
  return (
    <nav
      role="tablist"
      aria-label="DIT file sections"
      className="flex flex-wrap gap-1 border-b border-border-subtle"
    >
      {DIT_DETAIL_TABS.map((tab) => {
        const isActive = tab.id === active
        const href =
          tab.id === 'overview'
            ? `/training/dit-files/${recordId}`
            : `/training/dit-files/${recordId}?tab=${tab.id}`
        return (
          <Link
            key={tab.id}
            href={href as never}
            role="tab"
            aria-selected={isActive}
            className={`relative -mb-px rounded-t-md px-3 py-2 text-sm font-medium transition ${
              isActive
                ? 'border border-border-subtle border-b-transparent bg-bg-surface text-text-primary'
                : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
