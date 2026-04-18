'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

type SubnavItem = {
  label: string
  href: string
}

const items: SubnavItem[] = [
  { label: 'Dashboard', href: '/training' },
  { label: 'DIT Files', href: '/training/dit-files' },
  { label: 'Quizzes', href: '/training/quizzes' },
  { label: 'Schedule', href: '/training/schedule' },
  { label: 'Resources', href: '/training/resources' },
  { label: 'Settings', href: '/training/settings' },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/training') return pathname === '/training'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function TrainingSubnav() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Training sections"
      className="-mx-4 mb-6 flex overflow-x-auto border-b border-border-subtle px-4 md:mx-0 md:px-0"
    >
      <ul className="flex min-w-full items-stretch gap-1 md:gap-2">
        {items.map((it) => {
          const active = isActive(pathname, it.href)
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex h-10 items-center whitespace-nowrap border-b-2 border-transparent px-3 text-sm font-medium transition-colors',
                  active
                    ? 'border-accent-primary text-text-primary'
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                {it.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
